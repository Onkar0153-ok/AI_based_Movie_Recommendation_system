import os
import logging
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings, BASE_DIR
from app.db.init_db import init_db
from app.seed.seed_data import seed_database
from app.routers import (
    auth, movies, search, recommendations,
    ratings, watchlist, history, preferences, admin
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("cinematch.main")

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing CineMatch AI backend services...")
    init_db()
    # Auto-seed if database has 0 movies
    from app.db.database import SessionLocal
    from app.models.models import Movie
    db = SessionLocal()
    try:
        movie_count = db.query(Movie).count()
        if movie_count == 0:
            logger.info("Movie catalogue is empty. Seeding initial records...")
            seed_database(db)
        else:
            logger.info(f"Database already populated with {movie_count} movies.")
    finally:
        db.close()
    logger.info("CineMatch AI backend initialization complete.")
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Intelligent movie discovery and explainable recommendation API.",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static Uploads directory for poster images
uploads_path = Path(settings.UPLOADS_DIR)
uploads_path.mkdir(parents=True, exist_ok=True)
app.mount("/uploads/posters", StaticFiles(directory=str(uploads_path)), name="posters")

# Include Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(movies.router, prefix=settings.API_V1_STR)
app.include_router(search.router, prefix=settings.API_V1_STR)
app.include_router(recommendations.router, prefix=settings.API_V1_STR)
app.include_router(ratings.router, prefix=settings.API_V1_STR)
app.include_router(watchlist.router, prefix=settings.API_V1_STR)
app.include_router(history.router, prefix=settings.API_V1_STR)
app.include_router(preferences.router, prefix=settings.API_V1_STR)
app.include_router(admin.router, prefix=settings.API_V1_STR)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "CineMatch AI API",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
