from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Float, Text, Boolean, DateTime,
    ForeignKey, UniqueConstraint, Table
)
from sqlalchemy.orm import relationship
from app.db.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class MovieGenre(Base):
    __tablename__ = "movie_genres"
    
    movie_id = Column(Integer, ForeignKey("movies.id", ondelete="CASCADE"), primary_key=True)
    genre_id = Column(Integer, ForeignKey("genres.id", ondelete="CASCADE"), primary_key=True)

class Genre(Base):
    __tablename__ = "genres"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, index=True, nullable=False)

    movies = relationship("Movie", secondary="movie_genres", back_populates="genres")

class MovieMood(Base):
    __tablename__ = "movie_moods"

    id = Column(Integer, primary_key=True, index=True)
    movie_id = Column(Integer, ForeignKey("movies.id", ondelete="CASCADE"), index=True, nullable=False)
    mood_name = Column(String(50), index=True, nullable=False)

    movie = relationship("Movie", back_populates="moods")

class MovieKeyword(Base):
    __tablename__ = "movie_keywords"

    id = Column(Integer, primary_key=True, index=True)
    movie_id = Column(Integer, ForeignKey("movies.id", ondelete="CASCADE"), index=True, nullable=False)
    keyword = Column(String(100), index=True, nullable=False)

    movie = relationship("Movie", back_populates="keywords")

class Movie(Base):
    __tablename__ = "movies"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), index=True, nullable=False)
    slug = Column(String(255), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    release_date = Column(String(20), nullable=True)  # YYYY-MM-DD or YYYY
    runtime_minutes = Column(Integer, nullable=True)
    language = Column(String(50), default="English", index=True)
    director = Column(String(150), index=True, nullable=True)
    cast = Column(Text, nullable=True)
    poster_url = Column(String(500), nullable=True)
    trailer_url = Column(String(500), nullable=True)
    content_rating = Column(String(20), default="PG-13")
    external_rating = Column(Float, default=7.0, index=True)
    popularity_score = Column(Float, default=50.0, index=True)
    status = Column(String(20), default="published", index=True)  # published or draft
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    genres = relationship("Genre", secondary="movie_genres", back_populates="movies")
    moods = relationship("MovieMood", back_populates="movie", cascade="all, delete-orphan")
    keywords = relationship("MovieKeyword", back_populates="movie", cascade="all, delete-orphan")
    ratings = relationship("Rating", back_populates="movie", cascade="all, delete-orphan")
    watchlist_entries = relationship("WatchlistItem", back_populates="movie", cascade="all, delete-orphan")
    feedbacks = relationship("RecommendationFeedback", back_populates="movie", cascade="all, delete-orphan")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default="user", index=True)  # 'user' or 'admin'
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)

    preferences = relationship("UserPreference", back_populates="user", uselist=False, cascade="all, delete-orphan")
    ratings = relationship("Rating", back_populates="user", cascade="all, delete-orphan")
    watchlist = relationship("WatchlistItem", back_populates="user", cascade="all, delete-orphan")
    history = relationship("WatchHistory", back_populates="user", cascade="all, delete-orphan")
    feedbacks = relationship("RecommendationFeedback", back_populates="user", cascade="all, delete-orphan")

class UserPreference(Base):
    __tablename__ = "user_preferences"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    preferred_genres = Column(Text, default="[]")       # JSON array of genre names
    preferred_languages = Column(Text, default="[]")    # JSON array
    preferred_moods = Column(Text, default="[]")        # JSON array
    minimum_rating = Column(Float, default=0.0)
    preferred_year_from = Column(Integer, nullable=True)
    preferred_year_to = Column(Integer, nullable=True)
    maximum_runtime = Column(Integer, nullable=True)

    user = relationship("User", back_populates="preferences")

class Rating(Base):
    __tablename__ = "ratings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    movie_id = Column(Integer, ForeignKey("movies.id", ondelete="CASCADE"), index=True, nullable=False)
    rating_value = Column(Float, nullable=False)  # 1.0 to 5.0
    optional_review = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    user = relationship("User", back_populates="ratings")
    movie = relationship("Movie", back_populates="ratings")

    __table_args__ = (
        UniqueConstraint("user_id", "movie_id", name="uq_user_movie_rating"),
    )

class WatchlistItem(Base):
    __tablename__ = "watchlist_items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    movie_id = Column(Integer, ForeignKey("movies.id", ondelete="CASCADE"), index=True, nullable=False)
    created_at = Column(DateTime, default=utc_now)

    user = relationship("User", back_populates="watchlist")
    movie = relationship("Movie", back_populates="watchlist_entries")

    __table_args__ = (
        UniqueConstraint("user_id", "movie_id", name="uq_user_movie_watchlist"),
    )

class WatchHistory(Base):
    __tablename__ = "watch_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    movie_id = Column(Integer, ForeignKey("movies.id", ondelete="CASCADE"), index=True, nullable=False)
    watched_at = Column(DateTime, default=utc_now)

    user = relationship("User", back_populates="history")
    movie = relationship("Movie")

class RecommendationFeedback(Base):
    __tablename__ = "recommendation_feedback"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    movie_id = Column(Integer, ForeignKey("movies.id", ondelete="CASCADE"), index=True, nullable=False)
    feedback_type = Column(String(50), nullable=False)  # 'useful', 'not_interested', 'already_watched'
    created_at = Column(DateTime, default=utc_now)

    user = relationship("User", back_populates="feedbacks")
    movie = relationship("Movie", back_populates="feedbacks")

class AdminActivity(Base):
    __tablename__ = "admin_activity"

    id = Column(Integer, primary_key=True, index=True)
    admin_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(100), nullable=False)
    movie_id = Column(Integer, ForeignKey("movies.id", ondelete="SET NULL"), nullable=True)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    admin = relationship("User")
    movie = relationship("Movie")
