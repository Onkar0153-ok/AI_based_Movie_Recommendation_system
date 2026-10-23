import logging
from app.db.database import engine, Base, SessionLocal
# Import models so SQLAlchemy registers them with Base.metadata
import app.models.models

logger = logging.getLogger("cinematch.init_db")

def init_db():
    """Idempotently create all tables."""
    logger.info("Initializing database schema...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables verified.")

if __name__ == "__main__":
    init_db()
