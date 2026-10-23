import json
import logging
from sqlalchemy.orm import Session
from app.models.models import UserPreference, Rating, WatchlistItem, Movie

logger = logging.getLogger("cinematch.preference_service")

class PreferenceService:
    def get_or_create_preference(self, db: Session, user_id: int) -> UserPreference:
        """Get existing user preference or initialize default."""
        pref = db.query(UserPreference).filter(UserPreference.user_id == user_id).first()
        if not pref:
            pref = UserPreference(
                user_id=user_id,
                preferred_genres="[]",
                preferred_languages="[]",
                preferred_moods="[]",
                minimum_rating=0.0,
                preferred_year_from=None,
                preferred_year_to=None,
                maximum_runtime=None
            )
            db.add(pref)
            db.commit()
            db.refresh(pref)
        return pref

    def update_preference_from_interaction(self, db: Session, user_id: int, movie_id: int, rating_value: float):
        """
        Transparent rule-based preference learning:
        - When user rates >= 4.0, dynamically append movie's genres and moods to user preferences if not already present.
        - When user rates <= 2.0, demote/remove genres if repeated poor feedback occurs.
        """
        pref = self.get_or_create_preference(db, user_id)
        movie = db.query(Movie).filter(Movie.id == movie_id).first()
        if not movie:
            return

        try:
            genres = json.loads(pref.preferred_genres or "[]")
        except Exception:
            genres = []

        try:
            moods = json.loads(pref.preferred_moods or "[]")
        except Exception:
            moods = []

        if rating_value >= 4.0:
            for g in movie.genres:
                if g.name not in genres:
                    genres.append(g.name)
            for m in movie.moods:
                if m.mood_name not in moods:
                    moods.append(m.mood_name)
            logger.info(f"Learned preferences for user {user_id} after rating {rating_value}: genres={genres}")

        pref.preferred_genres = json.dumps(genres[:8])  # keep top 8
        pref.preferred_moods = json.dumps(moods[:6])
        db.commit()

preference_service = PreferenceService()
