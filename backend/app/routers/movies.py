import re
import os
import uuid
from pathlib import Path
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.database import get_db
from app.models.models import Movie, Genre, MovieGenre, MovieMood, MovieKeyword, Rating, WatchlistItem, User, AdminActivity
from app.schemas.schemas import MovieResponse, MovieCreate, MovieUpdate, PaginatedMoviesResponse
from app.core.dependencies import get_current_admin, get_optional_current_user
from app.core.config import settings
from app.services.content_similarity import content_similarity_service

router = APIRouter(prefix="/movies", tags=["Movies"])

def slugify(title: str, year: Optional[str] = None) -> str:
    """Generate a clean URL-friendly slug."""
    base = re.sub(r"[^\w\s-]", "", title.lower())
    clean = re.sub(r"[-\s]+", "-", base).strip("-")
    if year:
        return f"{clean}-{year[:4]}"
    return clean

def enrich_movie_response(movie: Movie, db: Session, current_user: Optional[User] = None) -> MovieResponse:
    """Attach dynamic computed fields: average user rating, count, watchlist status, user's rating."""
    avg_rating_res = db.query(func.avg(Rating.rating_value), func.count(Rating.id)).filter(Rating.movie_id == movie.id).first()
    avg_user_rating = round(float(avg_rating_res[0]), 1) if avg_rating_res and avg_rating_res[0] else None
    user_ratings_count = avg_rating_res[1] if avg_rating_res else 0

    is_in_watchlist = False
    current_user_rating = None
    if current_user:
        wl_entry = db.query(WatchlistItem).filter(WatchlistItem.user_id == current_user.id, WatchlistItem.movie_id == movie.id).first()
        is_in_watchlist = bool(wl_entry)
        u_rating = db.query(Rating).filter(Rating.user_id == current_user.id, Rating.movie_id == movie.id).first()
        if u_rating:
            current_user_rating = u_rating.rating_value

    m_resp = MovieResponse.model_validate(movie)
    m_resp.average_user_rating = avg_user_rating
    m_resp.user_ratings_count = user_ratings_count
    m_resp.is_in_watchlist = is_in_watchlist
    m_resp.current_user_rating = current_user_rating
    return m_resp

@router.get("", response_model=PaginatedMoviesResponse)
def get_movies(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    genre: Optional[str] = None,
    mood: Optional[str] = None,
    language: Optional[str] = None,
    min_rating: Optional[float] = None,
    sort_by: str = Query("popularity", pattern="^(popularity|rating|release_date|title)$"),
    sort_order: str = Query("desc", pattern="^(desc|asc)$"),
    status: Optional[str] = "published",
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """Retrieve catalog of movies with filtering, sorting and pagination."""
    query = db.query(Movie)
    if status and status != "all":
        query = query.filter(Movie.status == status)

    if genre and genre != "All":
        query = query.filter(Movie.genres.any(Genre.name.ilike(f"%{genre}%")))

    if mood and mood != "All":
        query = query.filter(Movie.moods.any(MovieMood.mood_name.ilike(f"%{mood}%")))

    if language and language != "All":
        query = query.filter(Movie.language.ilike(language))

    if min_rating and min_rating > 0:
        query = query.filter(Movie.external_rating >= min_rating)

    # Sort
    from sqlalchemy import desc, asc
    order_col = {
        "rating": Movie.external_rating,
        "release_date": Movie.release_date,
        "title": Movie.title,
        "popularity": Movie.popularity_score
    }.get(sort_by, Movie.popularity_score)

    query = query.order_by(desc(order_col) if sort_order == "desc" else asc(order_col))

    total = query.count()
    offset = (page - 1) * page_size
    movies = query.offset(offset).limit(page_size).all()

    enriched_items = [enrich_movie_response(m, db, current_user) for m in movies]
    total_pages = max(1, (total + page_size - 1) // page_size)

    return PaginatedMoviesResponse(
        items=enriched_items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )

@router.get("/{movie_id}", response_model=MovieResponse)
def get_movie_detail(
    movie_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """Retrieve a single movie with full relational metadata."""
    movie = db.query(Movie).filter(Movie.id == movie_id).first()
    if not movie:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Movie not found.")
    return enrich_movie_response(movie, db, current_user)

@router.post("", response_model=MovieResponse, status_code=status.HTTP_201_CREATED)
def create_movie(
    movie_in: MovieCreate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin)
):
    """Add a new movie (Admin only)."""
    # Create unique slug
    base_slug = slugify(movie_in.title, movie_in.release_date)
    slug = base_slug
    counter = 1
    while db.query(Movie).filter(Movie.slug == slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1

    movie = Movie(
        title=movie_in.title.strip(),
        slug=slug,
        description=movie_in.description,
        release_date=movie_in.release_date,
        runtime_minutes=movie_in.runtime_minutes,
        language=movie_in.language or "English",
        director=movie_in.director,
        cast=movie_in.cast,
        poster_url=movie_in.poster_url,
        trailer_url=movie_in.trailer_url,
        content_rating=movie_in.content_rating or "PG-13",
        external_rating=movie_in.external_rating or 7.0,
        popularity_score=movie_in.popularity_score or 50.0,
        status=movie_in.status or "published",
    )
    db.add(movie)
    db.flush()

    # Genres
    for g_name in movie_in.genres:
        g_name_clean = g_name.strip()
        if not g_name_clean: continue
        genre_obj = db.query(Genre).filter(func.lower(Genre.name) == g_name_clean.lower()).first()
        if not genre_obj:
            genre_obj = Genre(name=g_name_clean)
            db.add(genre_obj)
            db.flush()
        db.add(MovieGenre(movie_id=movie.id, genre_id=genre_obj.id))

    # Moods
    for m_name in movie_in.moods:
        m_clean = m_name.strip()
        if m_clean:
            db.add(MovieMood(movie_id=movie.id, mood_name=m_clean))

    # Keywords
    for kw in movie_in.keywords:
        kw_clean = kw.strip()
        if kw_clean:
            db.add(MovieKeyword(movie_id=movie.id, keyword=kw_clean))

    # Log admin activity
    activity = AdminActivity(
        admin_id=admin_user.id,
        action="CREATE_MOVIE",
        movie_id=movie.id,
        details=f"Created movie '{movie.title}' (Status: {movie.status})"
    )
    db.add(activity)

    db.commit()
    db.refresh(movie)

    # Invalidate similarity matrix
    content_similarity_service.invalidate_cache()

    return enrich_movie_response(movie, db, admin_user)

@router.put("/{movie_id}", response_model=MovieResponse)
def update_movie(
    movie_id: int,
    movie_update: MovieUpdate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin)
):
    """Update movie metadata (Admin only)."""
    movie = db.query(Movie).filter(Movie.id == movie_id).first()
    if not movie:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Movie not found.")

    update_data = movie_update.model_dump(exclude_unset=True)

    # Handle relational fields
    if "genres" in update_data:
        genres_list = update_data.pop("genres") or []
        db.query(MovieGenre).filter(MovieGenre.movie_id == movie.id).delete()
        for g_name in genres_list:
            g_clean = g_name.strip()
            if not g_clean: continue
            genre_obj = db.query(Genre).filter(func.lower(Genre.name) == g_clean.lower()).first()
            if not genre_obj:
                genre_obj = Genre(name=g_clean)
                db.add(genre_obj)
                db.flush()
            db.add(MovieGenre(movie_id=movie.id, genre_id=genre_obj.id))

    if "moods" in update_data:
        moods_list = update_data.pop("moods") or []
        db.query(MovieMood).filter(MovieMood.movie_id == movie.id).delete()
        for m_name in moods_list:
            m_clean = m_name.strip()
            if m_clean:
                db.add(MovieMood(movie_id=movie.id, mood_name=m_clean))

    if "keywords" in update_data:
        keywords_list = update_data.pop("keywords") or []
        db.query(MovieKeyword).filter(MovieKeyword.movie_id == movie.id).delete()
        for kw in keywords_list:
            kw_clean = kw.strip()
            if kw_clean:
                db.add(MovieKeyword(movie_id=movie.id, keyword=kw_clean))

    for key, val in update_data.items():
        setattr(movie, key, val)

    # Log activity
    db.add(AdminActivity(
        admin_id=admin_user.id,
        action="UPDATE_MOVIE",
        movie_id=movie.id,
        details=f"Updated movie '{movie.title}'"
    ))

    db.commit()
    db.refresh(movie)
    content_similarity_service.invalidate_cache()

    return enrich_movie_response(movie, db, admin_user)

@router.delete("/{movie_id}")
def delete_movie(
    movie_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin)
):
    """Delete a movie from database (Admin only)."""
    movie = db.query(Movie).filter(Movie.id == movie_id).first()
    if not movie:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Movie not found.")

    title = movie.title
    db.add(AdminActivity(
        admin_id=admin_user.id,
        action="DELETE_MOVIE",
        movie_id=movie_id,
        details=f"Deleted movie '{title}' (ID: {movie_id})"
    ))
    db.delete(movie)
    db.commit()
    content_similarity_service.invalidate_cache()

    return {"message": f"Movie '{title}' successfully deleted."}

@router.post("/upload-poster")
async def upload_poster(
    file: UploadFile = File(...),
    admin_user: User = Depends(get_current_admin)
):
    """Secure local poster upload (Admin only)."""
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/jpg"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image format. Allowed formats: JPEG, PNG, WEBP."
        )

    ext = Path(file.filename).suffix.lower() or ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    target_dir = Path(settings.UPLOADS_DIR)
    target_dir.mkdir(parents=True, exist_ok=True)
    destination = target_dir / filename

    content = await file.read()
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Image file exceeds maximum limit of {settings.MAX_UPLOAD_SIZE_MB}MB."
        )

    with open(destination, "wb") as f:
        f.write(content)

    return {
        "url": f"/uploads/posters/{filename}",
        "filename": filename
    }
