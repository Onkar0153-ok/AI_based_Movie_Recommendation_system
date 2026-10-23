from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.models import WatchHistory, Movie, User
from app.schemas.schemas import WatchHistoryResponse
from app.core.dependencies import get_current_user
from app.routers.movies import enrich_movie_response

router = APIRouter(prefix="/history", tags=["Watch History"])

@router.get("", response_model=List[WatchHistoryResponse])
def get_watch_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve user's viewing history."""
    items = db.query(WatchHistory).filter(WatchHistory.user_id == current_user.id).order_by(WatchHistory.watched_at.desc()).all()
    results = []
    for item in items:
        h_resp = WatchHistoryResponse.model_validate(item)
        if item.movie:
            h_resp.movie = enrich_movie_response(item.movie, db, current_user)
        results.append(h_resp)
    return results

@router.post("/{movie_id}", response_model=WatchHistoryResponse, status_code=status.HTTP_201_CREATED)
def record_watched(
    movie_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Record a movie viewing event."""
    movie = db.query(Movie).filter(Movie.id == movie_id).first()
    if not movie:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Movie not found.")

    entry = WatchHistory(user_id=current_user.id, movie_id=movie_id)
    db.add(entry)
    db.commit()
    db.refresh(entry)

    h_resp = WatchHistoryResponse.model_validate(entry)
    h_resp.movie = enrich_movie_response(movie, db, current_user)
    return h_resp
