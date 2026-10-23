import sys
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
import httpx

BASE_URL = "http://127.0.0.1:8000/api"

def run_e2e_verification():
    print("=========================================================")
    print("  CINEMATCH AI — END-TO-END DEMONSTRATION & VERIFICATION")
    print("=========================================================\n")

    client = httpx.Client(base_url=BASE_URL, timeout=15.0)

    # 1. Health Check
    r = client.get("/health")
    assert r.status_code == 200, f"Health check failed: {r.text}"
    print("[PASS] 1. Backend health check: OK")

    # 2. Movie Catalogue & Homepage items
    r = client.get("/movies?page=1&page_size=10&sort_by=popularity")
    assert r.status_code == 200
    movies_data = r.json()
    assert movies_data["total"] >= 50, f"Expected >= 50 movies, got {movies_data['total']}"
    hero_movie = movies_data["items"][0]
    print(f"[PASS] 2. Movie Catalogue seeded ({movies_data['total']} titles). Hero: '{hero_movie['title']}'")

    # 3. Search & NLP Query Parsing
    r = client.get("/search?q=Mind-bending+movies+under+150+minutes")
    assert r.status_code == 200
    search_data = r.json()
    assert search_data["total"] > 0
    parsed = search_data["parsed_filters"]
    assert "Mind-Bending" in parsed["moods"]
    assert parsed["max_runtime"] == 150
    print(f"[PASS] 3. NLP Search Query: '{search_data['raw_query']}' -> Parsed Mood: {parsed['moods']}, Max Runtime: {parsed['max_runtime']}m. Found {search_data['total']} matches.")

    # 4. Multi-criteria Filtering (Genre + Min Rating + Language)
    r = client.get("/movies?genre=Sci-Fi&min_rating=8.0&language=English")
    assert r.status_code == 200
    filtered_items = r.json()["items"]
    assert len(filtered_items) > 0
    for m in filtered_items:
        assert m["external_rating"] >= 8.0
    print(f"[PASS] 4. Multi-criteria Filter (Sci-Fi, Rating >= 8.0, English): Found {len(filtered_items)} titles (e.g., {filtered_items[0]['title']}).")

    # 5. Movie Details & Similar Movies
    movie_id = hero_movie["id"]
    r = client.get(f"/movies/{movie_id}")
    assert r.status_code == 200
    detail = r.json()
    assert detail["title"] == hero_movie["title"]

    r_sim = client.get(f"/recommendations/similar/{movie_id}")
    assert r_sim.status_code == 200
    similar_movies = r_sim.json()
    assert len(similar_movies) > 0
    print(f"[PASS] 5. Movie Details & TF-IDF Cosine Similarity: Found {len(similar_movies)} similar movies for '{detail['title']}'. Top match: '{similar_movies[0]['movie']['title']}' ({similar_movies[0]['match_score']}% match).")

    # 6. User Registration & JWT Authentication
    import uuid
    rand_email = f"demo_user_{uuid.uuid4().hex[:6]}@cinematch.ai"
    r = client.post("/auth/register", json={
        "name": "Alex Mercer",
        "email": rand_email,
        "password": "DiscoveryPassword123"
    })
    assert r.status_code == 201
    user_token = r.json()["access_token"]
    user_headers = {"Authorization": f"Bearer {user_token}"}
    print(f"[PASS] 6. User Registration: Created '{rand_email}' with JWT token.")

    # 7. User Profile & Preferences
    r = client.put("/preferences", headers=user_headers, json={
        "preferred_genres": ["Sci-Fi", "Thriller"],
        "preferred_moods": ["Mind-Bending"],
        "preferred_languages": ["English"],
        "minimum_rating": 8.0,
        "preferred_year_from": 2000,
        "preferred_year_to": 2024,
        "maximum_runtime": 160
    })
    assert r.status_code == 200
    print("[PASS] 7. User Preferences updated: Sci-Fi & Thriller, Mind-Bending mood, 2000-2024 era.")

    # 8. Personalized Recommendations with Explainable Score
    r = client.get("/recommendations/for-you?limit=10", headers=user_headers)
    assert r.status_code == 200
    recs = r.json()["recommendations"]
    assert len(recs) > 0
    top_rec = recs[0]
    print(f"[PASS] 8. Explainable 'For You' Recommendations: Top pick '{top_rec['movie']['title']}' has score {top_rec['match_score']}/100.")
    for reason in top_rec["reasons"][:3]:
        print(f"       • Reason: {reason['description']} (+{reason['score_contribution']} pts)")

    # 9. Watchlist Interaction
    r = client.post(f"/watchlist/{movie_id}", headers=user_headers)
    assert r.status_code == 201
    r = client.get("/watchlist", headers=user_headers)
    assert r.status_code == 200
    assert any(i["movie_id"] == movie_id for i in r.json())
    print(f"[PASS] 9. Watchlist: Successfully saved '{detail['title']}' to personal queue.")

    # 10. Star Rating & Preference Learning Trigger
    r = client.post("/ratings", headers=user_headers, json={
        "movie_id": movie_id,
        "rating_value": 5.0,
        "optional_review": "Absolute cinematic perfection."
    })
    assert r.status_code == 201
    assert r.json()["rating_value"] == 5.0
    print(f"[PASS] 10. Rating: Rated '{detail['title']}' 5.0 ★ with review note.")

    # 11. Feedback-based Recommendation Filtering
    movie_to_suppress = recs[1]["movie"]["id"]
    r = client.post("/recommendations/feedback", headers=user_headers, json={
        "movie_id": movie_to_suppress,
        "feedback_type": "not_interested"
    })
    assert r.status_code == 200

    r = client.get("/recommendations/for-you?limit=10", headers=user_headers)
    new_rec_ids = [item["movie"]["id"] for item in r.json()["recommendations"]]
    assert movie_to_suppress not in new_rec_ids
    print(f"[PASS] 11. Recommendation Feedback: Movie #{movie_to_suppress} marked 'not_interested' was successfully suppressed from subsequent rankings.")

    # 12. Admin Authentication & Dashboard Live Stats
    r_admin_login = client.post("/auth/login", json={
        "email": "admin@cinematch.ai",
        "password": "Admin@12345"
    })
    assert r_admin_login.status_code == 200, f"Admin login failed: {r_admin_login.text}"
    admin_token = r_admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    r_dash = client.get("/admin/dashboard", headers=admin_headers)
    assert r_dash.status_code == 200
    dash_stats = r_dash.json()
    assert dash_stats["total_movies"] >= 50
    assert dash_stats["total_users"] >= 2
    print(f"[PASS] 12. Admin Dashboard Live Stats: {dash_stats['total_movies']} movies, {dash_stats['total_users']} users, {dash_stats['total_ratings']} ratings, {dash_stats['total_watchlist_items']} watchlist items.")

    # 13. Admin Movie Creation, Update & Publishing
    r_create = client.post("/movies", headers=admin_headers, json={
        "title": "Solaris Requiem",
        "description": "An expedition encounters a sentient cosmic ocean manifesting suppressed human grief.",
        "release_date": "2024-12-20",
        "runtime_minutes": 145,
        "language": "English",
        "director": "Andrei Tarkovsky Tribute",
        "cast": "Natascha McElhone, George Clooney",
        "genres": ["Sci-Fi", "Drama"],
        "moods": ["Mind-Bending", "Emotional"],
        "keywords": ["cosmic entity", "space station", "hallucination"],
        "external_rating": 8.4,
        "status": "published"
    })
    assert r_create.status_code == 201
    new_movie_id = r_create.json()["id"]

    # Verify new movie appears in search
    r_search_new = client.get("/search?q=Solaris+Requiem")
    assert r_search_new.status_code == 200
    assert any(m["id"] == new_movie_id for m in r_search_new.json()["items"])
    print(f"[PASS] 13. Admin Movie Management: Created and published 'Solaris Requiem' (ID: {new_movie_id}), verified in public search index.")

    # 14. CSV Bulk Import
    import io
    csv_payload = (
        "title,description,release_date,runtime_minutes,language,director,genres,moods,external_rating\n"
        "Neon Horizon,A rogue android detective navigates Neo-Kyoto,2025-06-15,118,English,Kenji Sato,Sci-Fi|Action,Mind-Bending,8.2\n"
    )
    files = {"file": ("bulk_demo.csv", io.BytesIO(csv_payload.encode("utf-8")), "text/csv")}
    r_import = client.post("/admin/movies/import", headers=admin_headers, files=files)
    assert r_import.status_code == 200
    assert r_import.json()["imported_count"] == 1
    print("[PASS] 14. Admin CSV Bulk Import: Imported 'Neon Horizon' via CSV file.")

    # 15. Audit Log Inspection
    r_act = client.get("/admin/activity?limit=10", headers=admin_headers)
    assert r_act.status_code == 200
    logs = r_act.json()
    assert len(logs) >= 2
    print(f"[PASS] 15. Admin Audit Trail: Verified {len(logs)} recent action logs (e.g., '{logs[0]['action']}: {logs[0]['details']}').")

    print("\n=========================================================")
    print("  ALL 15 END-TO-END DEMONSTRATION WORKFLOWS PASSED!")
    print("=========================================================\n")

if __name__ == "__main__":
    run_e2e_verification()
