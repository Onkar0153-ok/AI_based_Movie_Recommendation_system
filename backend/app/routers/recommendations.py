from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.database import get_db
from app.models.models import Movie, Genre, MovieMood, User, RecommendationFeedback, MovieGenre
from app.schemas.schemas import (
    RecommendationsResponse, RecommendationItem, RecommendationReason,
    RecommendationFeedbackCreate, RecommendationFeedbackResponse,
    MovieResponse, GenreSchema
)
from app.core.dependencies import get_current_user, get_optional_current_user
from app.services.recommendation_engine import recommendation_engine
from app.services.content_similarity import content_similarity_service
from app.routers.movies import enrich_movie_response

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])

@router.get("/for-you", response_model=RecommendationsResponse)
def get_for_you_recommendations(
    limit: int = Query(15, ge=1, le=50),
    exclude_watched: bool = Query(True),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """
    Get personalized recommendations with explainable scores (0-100).
    If unauthenticated, returns cold-start high-quality curated list.
    """
    if current_user:
        result = recommendation_engine.get_personalized_recommendations(
            db=db,
            user_id=current_user.id,
            limit=limit,
            exclude_watched=exclude_watched
        )
    else:
        result = recommendation_engine.get_cold_start_recommendations(
            db=db,
            limit=limit
        )

    # Format into response
    items = []
    for item in result["recommendations"]:
        m_enriched = enrich_movie_response(item["movie"], db, current_user)
        reasons_list = [
            RecommendationReason(
                criterion=r["criterion"],
                score_contribution=r["score_contribution"],
                description=r["description"]
            )
            for r in item["reasons"]
        ]
        items.append(RecommendationItem(
            movie=m_enriched,
            match_score=item["match_score"],
            reasons=reasons_list,
            summary_explanation=item["summary_explanation"]
        ))

    return RecommendationsResponse(
        recommendations=items,
        total=len(items),
        strategy=result["strategy"]
    )

@router.get("/similar/{movie_id}", response_model=List[RecommendationItem])
def get_similar_movies(
    movie_id: int,
    limit: int = Query(8, ge=1, le=20),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """
    Find content-similar movies using TF-IDF and Cosine Similarity.
    """
    movie = db.query(Movie).filter(Movie.id == movie_id).first()
    if not movie:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Movie not found.")

    sim_pairs = content_similarity_service.get_similar_movies(movie_id, top_n=limit, db=db)
    results = []

    for sim_id, sim_score in sim_pairs:
        other_movie = db.query(Movie).filter(Movie.id == sim_id).first()
        if not other_movie:
            continue
        
        # Normalized similarity match score out of 100
        match_score = round(min(sim_score * 100.0, 99.0), 1)
        common_genres = [g.name for g in other_movie.genres if g in movie.genres]
        genre_note = f"Shares {', '.join(common_genres)}." if common_genres else ""

        reasons = [
            RecommendationReason(
                criterion="content_similarity",
                score_contribution=round(match_score * 0.6, 1),
                description=f"Similar plot keywords, theme, and tone to '{movie.title}'. {genre_note}"
            )
        ]
        if other_movie.director and other_movie.director == movie.director:
            reasons.append(RecommendationReason(
                criterion="same_director",
                score_contribution=round(match_score * 0.4, 1),
                description=f"Also directed by {movie.director}"
            ))

        results.append(RecommendationItem(
            movie=enrich_movie_response(other_movie, db, current_user),
            match_score=match_score,
            reasons=reasons,
            summary_explanation=f"Content match based on plot themes and stylistic similarity to '{movie.title}'."
        ))

    return results

@router.post("/feedback", response_model=RecommendationFeedbackResponse)
def submit_feedback(
    fb_in: RecommendationFeedbackCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Submit recommendation feedback: 'useful', 'not_interested', or 'already_watched'.
    Influences future recommendation rankings.
    """
    movie = db.query(Movie).filter(Movie.id == fb_in.movie_id).first()
    if not movie:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Movie not found.")

    # Upsert feedback
    fb = db.query(RecommendationFeedback).filter(
        RecommendationFeedback.user_id == current_user.id,
        RecommendationFeedback.movie_id == fb_in.movie_id
    ).first()

    if fb:
        fb.feedback_type = fb_in.feedback_type
    else:
        fb = RecommendationFeedback(
            user_id=current_user.id,
            movie_id=fb_in.movie_id,
            feedback_type=fb_in.feedback_type
        )
        db.add(fb)

    db.commit()
    db.refresh(fb)
    return fb

@router.get("/genres", response_model=List[GenreSchema])
def get_genres(db: Session = Depends(get_db)):
    """List all available genres."""
    return db.query(Genre).order_by(Genre.name).all()

@router.get("/moods")
def get_moods(db: Session = Depends(get_db)):
    """List all distinct moods with movie counts."""
    moods_counts = (
        db.query(MovieMood.mood_name, func.count(MovieMood.movie_id))
        .join(Movie, MovieMood.movie_id == Movie.id)
        .filter(Movie.status == "published")
        .group_by(MovieMood.mood_name)
        .order_by(func.count(MovieMood.movie_id).desc())
        .all()
    )
    return [{"mood": m[0], "count": m[1]} for m in moods_counts]
