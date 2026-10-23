import logging
from typing import List, Tuple, Dict, Optional
from sqlalchemy.orm import Session
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

from app.models.models import Movie

logger = logging.getLogger("cinematch.content_similarity")

class ContentSimilarityService:
    def __init__(self):
        self.movie_ids: List[int] = []
        self.movie_id_to_idx: Dict[int, int] = {}
        self.similarity_matrix: Optional[np.ndarray] = None
        self.is_fitted: bool = False

    def invalidate_cache(self):
        """Invalidate the in-memory similarity matrix so it will be rebuilt on next request."""
        logger.info("Invalidating content similarity cache.")
        self.is_fitted = False
        self.movie_ids = []
        self.movie_id_to_idx = {}
        self.similarity_matrix = None

    def _build_feature_text(self, movie: Movie) -> str:
        """Combine metadata into rich semantic document for TF-IDF."""
        parts = [
            movie.title or "",
            movie.description or "",
            movie.director or "",
            movie.cast or "",
            " ".join([g.name for g in movie.genres]),
            " ".join([m.mood_name for m in movie.moods]),
            " ".join([k.keyword for k in movie.keywords]),
            movie.language or "",
        ]
        return " ".join([p for p in parts if p]).strip()

    def fit_if_needed(self, db: Session):
        """Fit TF-IDF matrix over all published movies if not already cached."""
        if self.is_fitted and self.similarity_matrix is not None:
            return

        movies = db.query(Movie).filter(Movie.status == "published").all()
        if not movies:
            logger.warning("No published movies available to build similarity index.")
            self.movie_ids = []
            self.similarity_matrix = np.zeros((0, 0))
            self.is_fitted = True
            return

        documents = [self._build_feature_text(m) for m in movies]
        self.movie_ids = [m.id for m in movies]
        self.movie_id_to_idx = {m_id: idx for idx, m_id in enumerate(self.movie_ids)}

        try:
            vectorizer = TfidfVectorizer(
                stop_words="english",
                ngram_range=(1, 2),
                min_df=1,
                max_features=5000
            )
            tfidf_matrix = vectorizer.fit_transform(documents)
            self.similarity_matrix = cosine_similarity(tfidf_matrix, tfidf_matrix)
            self.is_fitted = True
            logger.info(f"Fitted TF-IDF similarity model for {len(movies)} published movies.")
        except Exception as e:
            logger.error(f"Error computing TF-IDF similarity: {e}. Falling back to empty similarity.")
            self.similarity_matrix = np.zeros((len(movies), len(movies)))
            self.is_fitted = True

    def get_similar_movies(self, movie_id: int, top_n: int = 8, db: Session = None) -> List[Tuple[int, float]]:
        """
        Return list of (movie_id, similarity_score_normalized) sorted descending.
        Excludes the query movie itself.
        """
        if db is not None:
            self.fit_if_needed(db)

        if not self.is_fitted or self.similarity_matrix is None or movie_id not in self.movie_id_to_idx:
            # Fallback based on genre overlap if ML index isn't ready
            if db:
                return self._metadata_fallback_similarity(movie_id, top_n, db)
            return []

        idx = self.movie_id_to_idx[movie_id]
        sim_scores = self.similarity_matrix[idx]

        # Get sorted indices descending
        ranked_indices = np.argsort(sim_scores)[::-1]

        results = []
        for r_idx in ranked_indices:
            other_id = self.movie_ids[r_idx]
            if other_id == movie_id:
                continue
            score = float(sim_scores[r_idx])
            # Filter negligible similarity if we have enough
            results.append((other_id, round(score, 4)))
            if len(results) >= top_n:
                break

        return results

    def _metadata_fallback_similarity(self, movie_id: int, top_n: int, db: Session) -> List[Tuple[int, float]]:
        """Deterministic metadata overlap fallback if scikit-learn is unavailable or edge case."""
        target = db.query(Movie).filter(Movie.id == movie_id).first()
        if not target:
            return []
        
        target_genres = {g.name.lower() for g in target.genres}
        target_moods = {m.mood_name.lower() for m in target.moods}
        
        candidates = db.query(Movie).filter(Movie.id != movie_id, Movie.status == "published").all()
        scored = []
        for cand in candidates:
            cand_genres = {g.name.lower() for g in cand.genres}
            cand_moods = {m.mood_name.lower() for m in cand.moods}
            genre_overlap = len(target_genres.intersection(cand_genres))
            mood_overlap = len(target_moods.intersection(cand_moods))
            score = (genre_overlap * 0.6 + mood_overlap * 0.4) / max(len(target_genres) + 1, 1)
            if score > 0:
                scored.append((cand.id, round(min(score, 1.0), 3)))

        scored.sort(key=lambda x: x[1], reverse=True)
        return scored[:top_n]

content_similarity_service = ContentSimilarityService()
