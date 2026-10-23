from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.models import WatchlistItem, Movie, User
from app.schemas.schemas import WatchlistResponse, MovieResponse
from app.core.dependencies import get_current_user
from app.routers.movies import enrich_movie_response

router = APIRouter(prefix="/watchlist", tags=["Watchlist"])

@router.get("", response_model=List[WatchlistResponse])
def get_watchlist(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve saved movies in current user's watchlist."""
    items = db.query(WatchlistItem).filter(WatchlistItem.user_id == current_user.id).order_by(WatchlistItem.created_at.desc()).all()
    results = []
    for item in items:
        wl_resp = WatchlistResponse.model_validate(item)
        if item.movie:
            wl_resp.movie = enrich_movie_response(item.movie, db, current_user)
        results.append(wl_resp)
    return results

@router.post("/{movie_id}", response_model=WatchlistResponse, status_code=status.HTTP_201_CREATED)
def add_to_watchlist(
    movie_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a movie to watchlist (idempotent: does not duplicate)."""
    movie = db.query(Movie).filter(Movie.id == movie_id).first()
    if not movie:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Movie not found.")

    existing = db.query(WatchlistItem).filter(
        WatchlistItem.user_id == current_user.id,
        WatchlistItem.movie_id == movie_id
    ).first()

    if existing:
        wl_resp = WatchlistResponse.model_validate(existing)
        wl_resp.movie = enrich_movie_response(movie, db, current_user)
        return wl_resp

    new_item = WatchlistItem(user_id=current_user.id, movie_id=movie_id)
    db.add(new_item)
    db.commit()
    db.refresh(new_item)

    wl_resp = WatchlistResponse.model_validate(new_item)
    wl_resp.movie = enrich_movie_response(movie, db, current_user)
    return wl_resp

@router.delete("/{movie_id}")
def remove_from_watchlist(
    movie_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove a movie from current user's watchlist."""
    item = db.query(WatchlistItem).filter(
        WatchlistItem.user_id == current_user.id,
        WatchlistItem.movie_id == movie_id
    ).first()

    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Movie not in watchlist.")

    db.delete(item)
    db.commit()
    return {"message": "Movie removed from watchlist."}
