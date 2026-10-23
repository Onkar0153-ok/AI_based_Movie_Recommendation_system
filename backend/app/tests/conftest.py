import os
import sys
from pathlib import Path
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

backend_dir = Path(__file__).resolve().parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.db.database import Base, get_db
from app.main import app
from app.seed.seed_data import seed_database
from app.core.security import get_password_hash
from app.models.models import User, UserPreference

TEST_DB_FILE = backend_dir / "test_cinematch.db"
SQLALCHEMY_DATABASE_URL = f"sqlite:///{TEST_DB_FILE}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    # Remove previous test database if present
    if TEST_DB_FILE.exists():
        try: os.remove(TEST_DB_FILE)
        except Exception: pass

    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    seed_database(db)

    # Seed admin user
    admin = User(
        name="Test Admin",
        email="testadmin@cinematch.ai",
        password_hash=get_password_hash("AdminPass123"),
        role="admin",
        is_active=True
    )
    db.add(admin)
    db.commit()

    # Seed normal user
    user = User(
        name="Test User",
        email="testuser@cinematch.ai",
        password_hash=get_password_hash("UserPass123"),
        role="user",
        is_active=True
    )
    db.add(user)
    db.commit()

    pref = UserPreference(
        user_id=user.id,
        preferred_genres='["Sci-Fi", "Thriller"]',
        preferred_moods='["Mind-Bending"]',
        minimum_rating=7.5
    )
    db.add(pref)
    db.commit()
    db.close()

    yield

    # Teardown
    if TEST_DB_FILE.exists():
        try: os.remove(TEST_DB_FILE)
        except Exception: pass

@pytest.fixture(scope="function")
def db_session():
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()

@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
