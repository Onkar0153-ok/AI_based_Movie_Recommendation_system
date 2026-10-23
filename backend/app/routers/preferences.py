import json
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.models import User, UserPreference
from app.schemas.schemas import UserPreferenceUpdate, UserPreferenceResponse
from app.core.dependencies import get_current_user
from app.services.preference_service import preference_service

router = APIRouter(prefix="/preferences", tags=["Preferences"])

def format_pref_response(pref: UserPreference) -> UserPreferenceResponse:
    try:
        genres = json.loads(pref.preferred_genres or "[]")
    except Exception:
        genres = []
    try:
        languages = json.loads(pref.preferred_languages or "[]")
    except Exception:
        languages = []
    try:
        moods = json.loads(pref.preferred_moods or "[]")
    except Exception:
        moods = []

    return UserPreferenceResponse(
        user_id=pref.user_id,
        preferred_genres=genres,
        preferred_languages=languages,
        preferred_moods=moods,
        minimum_rating=pref.minimum_rating or 0.0,
        preferred_year_from=pref.preferred_year_from,
        preferred_year_to=pref.preferred_year_to,
        maximum_runtime=pref.maximum_runtime
    )

@router.get("", response_model=UserPreferenceResponse)
def get_preferences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve current user's discovery preferences."""
    pref = preference_service.get_or_create_preference(db, current_user.id)
    return format_pref_response(pref)

@router.put("", response_model=UserPreferenceResponse)
def update_preferences(
    pref_in: UserPreferenceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update discovery preferences (genres, moods, rating floor, eras, runtime)."""
    pref = preference_service.get_or_create_preference(db, current_user.id)
    pref.preferred_genres = json.dumps(pref_in.preferred_genres)
    pref.preferred_languages = json.dumps(pref_in.preferred_languages)
    pref.preferred_moods = json.dumps(pref_in.preferred_moods)
    pref.minimum_rating = pref_in.minimum_rating
    pref.preferred_year_from = pref_in.preferred_year_from
    pref.preferred_year_to = pref_in.preferred_year_to
    pref.maximum_runtime = pref_in.maximum_runtime

    db.commit()
    db.refresh(pref)
    return format_pref_response(pref)
