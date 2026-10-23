from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

# --- Auth & User ---
class UserBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr

class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=100)
    role: Optional[str] = "user"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: int
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = "user"
    exp: Optional[int] = None

# --- Genre & Mood ---
class GenreSchema(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True

class MoodSchema(BaseModel):
    id: int
    mood_name: str

    class Config:
        from_attributes = True

class KeywordSchema(BaseModel):
    id: int
    keyword: str

    class Config:
        from_attributes = True

# --- Movie Schemas ---
class MovieBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    release_date: Optional[str] = None
    runtime_minutes: Optional[int] = Field(None, ge=1, le=600)
    language: Optional[str] = "English"
    director: Optional[str] = None
    cast: Optional[str] = None
    poster_url: Optional[str] = None
    trailer_url: Optional[str] = None
    content_rating: Optional[str] = "PG-13"
    external_rating: Optional[float] = Field(7.0, ge=0.0, le=10.0)
    popularity_score: Optional[float] = Field(50.0, ge=0.0)
    status: Optional[str] = "published"  # 'published' or 'draft'

class MovieCreate(MovieBase):
    genres: List[str] = []
    moods: List[str] = []
    keywords: List[str] = []

class MovieUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    release_date: Optional[str] = None
    runtime_minutes: Optional[int] = None
    language: Optional[str] = None
    director: Optional[str] = None
    cast: Optional[str] = None
    poster_url: Optional[str] = None
    trailer_url: Optional[str] = None
    content_rating: Optional[str] = None
    external_rating: Optional[float] = None
    popularity_score: Optional[float] = None
    status: Optional[str] = None
    genres: Optional[List[str]] = None
    moods: Optional[List[str]] = None
    keywords: Optional[List[str]] = None

class MovieResponse(MovieBase):
    id: int
    slug: str
    created_at: datetime
    updated_at: datetime
    genres: List[GenreSchema] = []
    moods: List[MoodSchema] = []
    keywords: List[KeywordSchema] = []
    average_user_rating: Optional[float] = None
    user_ratings_count: Optional[int] = 0
    is_in_watchlist: Optional[bool] = False
    current_user_rating: Optional[float] = None

    class Config:
        from_attributes = True

class PaginatedMoviesResponse(BaseModel):
    items: List[MovieResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

# --- User Preferences ---
class UserPreferenceBase(BaseModel):
    preferred_genres: List[str] = []
    preferred_languages: List[str] = []
    preferred_moods: List[str] = []
    minimum_rating: float = 0.0
    preferred_year_from: Optional[int] = None
    preferred_year_to: Optional[int] = None
    maximum_runtime: Optional[int] = None

class UserPreferenceUpdate(UserPreferenceBase):
    pass

class UserPreferenceResponse(UserPreferenceBase):
    user_id: int

    class Config:
        from_attributes = True

# --- Rating ---
class RatingCreate(BaseModel):
    movie_id: int
    rating_value: float = Field(..., ge=1.0, le=5.0)
    optional_review: Optional[str] = None

class RatingUpdate(BaseModel):
    rating_value: float = Field(..., ge=1.0, le=5.0)
    optional_review: Optional[str] = None

class RatingResponse(BaseModel):
    id: int
    user_id: int
    movie_id: int
    rating_value: float
    optional_review: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    movie_title: Optional[str] = None
    movie_poster_url: Optional[str] = None

    class Config:
        from_attributes = True

# --- Watchlist ---
class WatchlistResponse(BaseModel):
    id: int
    user_id: int
    movie_id: int
    created_at: datetime
    movie: Optional[MovieResponse] = None

    class Config:
        from_attributes = True

# --- History ---
class WatchHistoryResponse(BaseModel):
    id: int
    user_id: int
    movie_id: int
    watched_at: datetime
    movie: Optional[MovieResponse] = None

    class Config:
        from_attributes = True

# --- Feedback ---
class RecommendationFeedbackCreate(BaseModel):
    movie_id: int
    feedback_type: str = Field(..., pattern="^(useful|not_interested|already_watched)$")

class RecommendationFeedbackResponse(BaseModel):
    id: int
    user_id: int
    movie_id: int
    feedback_type: str
    created_at: datetime

    class Config:
        from_attributes = True

# --- Recommendations ---
class RecommendationReason(BaseModel):
    criterion: str
    score_contribution: float
    description: str

class RecommendationItem(BaseModel):
    movie: MovieResponse
    match_score: float = Field(..., ge=0.0, le=100.0)
    reasons: List[RecommendationReason] = []
    summary_explanation: str

class RecommendationsResponse(BaseModel):
    recommendations: List[RecommendationItem]
    total: int
    strategy: str  # "personalized_hybrid", "cold_start_fallback", "content_similarity"

# --- Search & Query Parsing ---
class ParsedQueryFilters(BaseModel):
    genres: List[str] = []
    moods: List[str] = []
    languages: List[str] = []
    year_from: Optional[int] = None
    year_to: Optional[int] = None
    min_rating: Optional[float] = None
    max_runtime: Optional[int] = None
    referenced_title: Optional[str] = None
    text_query: Optional[str] = None

class SearchResponse(BaseModel):
    items: List[MovieResponse]
    total: int
    parsed_filters: Optional[ParsedQueryFilters] = None
    raw_query: str

class AutocompleteSuggestion(BaseModel):
    id: int
    title: str
    release_date: Optional[str] = None
    poster_url: Optional[str] = None
    external_rating: Optional[float] = None
    genres: List[str] = []

# --- Admin Analytics ---
class GenreCount(BaseModel):
    genre: str
    count: int

class RatingDistribution(BaseModel):
    rating: int
    count: int

class AdditionsOverTime(BaseModel):
    date: str
    count: int

class AdminDashboardStats(BaseModel):
    total_movies: int
    published_movies: int
    draft_movies: int
    total_users: int
    total_ratings: int
    total_watchlist_items: int
    average_platform_rating: float
    genre_distribution: List[GenreCount]
    rating_distribution: List[RatingDistribution]
    additions_over_time: List[AdditionsOverTime]
    most_rated_movies: List[dict]
    highest_rated_movies: List[dict]
    most_watchlist_movies: List[dict]
    feedback_summary: dict

class AdminActivityResponse(BaseModel):
    id: int
    admin_id: Optional[int] = None
    admin_name: Optional[str] = None
    action: str
    movie_id: Optional[int] = None
    details: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
