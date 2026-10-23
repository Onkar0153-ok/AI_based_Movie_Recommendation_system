import sys
import json
import logging
from pathlib import Path
from sqlalchemy.orm import Session

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.db.database import SessionLocal, engine, Base
from app.models.models import Movie, Genre, MovieGenre, MovieMood, MovieKeyword
from app.core.config import BASE_DIR

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("cinematch.seed")

def seed_database(db: Session = None):
    """Seed the database with rich movie catalog idempotently."""
    close_db = False
    if db is None:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        close_db = True

    try:
        json_path = Path(__file__).parent / "seed_movies.json"
        if not json_path.exists():
            logger.error(f"Seed file not found: {json_path}")
            return 0

        with open(json_path, "r", encoding="utf-8") as f:
            movies_data = json.load(f)

        logger.info(f"Loaded {len(movies_data)} movies from seed JSON.")

        # Cache existing genres
        existing_genres = {g.name.lower(): g for g in db.query(Genre).all()}

        inserted_count = 0
        for item in movies_data:
            slug = item.get("slug")
            title = item.get("title")
            
            # Check if movie already exists by slug
            existing_movie = db.query(Movie).filter(Movie.slug == slug).first()
            if existing_movie:
                continue

            # Create movie
            movie = Movie(
                title=title,
                slug=slug,
                description=item.get("description"),
                release_date=item.get("release_date"),
                runtime_minutes=item.get("runtime_minutes"),
                language=item.get("language", "English"),
                director=item.get("director"),
                cast=item.get("cast"),
                poster_url=item.get("poster_url"),
                trailer_url=item.get("trailer_url"),
                content_rating=item.get("content_rating", "PG-13"),
                external_rating=float(item.get("external_rating", 7.0)),
                popularity_score=float(item.get("popularity_score", 50.0)),
                status=item.get("status", "published"),
            )
            db.add(movie)
            db.flush()  # populate movie.id

            # Add Genres
            for genre_name in item.get("genres", []):
                genre_name_clean = genre_name.strip()
                if not genre_name_clean:
                    continue
                g_key = genre_name_clean.lower()
                if g_key not in existing_genres:
                    new_g = Genre(name=genre_name_clean)
                    db.add(new_g)
                    db.flush()
                    existing_genres[g_key] = new_g
                
                genre_obj = existing_genres[g_key]
                # Associate movie_genre
                mg = MovieGenre(movie_id=movie.id, genre_id=genre_obj.id)
                db.add(mg)

            # Add Moods
            for mood_name in item.get("moods", []):
                mood_name_clean = mood_name.strip()
                if mood_name_clean:
                    mm = MovieMood(movie_id=movie.id, mood_name=mood_name_clean)
                    db.add(mm)

            # Add Keywords
            for kw in item.get("keywords", []):
                kw_clean = kw.strip()
                if kw_clean:
                    mk = MovieKeyword(movie_id=movie.id, keyword=kw_clean)
                    db.add(mk)

            inserted_count += 1

        db.commit()
        logger.info(f"Database seeded successfully. {inserted_count} new movies added.")
        return inserted_count
    except Exception as e:
        db.rollback()
        logger.error(f"Error during seeding: {e}")
        raise
    finally:
        if close_db:
            db.close()

if __name__ == "__main__":
    seed_database()
