import io
import pytest
from app.models.models import Movie, User, Rating, WatchlistItem, UserPreference
from app.services.recommendation_engine import recommendation_engine
from app.services.content_similarity import content_similarity_service

# --- 1. Database Initialization ---
def test_database_initialization(db_session):
    movies_count = db_session.query(Movie).count()
    assert movies_count >= 40, f"Expected at least 40 seeded movies, found {movies_count}"

# --- 2. User Registration ---
def test_user_registration(client):
    res = client.post("/api/auth/register", json={
        "name": "Jane Doe",
        "email": "janedoe@example.com",
        "password": "Password123"
    })
    assert res.status_code == 201
    data = res.json()
    assert "access_token" in data
    assert data["user"]["email"] == "janedoe@example.com"
    assert data["user"]["role"] == "user"

# --- 3. Duplicate Email Rejection ---
def test_duplicate_email_rejection(client):
    res = client.post("/api/auth/register", json={
        "name": "Another User",
        "email": "testuser@cinematch.ai",
        "password": "Password123"
    })
    assert res.status_code == 400
    assert "already exists" in res.json()["detail"].lower()

# --- 4. Login Success ---
def test_login_success(client):
    res = client.post("/api/auth/login", json={
        "email": "testuser@cinematch.ai",
        "password": "UserPass123"
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["email"] == "testuser@cinematch.ai"

# --- 5. Login Failure ---
def test_login_failure(client):
    res = client.post("/api/auth/login", json={
        "email": "testuser@cinematch.ai",
        "password": "WrongPassword"
    })
    assert res.status_code == 401

# --- 6. Protected Endpoint Access ---
def test_protected_endpoint_access(client):
    # Unauthenticated
    res_unauth = client.get("/api/auth/me")
    assert res_unauth.status_code == 401

    # Authenticated
    login_res = client.post("/api/auth/login", json={
        "email": "testuser@cinematch.ai",
        "password": "UserPass123"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res_auth = client.get("/api/auth/me", headers=headers)
    assert res_auth.status_code == 200
    assert res_auth.json()["email"] == "testuser@cinematch.ai"

# --- 7. Admin-Only Access ---
def test_admin_only_access(client):
    # Normal user attempt
    user_token = client.post("/api/auth/login", json={
        "email": "testuser@cinematch.ai",
        "password": "UserPass123"
    }).json()["access_token"]

    res_denied = client.get("/api/admin/dashboard", headers={"Authorization": f"Bearer {user_token}"})
    assert res_denied.status_code == 403

    # Admin attempt
    admin_token = client.post("/api/auth/login", json={
        "email": "testadmin@cinematch.ai",
        "password": "AdminPass123"
    }).json()["access_token"]

    res_allowed = client.get("/api/admin/dashboard", headers={"Authorization": f"Bearer {admin_token}"})
    assert res_allowed.status_code == 200
    assert "total_movies" in res_allowed.json()

# --- 8. Movie Listing ---
def test_movie_listing(client):
    res = client.get("/api/movies?page=1&page_size=10")
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert len(data["items"]) == 10
    assert data["total"] >= 40

# --- 9. Movie Creation by Admin ---
def test_movie_creation_by_admin(client):
    admin_token = client.post("/api/auth/login", json={
        "email": "testadmin@cinematch.ai",
        "password": "AdminPass123"
    }).json()["access_token"]
    headers = {"Authorization": f"Bearer {admin_token}"}

    res = client.post("/api/movies", headers=headers, json={
        "title": "Quantum Odyssey",
        "description": "An adventurous journey through alternate quantum realities.",
        "release_date": "2024-11-15",
        "runtime_minutes": 135,
        "language": "English",
        "director": "Elena Vance",
        "cast": "Alexander Hayes, Clara Sterling",
        "genres": ["Sci-Fi", "Adventure"],
        "moods": ["Mind-Bending"],
        "keywords": ["quantum physics", "multiverse"],
        "external_rating": 8.1,
        "status": "published"
    })
    assert res.status_code == 201
    movie_data = res.json()
    assert movie_data["title"] == "Quantum Odyssey"
    assert "quantum-odyssey" in movie_data["slug"]

# --- 10. Rejection of Movie Creation by Normal Users ---
def test_movie_creation_by_normal_user_rejected(client):
    user_token = client.post("/api/auth/login", json={
        "email": "testuser@cinematch.ai",
        "password": "UserPass123"
    }).json()["access_token"]

    res = client.post("/api/movies", headers={"Authorization": f"Bearer {user_token}"}, json={
        "title": "Hacker Movie",
        "description": "Illegal post",
        "genres": ["Action"]
    })
    assert res.status_code == 403

# --- 11. Movie Update and Deletion ---
def test_movie_update_and_deletion(client):
    admin_token = client.post("/api/auth/login", json={
        "email": "testadmin@cinematch.ai",
        "password": "AdminPass123"
    }).json()["access_token"]
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Create temporary movie
    created = client.post("/api/movies", headers=headers, json={
        "title": "Temp Movie To Delete",
        "description": "Testing delete",
        "genres": ["Drama"]
    }).json()
    movie_id = created["id"]

    # Update
    update_res = client.put(f"/api/movies/{movie_id}", headers=headers, json={
        "title": "Updated Temp Movie Title"
    })
    assert update_res.status_code == 200
    assert update_res.json()["title"] == "Updated Temp Movie Title"

    # Delete
    del_res = client.delete(f"/api/movies/{movie_id}", headers=headers)
    assert del_res.status_code == 200

    # Verify 404
    check_res = client.get(f"/api/movies/{movie_id}")
    assert check_res.status_code == 404

# --- 12. Search Filters ---
def test_search_filters_and_nlp(client):
    # Search by genre filter
    res_genre = client.get("/api/search?genre=Animation")
    assert res_genre.status_code == 200
    for m in res_genre.json()["items"]:
        genres = [g["name"].lower() for g in m["genres"]]
        assert "animation" in genres

    # Natural Language Query Parser test
    res_nlp = client.get("/api/search?q=Thriller+movies+released+after+2015")
    assert res_nlp.status_code == 200
    parsed = res_nlp.json()["parsed_filters"]
    assert "Thriller" in parsed["genres"]
    assert parsed["year_from"] == 2015

# --- 13. Recommendation Scoring ---
def test_recommendation_scoring(db_session):
    movie = db_session.query(Movie).filter(Movie.title == "Inception").first()
    assert movie is not None

    score_res = recommendation_engine.compute_movie_score(
        movie=movie,
        pref_genres=["Sci-Fi", "Action"],
        pref_moods=["Mind-Bending"],
        pref_languages=["English"],
        min_rating=8.0,
        year_from=2000,
        year_to=2020,
        max_runtime=160,
        liked_movie_ids=[],
        similarity_service=content_similarity_service,
        db=db_session
    )

    assert score_res["score"] > 50.0
    assert len(score_res["reasons"]) >= 3

# --- 14. Recommendation Score Boundaries ---
def test_recommendation_score_boundaries(db_session):
    movies = db_session.query(Movie).limit(10).all()
    for m in movies:
        res = recommendation_engine.compute_movie_score(
            movie=m,
            pref_genres=["Sci-Fi", "Action", "Thriller", "Adventure", "Drama"],
            pref_moods=["Mind-Bending", "Suspenseful"],
            pref_languages=["English"],
            min_rating=6.0,
            year_from=1980,
            year_to=2030,
            max_runtime=300,
            liked_movie_ids=[m.id],
            similarity_service=content_similarity_service,
            db=db_session
        )
        assert 0.0 <= res["score"] <= 100.0, f"Score {res['score']} out of range [0, 100]"

# --- 15. Recommendation Explanation Correctness ---
def test_recommendation_explanation_correctness(db_session):
    movie = db_session.query(Movie).filter(Movie.title == "Parasite").first()
    assert movie is not None

    res = recommendation_engine.compute_movie_score(
        movie=movie,
        pref_genres=["Comedy"],
        pref_moods=["Suspenseful"],
        pref_languages=["Korean"],
        min_rating=8.0,
        year_from=None,
        year_to=None,
        max_runtime=None,
        liked_movie_ids=[],
        similarity_service=content_similarity_service,
        db=db_session
    )

    criteria = [r["criterion"] for r in res["reasons"]]
    # Parasite matches Comedy, Suspenseful and > 8.0 rating
    assert "genre_match" in criteria
    assert "mood_match" in criteria
    assert "rating_threshold" in criteria
    # Did not specify release era or runtime, so those shouldn't be matched reasons
    assert "release_period" not in criteria
    assert "runtime_fit" not in criteria

# --- 16. Similar-Movie Ranking ---
def test_similar_movie_ranking(client, db_session):
    inception = db_session.query(Movie).filter(Movie.title == "Inception").first()
    assert inception is not None

    res = client.get(f"/api/recommendations/similar/{inception.id}")
    assert res.status_code == 200
    similar_list = res.json()
    assert len(similar_list) > 0
    # Inception should not recommend itself
    assert all(item["movie"]["id"] != inception.id for item in similar_list)
    assert all("content_similarity" in [r["criterion"] for r in item["reasons"]] for item in similar_list)

# --- 17. Watchlist Persistence ---
def test_watchlist_persistence(client, db_session):
    user_token = client.post("/api/auth/login", json={
        "email": "testuser@cinematch.ai",
        "password": "UserPass123"
    }).json()["access_token"]
    headers = {"Authorization": f"Bearer {user_token}"}

    movie = db_session.query(Movie).first()
    
    # Add to watchlist
    res_add = client.post(f"/api/watchlist/{movie.id}", headers=headers)
    assert res_add.status_code == 201

    # Verify persistence
    res_list = client.get("/api/watchlist", headers=headers)
    assert res_list.status_code == 200
    items = res_list.json()
    assert any(i["movie_id"] == movie.id for i in items)

    # Remove from watchlist
    res_del = client.delete(f"/api/watchlist/{movie.id}", headers=headers)
    assert res_del.status_code == 200

# --- 18. Rating Creation and Updates ---
def test_rating_creation_and_update(client, db_session):
    user_token = client.post("/api/auth/login", json={
        "email": "testuser@cinematch.ai",
        "password": "UserPass123"
    }).json()["access_token"]
    headers = {"Authorization": f"Bearer {user_token}"}

    movie = db_session.query(Movie).filter(Movie.title == "Whiplash").first()

    # Rate 4.5
    rate_res = client.post("/api/ratings", headers=headers, json={
        "movie_id": movie.id,
        "rating_value": 4.5,
        "optional_review": "Spectacular intensity!"
    })
    assert rate_res.status_code == 201
    assert rate_res.json()["rating_value"] == 4.5

    # Update rating to 5.0
    rate_res2 = client.post("/api/ratings", headers=headers, json={
        "movie_id": movie.id,
        "rating_value": 5.0,
        "optional_review": "Masterpiece."
    })
    assert rate_res2.status_code == 201
    assert rate_res2.json()["rating_value"] == 5.0

# --- 19. Feedback-Based Recommendation Changes ---
def test_feedback_based_recommendation_filtering(client, db_session):
    user_token = client.post("/api/auth/login", json={
        "email": "testuser@cinematch.ai",
        "password": "UserPass123"
    }).json()["access_token"]
    headers = {"Authorization": f"Bearer {user_token}"}

    movie_to_suppress = db_session.query(Movie).filter(Movie.title == "Get Out").first()

    # Submit 'not_interested'
    fb_res = client.post("/api/recommendations/feedback", headers=headers, json={
        "movie_id": movie_to_suppress.id,
        "feedback_type": "not_interested"
    })
    assert fb_res.status_code == 200

    # Verify recommendations do not include Get Out
    rec_res = client.get("/api/recommendations/for-you", headers=headers)
    assert rec_res.status_code == 200
    rec_ids = [item["movie"]["id"] for item in rec_res.json()["recommendations"]]
    assert movie_to_suppress.id not in rec_ids

# --- 20. CSV Import Validation ---
def test_csv_import_validation(client):
    admin_token = client.post("/api/auth/login", json={
        "email": "testadmin@cinematch.ai",
        "password": "AdminPass123"
    }).json()["access_token"]
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Valid CSV content
    valid_csv = (
        "title,description,release_date,runtime_minutes,language,genres,moods,external_rating\n"
        "Cyber Odyssey,A cyberpunk adventure in Neo Tokyo,2025-05-10,120,English,Sci-Fi|Action,Mind-Bending,8.3\n"
    )
    files = {"file": ("test_import.csv", io.BytesIO(valid_csv.encode("utf-8")), "text/csv")}

    import_res = client.post("/api/admin/movies/import", headers=headers, files=files)
    assert import_res.status_code == 200
    assert import_res.json()["imported_count"] == 1

    # Invalid CSV (missing title header)
    bad_csv = "wrong_header,foo,bar\n1,2,3\n"
    bad_files = {"file": ("bad.csv", io.BytesIO(bad_csv.encode("utf-8")), "text/csv")}
    bad_res = client.post("/api/admin/movies/import", headers=headers, files=bad_files)
    assert bad_res.status_code == 400
