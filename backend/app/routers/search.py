from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.schemas.schemas import SearchResponse, AutocompleteSuggestion, MovieResponse
from app.services.search_service import search_service
from app.routers.movies import enrich_movie_response
from app.core.dependencies import get_optional_current_user
from app.models.models import User

router = APIRouter(prefix="/search", tags=["Search"])

@router.get("", response_model=SearchResponse)
def search_movies(
    q: Optional[str] = Query(None, description="Natural language search or text query"),
    genre: Optional[str] = None,
    mood: Optional[str] = None,
    language: Optional[str] = None,
    year_from: Optional[int] = None,
    year_to: Optional[int] = None,
    min_rating: Optional[float] = None,
    max_runtime: Optional[int] = None,
    sort_by: str = Query("popularity", pattern="^(popularity|rating|release_date|title)$"),
    sort_order: str = Query("desc", pattern="^(desc|asc)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """
    Search movies with deterministic natural language parser and filter combination.
    Example queries:
    - 'Thriller movies released after 2020'
    - 'Highly rated Hindi comedy movies'
    - 'Mind-bending movies under 140 minutes'
    """
    res = search_service.search_movies(
        db=db,
        query=q,
        genre=genre,
        mood=mood,
        language=language,
        year_from=year_from,
        year_to=year_to,
        min_rating=min_rating,
        max_runtime=max_runtime,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        page_size=page_size
    )

    enriched_items = [enrich_movie_response(m, db, current_user) for m in res["items"]]
    return SearchResponse(
        items=enriched_items,
        total=res["total"],
        parsed_filters=res["parsed_filters"],
        raw_query=res["raw_query"]
    )

@router.get("/suggestions", response_model=list[AutocompleteSuggestion])
def get_search_suggestions(
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db)
):
    """Quick autocomplete dropdown items for global search bar."""
    return search_service.get_autocomplete_suggestions(db, q)
