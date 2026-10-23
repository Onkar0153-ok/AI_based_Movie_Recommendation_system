import json
import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.models import Movie, User, UserPreference, Rating, WatchlistItem, RecommendationFeedback
from app.services.content_similarity import content_similarity_service

logger = logging.getLogger("cinematch.recommendation_engine")

class RecommendationEngine:
    def __init__(self):
        # Configurable weights in one location
        self.w_genre = settings.WEIGHT_GENRE          # Max 30.0
        self.w_mood = settings.WEIGHT_MOOD            # Max 20.0
        self.w_rating = settings.WEIGHT_RATING        # Max 15.0
        self.w_year = settings.WEIGHT_YEAR            # Max 10.0
        self.w_runtime = settings.WEIGHT_RUNTIME      # Max 10.0
        self.w_similarity = settings.WEIGHT_SIMILARITY # Max 15.0

    def parse_json_list(self, raw_val: Optional[str]) -> List[str]:
        if not raw_val:
            return []
        try:
            parsed = json.loads(raw_val)
            if isinstance(parsed, list):
                return [str(x).strip() for x in parsed if x]
            return []
        except Exception:
            # Fallback to comma separated
            return [x.strip() for x in raw_val.split(",") if x.strip()]

    def compute_movie_score(
        self,
        movie: Movie,
        pref_genres: List[str],
        pref_moods: List[str],
        pref_languages: List[str],
        min_rating: float,
        year_from: Optional[int],
        year_to: Optional[int],
        max_runtime: Optional[int],
        liked_movie_ids: List[int],
        similarity_service: Any,
        db: Session
    ) -> Dict[str, Any]:
        """
        Evaluate a single movie against user preferences and interactions.
        Returns score (0-100) and explicit list of matched reasons.
        """
        reasons = []
        total_score = 0.0

        movie_genres = [g.name.lower() for g in movie.genres]
        movie_moods = [m.mood_name.lower() for m in movie.moods]
        movie_keywords = [k.keyword.lower() for k in movie.keywords]
        
        # 1. Preferred Genre Match (Max 30)
        if pref_genres:
            matched_genres = [g for g in pref_genres if g.lower() in movie_genres]
            if matched_genres:
                ratio = len(matched_genres) / max(len(pref_genres), 1)
                # Boost with minimum reward per matched genre
                genre_pts = min(self.w_genre, round(min(ratio * 1.5, 1.0) * self.w_genre, 1))
                total_score += genre_pts
                genres_str = ", ".join(matched_genres[:3])
                reasons.append({
                    "criterion": "genre_match",
                    "score_contribution": genre_pts,
                    "description": f"Matches your preferred genre{'s' if len(matched_genres)>1 else ''}: {genres_str}"
                })

        # 2. Selected Mood Match (Max 20)
        if pref_moods:
            matched_moods = [m for m in pref_moods if m.lower() in movie_moods]
            if matched_moods:
                ratio = len(matched_moods) / max(len(pref_moods), 1)
                mood_pts = min(self.w_mood, round(min(ratio * 1.8, 1.0) * self.w_mood, 1))
                total_score += mood_pts
                moods_str = ", ".join(matched_moods)
                reasons.append({
                    "criterion": "mood_match",
                    "score_contribution": mood_pts,
                    "description": f"Matches your '{moods_str}' mood preference"
                })

        # 3. Rating Preference Match (Max 15)
        movie_ext_rating = movie.external_rating or 7.0
        if min_rating > 0:
            if movie_ext_rating >= min_rating:
                rating_pts = self.w_rating
                total_score += rating_pts
                reasons.append({
                    "criterion": "rating_threshold",
                    "score_contribution": rating_pts,
                    "description": f"Exceeds your minimum rating threshold ({movie_ext_rating:.1f} \u2265 {min_rating:.1f})"
                })
            elif movie_ext_rating >= (min_rating - 0.5):
                rating_pts = round(self.w_rating * 0.5, 1)
                total_score += rating_pts
                reasons.append({
                    "criterion": "rating_threshold",
                    "score_contribution": rating_pts,
                    "description": f"Close to your rating criteria ({movie_ext_rating:.1f} vs {min_rating:.1f} target)"
                })
        else:
            # Baseline quality points based on external rating
            if movie_ext_rating >= 8.0:
                rating_pts = self.w_rating
                total_score += rating_pts
                reasons.append({
                    "criterion": "high_rating",
                    "score_contribution": rating_pts,
                    "description": f"Critically acclaimed with a {movie_ext_rating:.1f}/10 rating"
                })
            elif movie_ext_rating >= 7.0:
                rating_pts = round(self.w_rating * 0.7, 1)
                total_score += rating_pts

        # 4. Preferred Release Period (Max 10)
        movie_year = None
        if movie.release_date:
            try:
                movie_year = int(movie.release_date.split("-")[0])
            except (ValueError, IndexError):
                pass

        if movie_year and (year_from is not None or year_to is not None):
            y_from = year_from if year_from is not None else 1900
            y_to = year_to if year_to is not None else 2100
            if y_from <= movie_year <= y_to:
                year_pts = self.w_year
                total_score += year_pts
                reasons.append({
                    "criterion": "release_period",
                    "score_contribution": year_pts,
                    "description": f"Released in {movie_year}, fitting your preferred release era ({y_from}-{y_to})"
                })
        elif movie_year and movie_year >= 2020:
            # Gentle recency bonus if no specific year preference
            year_pts = round(self.w_year * 0.6, 1)
            total_score += year_pts

        # 5. Runtime Preference (Max 10)
        if max_runtime and movie.runtime_minutes:
            if movie.runtime_minutes <= max_runtime:
                runtime_pts = self.w_runtime
                total_score += runtime_pts
                reasons.append({
                    "criterion": "runtime_fit",
                    "score_contribution": runtime_pts,
                    "description": f"Fits your time constraint ({movie.runtime_minutes} min \u2264 {max_runtime} min)"
                })
            elif movie.runtime_minutes <= max_runtime + 15:
                runtime_pts = round(self.w_runtime * 0.5, 1)
                total_score += runtime_pts

        # 6. Similarity to Highly Rated Movies (Max 15)
        if liked_movie_ids:
            max_sim = 0.0
            most_similar_liked_id = None
            for liked_id in liked_movie_ids:
                sims = similarity_service.get_similar_movies(liked_id, top_n=10, db=db)
                for cand_id, sim_score in sims:
                    if cand_id == movie.id and sim_score > max_sim:
                        max_sim = sim_score
                        most_similar_liked_id = liked_id

            if max_sim > 0.15:
                sim_pts = min(self.w_similarity, round(max_sim * self.w_similarity * 1.5, 1))
                total_score += sim_pts
                # Fetch title of liked movie
                liked_movie = db.query(Movie).filter(Movie.id == most_similar_liked_id).first()
                liked_title = liked_movie.title if liked_movie else "a movie"
                reasons.append({
                    "criterion": "content_similarity",
                    "score_contribution": sim_pts,
                    "description": f"High thematic similarity to '{liked_title}', which you rated highly"
                })

        # Final cap at 100.0
        final_score = min(round(total_score, 1), 100.0)

        # Build readable summary explanation
        if reasons:
            top_reasons = [r["description"] for r in reasons[:2]]
            summary = "; ".join(top_reasons)
        else:
            summary = "Popular discovery recommendation based on general appeal."

        return {
            "score": final_score,
            "reasons": reasons,
            "summary_explanation": summary
        }

    def get_personalized_recommendations(
        self,
        db: Session,
        user_id: int,
        limit: int = 15,
        exclude_watched: bool = True
    ) -> Dict[str, Any]:
        """
        Generate ranked recommendations for an authenticated user.
        Combines rule-based preferences, content similarity, and user ratings/feedback.
        """
        # 1. Fetch user preferences
        pref = db.query(UserPreference).filter(UserPreference.user_id == user_id).first()
        pref_genres = self.parse_json_list(pref.preferred_genres) if pref else []
        pref_moods = self.parse_json_list(pref.preferred_moods) if pref else []
        pref_languages = self.parse_json_list(pref.preferred_languages) if pref else []
        min_rating = pref.minimum_rating if pref else 0.0
        year_from = pref.preferred_year_from if pref else None
        year_to = pref.preferred_year_to if pref else None
        max_runtime = pref.maximum_runtime if pref else None

        # 2. Fetch user feedback (negative feedback: not_interested)
        feedbacks = db.query(RecommendationFeedback).filter(RecommendationFeedback.user_id == user_id).all()
        not_interested_ids = {f.movie_id for f in feedbacks if f.feedback_type == "not_interested"}
        already_watched_ids = {f.movie_id for f in feedbacks if f.feedback_type == "already_watched"}

        # 3. Fetch user ratings and watchlist
        user_ratings = db.query(Rating).filter(Rating.user_id == user_id).all()
        rated_movie_ids = {r.movie_id for r in user_ratings}
        liked_movie_ids = [r.movie_id for r in user_ratings if r.rating_value >= 4.0]

        # Explicitly excluded movie IDs
        excluded_ids = set(not_interested_ids)
        if exclude_watched:
            excluded_ids.update(already_watched_ids)
            excluded_ids.update(rated_movie_ids)

        # 4. Fetch published candidate movies
        candidates = db.query(Movie).filter(
            Movie.status == "published",
            Movie.id.notin_(excluded_ids) if excluded_ids else True
        ).all()

        # Check if user has zero preferences and zero ratings (Cold start)
        has_profile = bool(pref_genres or pref_moods or min_rating > 0 or year_from or liked_movie_ids)

        if not candidates or not has_profile:
            return self.get_cold_start_recommendations(db, limit=limit, exclude_ids=excluded_ids)

        scored_results = []
        for movie in candidates:
            eval_res = self.compute_movie_score(
                movie=movie,
                pref_genres=pref_genres,
                pref_moods=pref_moods,
                pref_languages=pref_languages,
                min_rating=min_rating,
                year_from=year_from,
                year_to=year_to,
                max_runtime=max_runtime,
                liked_movie_ids=liked_movie_ids,
                similarity_service=content_similarity_service,
                db=db
            )
            # Only consider movies with positive relevance
            if eval_res["score"] > 0:
                scored_results.append({
                    "movie": movie,
                    "match_score": eval_res["score"],
                    "reasons": eval_res["reasons"],
                    "summary_explanation": eval_res["summary_explanation"]
                })

        # Sort descending by match_score, tie-break on popularity_score and external_rating
        scored_results.sort(
            key=lambda x: (x["match_score"], x["movie"].popularity_score or 0, x["movie"].external_rating or 0),
            reverse=True
        )

        # Diversification step: Avoid single genre occupying all top spots
        diversified = self._diversify_recommendations(scored_results, limit=limit)

        return {
            "recommendations": diversified,
            "total": len(diversified),
            "strategy": "personalized_hybrid"
        }

    def _diversify_recommendations(self, scored_list: List[Dict[str, Any]], limit: int) -> List[Dict[str, Any]]:
        """Greedy diversification: select diverse genres to avoid monotony."""
        if len(scored_list) <= limit:
            return scored_list

        selected = []
        genre_counts: Dict[str, int] = {}
        remaining = list(scored_list)

        while len(selected) < limit and remaining:
            best_idx = 0
            for idx, item in enumerate(remaining):
                movie_genres = [g.name for g in item["movie"].genres]
                max_genre_reps = max([genre_counts.get(g, 0) for g in movie_genres], default=0)
                # If genre isn't over-represented, pick it
                if max_genre_reps < 3 or idx == len(remaining) - 1:
                    best_idx = idx
                    break

            chosen = remaining.pop(best_idx)
            selected.append(chosen)
            for g in chosen["movie"].genres:
                genre_counts[g.name] = genre_counts.get(g.name, 0) + 1

        return selected

    def get_cold_start_recommendations(
        self,
        db: Session,
        limit: int = 15,
        exclude_ids: Optional[set] = None
    ) -> Dict[str, Any]:
        """High-quality diversified fallback for new users with no profile yet."""
        if exclude_ids is None:
            exclude_ids = set()

        movies = db.query(Movie).filter(
            Movie.status == "published",
            Movie.id.notin_(exclude_ids) if exclude_ids else True
        ).order_by(Movie.external_rating.desc(), Movie.popularity_score.desc()).limit(30).all()

        recommendations = []
        for m in movies[:limit]:
            score = round(min(m.external_rating * 10.0, 95.0), 1)
            primary_genre = m.genres[0].name if m.genres else "Cinema"
            reasons = [
                {
                    "criterion": "critical_acclaim",
                    "score_contribution": 50.0,
                    "description": f"Outstanding critical score ({m.external_rating:.1f}/10) among platform favorites"
                },
                {
                    "criterion": "genre_popular",
                    "score_contribution": 35.0,
                    "description": f"Leading title in the {primary_genre} category"
                }
            ]
            recommendations.append({
                "movie": m,
                "match_score": score,
                "reasons": reasons,
                "summary_explanation": f"Trending critically acclaimed {primary_genre} favorite with a {m.external_rating:.1f} rating."
            })

        return {
            "recommendations": recommendations,
            "total": len(recommendations),
            "strategy": "cold_start_fallback"
        }

recommendation_engine = RecommendationEngine()
