import csv
import io
import re
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from app.db.database import get_db
from app.models.models import Movie, User, AdminActivity, Genre, MovieGenre, MovieMood, MovieKeyword
from app.schemas.schemas import (
    AdminDashboardStats, AdminActivityResponse, UserResponse
)
from app.core.dependencies import get_current_admin
from app.services.analytics_service import analytics_service
from app.services.content_similarity import content_similarity_service
from app.routers.movies import slugify

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.get("/dashboard", response_model=AdminDashboardStats)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin)
):
    """Retrieve live aggregated statistics for the admin dashboard."""
    stats = analytics_service.get_admin_dashboard_stats(db)
    return stats

@router.get("/analytics/metrics")
def get_evaluation_metrics(
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin)
):
    """Retrieve recommendation system evaluation metrics."""
    return analytics_service.get_recommendation_evaluation_metrics(db)

@router.get("/users", response_model=List[UserResponse])
def get_users(
    q: Optional[str] = None,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin)
):
    """List registered users with optional search."""
    query = db.query(User)
    if q and q.strip():
        term = f"%{q.strip()}%"
        query = query.filter(or_(User.name.ilike(term), User.email.ilike(term)))
    return query.order_by(User.created_at.desc()).all()

@router.patch("/users/{user_id}/status", response_model=UserResponse)
def toggle_user_status(
    user_id: int,
    is_active: bool,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin)
):
    """Activate or deactivate user. Safeguards preventing deactivation of the last admin."""
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    if not is_active and target_user.role == "admin":
        active_admins_count = db.query(User).filter(User.role == "admin", User.is_active == True).count()
        if active_admins_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Security protection: Cannot deactivate the last remaining administrator account."
            )

    target_user.is_active = is_active
    db.add(AdminActivity(
        admin_id=admin_user.id,
        action="TOGGLE_USER_STATUS",
        details=f"Changed user {target_user.email} active status to {is_active}"
    ))
    db.commit()
    db.refresh(target_user)
    return target_user

@router.post("/movies/import")
async def import_movies_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin)
):
    """
    Bulk import movies from CSV file.
    Expected CSV columns:
    title, description, release_date, runtime_minutes, language, director, cast, genres, moods, keywords, external_rating, poster_url, trailer_url
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File must be a CSV file.")

    content = await file.read()
    try:
        text_stream = io.StringIO(content.decode("utf-8-sig"))
    except UnicodeDecodeError:
        text_stream = io.StringIO(content.decode("latin-1"))

    reader = csv.DictReader(text_stream)
    if not reader.fieldnames or "title" not in [f.lower().strip() for f in reader.fieldnames]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid CSV format. Missing required 'title' column."
        )

    # Normalize header mapping
    header_map = {col.lower().strip(): col for col in reader.fieldnames}

    created_count = 0
    errors = []

    for idx, row in enumerate(reader, start=2):
        try:
            title = row.get(header_map.get("title", ""), "").strip()
            if not title:
                continue

            release_date = row.get(header_map.get("release_date", ""), "").strip() or None
            description = row.get(header_map.get("description", ""), "").strip() or None
            
            runtime_val = None
            raw_runtime = row.get(header_map.get("runtime_minutes", ""), "").strip()
            if raw_runtime:
                try: runtime_val = int(raw_runtime)
                except ValueError: pass

            rating_val = 7.0
            raw_rating = row.get(header_map.get("external_rating", ""), "").strip()
            if raw_rating:
                try: rating_val = float(raw_rating)
                except ValueError: pass

            language = row.get(header_map.get("language", ""), "English").strip() or "English"
            director = row.get(header_map.get("director", ""), "").strip() or None
            cast = row.get(header_map.get("cast", ""), "").strip() or None
            poster_url = row.get(header_map.get("poster_url", ""), "").strip() or None
            trailer_url = row.get(header_map.get("trailer_url", ""), "").strip() or None

            # Generate unique slug
            base_slug = slugify(title, release_date)
            slug = base_slug
            counter = 1
            while db.query(Movie).filter(Movie.slug == slug).first():
                slug = f"{base_slug}-{counter}"
                counter += 1

            movie = Movie(
                title=title,
                slug=slug,
                description=description,
                release_date=release_date,
                runtime_minutes=runtime_val,
                language=language,
                director=director,
                cast=cast,
                poster_url=poster_url,
                trailer_url=trailer_url,
                content_rating="PG-13",
                external_rating=rating_val,
                popularity_score=50.0,
                status="published"
            )
            db.add(movie)
            db.flush()

            # Genres (comma or pipe separated)
            raw_genres = row.get(header_map.get("genres", ""), "")
            if raw_genres:
                g_list = [g.strip() for g in re.split(r"[,|]", raw_genres) if g.strip()]
                for g_name in g_list:
                    genre_obj = db.query(Genre).filter(func.lower(Genre.name) == g_name.lower()).first()
                    if not genre_obj:
                        genre_obj = Genre(name=g_name)
                        db.add(genre_obj)
                        db.flush()
                    db.add(MovieGenre(movie_id=movie.id, genre_id=genre_obj.id))

            # Moods
            raw_moods = row.get(header_map.get("moods", ""), "")
            if raw_moods:
                m_list = [m.strip() for m in re.split(r"[,|]", raw_moods) if m.strip()]
                for m_name in m_list:
                    db.add(MovieMood(movie_id=movie.id, mood_name=m_name))

            # Keywords
            raw_kw = row.get(header_map.get("keywords", ""), "")
            if raw_kw:
                kw_list = [k.strip() for k in re.split(r"[,|]", raw_kw) if k.strip()]
                for kw in kw_list:
                    db.add(MovieKeyword(movie_id=movie.id, keyword=kw))

            created_count += 1
        except Exception as e:
            errors.append(f"Row {idx}: {str(e)}")

    if created_count > 0:
        db.add(AdminActivity(
            admin_id=admin_user.id,
            action="CSV_IMPORT",
            details=f"Imported {created_count} movies via CSV"
        ))
        db.commit()
        content_similarity_service.invalidate_cache()

    return {
        "imported_count": created_count,
        "errors": errors[:10],
        "message": f"Successfully imported {created_count} movies."
    }

@router.get("/activity", response_model=List[AdminActivityResponse])
def get_admin_activity(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin)
):
    """Retrieve recent admin audit activity log."""
    activities = db.query(AdminActivity).order_by(AdminActivity.created_at.desc()).limit(limit).all()
    results = []
    for a in activities:
        resp = AdminActivityResponse.model_validate(a)
        if a.admin:
            resp.admin_name = a.admin.name
        results.append(resp)
    return results
