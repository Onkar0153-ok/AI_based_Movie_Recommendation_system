from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.models import Rating, Movie, User
from app.schemas.schemas import RatingCreate, RatingUpdate, RatingResponse
from app.core.dependencies import get_current_user
from app.services.preference_service import preference_service

router = APIRouter(prefix="/ratings", tags=["Ratings"])

@router.get("/me", response_model=List[RatingResponse])
def get_my_ratings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve all ratings submitted by the current user."""
    ratings = db.query(Rating).filter(Rating.user_id == current_user.id).order_by(Rating.created_at.desc()).all()
    results = []
    for r in ratings:
        resp = RatingResponse.model_validate(r)
        if r.movie:
            resp.movie_title = r.movie.title
            resp.movie_poster_url = r.movie.poster_url
        results.append(resp)
    return results

@router.post("", response_model=RatingResponse, status_code=status.HTTP_201_CREATED)
def create_or_update_rating(
    rating_in: RatingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Rate a movie on 1.0 - 5.0 scale. Idempotently updates if already rated."""
    movie = db.query(Movie).filter(Movie.id == rating_in.movie_id).first()
    if not movie:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Movie not found.")

    rating = db.query(Rating).filter(
        Rating.user_id == current_user.id,
        Rating.movie_id == rating_in.movie_id
    ).first()

    if rating:
        rating.rating_value = rating_in.rating_value
        rating.optional_review = rating_in.optional_review
    else:
        rating = Rating(
            user_id=current_user.id,
            movie_id=rating_in.movie_id,
            rating_value=rating_in.rating_value,
            optional_review=rating_in.optional_review
        )
        db.add(rating)

    db.commit()
    db.refresh(rating)

    # Dynamic preference learning
    preference_service.update_preference_from_interaction(
        db=db,
        user_id=current_user.id,
        movie_id=movie.id,
        rating_value=rating.rating_value
    )

    resp = RatingResponse.model_validate(rating)
    resp.movie_title = movie.title
    resp.movie_poster_url = movie.poster_url
    return resp

@router.put("/{rating_id}", response_model=RatingResponse)
def update_rating(
    rating_id: int,
    rating_in: RatingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update existing rating."""
    rating = db.query(Rating).filter(Rating.id == rating_id, Rating.user_id == current_user.id).first()
    if not rating:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rating not found.")

    rating.rating_value = rating_in.rating_value
    rating.optional_review = rating_in.optional_review
    db.commit()
    db.refresh(rating)

    preference_service.update_preference_from_interaction(
        db=db,
        user_id=current_user.id,
        movie_id=rating.movie_id,
        rating_value=rating.rating_value
    )

    resp = RatingResponse.model_validate(rating)
    if rating.movie:
        resp.movie_title = rating.movie.title
        resp.movie_poster_url = rating.movie.poster_url
    return resp

@router.delete("/{rating_id}")
def delete_rating(
    rating_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a user's rating."""
    rating = db.query(Rating).filter(Rating.id == rating_id, Rating.user_id == current_user.id).first()
    if not rating:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rating not found.")

    db.delete(rating)
    db.commit()
    return {"message": "Rating removed successfully."}
