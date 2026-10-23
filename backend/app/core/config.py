import os
from pathlib import Path
from pydantic_settings import BaseSettings

# Base Directory: backend/
BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    PROJECT_NAME: str = "CineMatch AI — Smart Movie Discovery & Recommendation Platform"
    API_V1_STR: str = "/api"
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "cinematch_super_secret_jwt_key_change_in_production_2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'cinematch.db'}")
    
    # Uploads
    UPLOADS_DIR: Path = BASE_DIR / "uploads" / "posters"
    MAX_UPLOAD_SIZE_MB: int = 5
    
    # CORS
    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    
    # Recommendation Weights (Max 100 points)
    WEIGHT_GENRE: float = 30.0
    WEIGHT_MOOD: float = 20.0
    WEIGHT_RATING: float = 15.0
    WEIGHT_YEAR: float = 10.0
    WEIGHT_RUNTIME: float = 10.0
    WEIGHT_SIMILARITY: float = 15.0

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
