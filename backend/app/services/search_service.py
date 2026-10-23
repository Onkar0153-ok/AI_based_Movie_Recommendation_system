import re
import logging
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc, asc

from app.models.models import Movie, Genre, MovieGenre, MovieMood, MovieKeyword
from app.schemas.schemas import ParsedQueryFilters

logger = logging.getLogger("cinematch.search_service")

# Known vocabulary sets for deterministic parsing
KNOWN_GENRES = [
    "action", "adventure", "animation", "biography", "comedy", "crime",
    "drama", "family", "fantasy", "history", "horror", "music",
    "mystery", "romance", "sci-fi", "science fiction", "sport", "thriller", "war"
]

KNOWN_MOODS = [
    "feel-good", "feel good", "mind-bending", "mind bending", "suspenseful",
    "emotional", "motivational", "scary", "relaxing", "adventure",
    "romantic", "family-friendly", "family friendly"
]

KNOWN_LANGUAGES = [
    "english", "hindi", "korean", "japanese", "spanish", "french",
    "kannada", "telugu", "tamil", "mandarin", "bengali", "german", "italian"
]

class SearchService:
    def parse_natural_language_query(self, query: str) -> ParsedQueryFilters:
        """
        Extract structured filters from a natural language search query.
        Deterministic regex + keyword scanner.
        """
        q = query.lower().strip()
        parsed = ParsedQueryFilters()
        
        # 1. Similarity / Reference: "similar to X", "like X"
        sim_match = re.search(r"(?:similar\s+to|like)\s+([a-zA-Z0-9\s:'\-]+)", q, re.IGNORECASE)
        if sim_match:
            ref_raw = sim_match.group(1).strip()
            # Clean trailing conjunctions
            ref_raw = re.split(r"\b(under|after|before|between|with|released|rated)\b", ref_raw)[0].strip()
            if ref_raw:
                parsed.referenced_title = ref_raw
                q = q.replace(sim_match.group(0), " ").strip()

        # 2. Release Year Range: "between YYYY and YYYY", "from YYYY to YYYY"
        range_match = re.search(r"(?:between|from)\s+(\d{4})\s+(?:and|to)\s+(\d{4})", q)
        if range_match:
            y1, y2 = int(range_match.group(1)), int(range_match.group(2))
            parsed.year_from = min(y1, y2)
            parsed.year_to = max(y1, y2)
            q = q.replace(range_match.group(0), " ")
        else:
            # "after YYYY", "since YYYY", "post YYYY"
            after_match = re.search(r"(?:after|since|post)\s+(\d{4})", q)
            if after_match:
                parsed.year_from = int(after_match.group(1))
                q = q.replace(after_match.group(0), " ")

            # "before YYYY", "prior to YYYY"
            before_match = re.search(r"(?:before|prior\s+to)\s+(\d{4})", q)
            if before_match:
                parsed.year_to = int(before_match.group(1))
                q = q.replace(before_match.group(0), " ")

            # "released in YYYY" or "in YYYY"
            in_match = re.search(r"(?:released\s+in|in)\s+(\d{4})", q)
            if in_match:
                y = int(in_match.group(1))
                parsed.year_from = y
                parsed.year_to = y
                q = q.replace(in_match.group(0), " ")

        # 3. Runtime constraints: "under X minutes", "less than X hours", "under X mins"
        hours_match = re.search(r"(?:under|less\s+than|shorter\s+than)\s+(\d+(?:\.\d+)?)\s*(?:hours|hrs|hr)", q)
        if hours_match:
            hrs = float(hours_match.group(1))
            parsed.max_runtime = int(hrs * 60)
            q = q.replace(hours_match.group(0), " ")
        else:
            mins_match = re.search(r"(?:under|less\s+than|shorter\s+than)\s+(\d+)\s*(?:minutes|mins|min)", q)
            if mins_match:
                parsed.max_runtime = int(mins_match.group(1))
                q = q.replace(mins_match.group(0), " ")

        # 4. Rating constraints: "rating > X", "rated above X", "highly rated"
        rated_above = re.search(r"(?:rated\s+above|rating\s*(?:>|above|over))\s*(\d+(?:\.\d+)?)", q)
        if rated_above:
            parsed.min_rating = float(rated_above.group(1))
            q = q.replace(rated_above.group(0), " ")
        elif "highly rated" in q or "top rated" in q or "best rated" in q:
            parsed.min_rating = 8.0
            q = re.sub(r"\b(highly|top|best)\s+rated\b", " ", q)

        # 5. Genres
        found_genres = []
        for g in KNOWN_GENRES:
            pattern = r"\b" + re.escape(g) + r"\b"
            if re.search(pattern, q):
                # Standardize
                norm_g = "Sci-Fi" if g in ["sci-fi", "science fiction"] else g.capitalize()
                found_genres.append(norm_g)
                q = re.sub(pattern, " ", q)
        parsed.genres = list(set(found_genres))

        # 6. Moods
        found_moods = []
        for m in KNOWN_MOODS:
            pattern = r"\b" + re.escape(m) + r"\b"
            if re.search(pattern, q):
                norm_m = m.replace(" ", "-").title()
                if norm_m == "Feel-Good": norm_m = "Feel-Good"
                if norm_m == "Mind-Bending": norm_m = "Mind-Bending"
                if norm_m == "Family-Friendly": norm_m = "Family-Friendly"
                found_moods.append(norm_m)
                q = re.sub(pattern, " ", q)
        parsed.moods = list(set(found_moods))

        # 7. Languages
        found_langs = []
        for l in KNOWN_LANGUAGES:
            pattern = r"\b" + re.escape(l) + r"\b"
            if re.search(pattern, q):
                found_langs.append(l.capitalize())
                q = re.sub(pattern, " ", q)
        parsed.languages = list(set(found_langs))

        # 8. Clean residual noise words ("movies", "films", "cinema", "show me", "find")
        q = re.sub(r"\b(movie|movies|film|films|show|me|find|watch|look|for|released)\b", " ", q)
        cleaned_text = re.sub(r"\s+", " ", q).strip()
        parsed.text_query = cleaned_text if len(cleaned_text) >= 2 else None

        return parsed

    def search_movies(
        self,
        db: Session,
        query: Optional[str] = None,
        genre: Optional[str] = None,
        mood: Optional[str] = None,
        language: Optional[str] = None,
        year_from: Optional[int] = None,
        year_to: Optional[int] = None,
        min_rating: Optional[float] = None,
        max_runtime: Optional[int] = None,
        sort_by: str = "popularity",  # 'popularity', 'rating', 'release_date', 'title'
        sort_order: str = "desc",     # 'desc' or 'asc'
        page: int = 1,
        page_size: int = 20,
        status: str = "published"
    ) -> Dict[str, Any]:
        """Execute full structured search with parsed query support."""
        parsed_filters = None
        base_query = db.query(Movie)

        if status:
            base_query = base_query.filter(Movie.status == status)

        # Apply NLP query if provided
        if query and query.strip():
            raw_q = query.strip()
            parsed_filters = self.parse_natural_language_query(raw_q)

            # Merge parsed filters with explicit parameters
            if parsed_filters.genres and not genre:
                genre = parsed_filters.genres[0]
            if parsed_filters.moods and not mood:
                mood = parsed_filters.moods[0]
            if parsed_filters.languages and not language:
                language = parsed_filters.languages[0]
            if parsed_filters.year_from and year_from is None:
                year_from = parsed_filters.year_from
            if parsed_filters.year_to and year_to is None:
                year_to = parsed_filters.year_to
            if parsed_filters.min_rating and min_rating is None:
                min_rating = parsed_filters.min_rating
            if parsed_filters.max_runtime and max_runtime is None:
                max_runtime = parsed_filters.max_runtime

            # Text search on residual keywords if present, or raw query if no structured filters were extracted
            has_structured_filter = bool(
                parsed_filters.genres
                or parsed_filters.moods
                or parsed_filters.languages
                or parsed_filters.year_from
                or parsed_filters.year_to
                or parsed_filters.min_rating
                or parsed_filters.max_runtime
                or parsed_filters.referenced_title
            )
            text_to_search = parsed_filters.text_query if has_structured_filter else raw_q
            if text_to_search and len(text_to_search) >= 2:
                term = f"%{text_to_search}%"
                base_query = base_query.filter(
                    or_(
                        Movie.title.ilike(term),
                        Movie.director.ilike(term),
                        Movie.cast.ilike(term),
                        Movie.description.ilike(term),
                    )
                )

        # Explicit / Merged Filters
        if genre and genre != "All":
            base_query = base_query.filter(
                Movie.genres.any(Genre.name.ilike(f"%{genre}%"))
            )

        if mood and mood != "All":
            base_query = base_query.filter(
                Movie.moods.any(MovieMood.mood_name.ilike(f"%{mood}%"))
            )

        if language and language != "All":
            base_query = base_query.filter(Movie.language.ilike(language))

        if min_rating and min_rating > 0:
            base_query = base_query.filter(Movie.external_rating >= min_rating)

        if max_runtime and max_runtime > 0:
            base_query = base_query.filter(Movie.runtime_minutes <= max_runtime)

        if year_from is not None:
            # SQLite string release_date check
            base_query = base_query.filter(Movie.release_date >= f"{year_from}-01-01")

        if year_to is not None:
            base_query = base_query.filter(Movie.release_date <= f"{year_to}-12-31")

        # Sorting
        order_fn = desc if sort_order.lower() == "desc" else asc
        if sort_by == "rating":
            base_query = base_query.order_by(order_fn(Movie.external_rating))
        elif sort_by == "release_date":
            base_query = base_query.order_by(order_fn(Movie.release_date))
        elif sort_by == "title":
            base_query = base_query.order_by(order_fn(Movie.title))
        else:  # popularity default
            base_query = base_query.order_by(order_fn(Movie.popularity_score))

        total = base_query.count()
        offset = (page - 1) * page_size
        items = base_query.offset(offset).limit(page_size).all()

        return {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": max(1, (total + page_size - 1) // page_size),
            "parsed_filters": parsed_filters,
            "raw_query": query or ""
        }

    def get_autocomplete_suggestions(self, db: Session, query: str, limit: int = 6) -> List[Dict[str, Any]]:
        """Instant search suggestions for title bar dropdown."""
        if not query or len(query.strip()) < 1:
            return []
        
        term = f"%{query.strip()}%"
        movies = db.query(Movie).filter(
            Movie.status == "published",
            Movie.title.ilike(term)
        ).order_by(Movie.popularity_score.desc()).limit(limit).all()

        return [
            {
                "id": m.id,
                "title": m.title,
                "release_date": m.release_date,
                "poster_url": m.poster_url,
                "external_rating": m.external_rating,
                "genres": [g.name for g in m.genres[:2]]
            }
            for m in movies
        ]

search_service = SearchService()
