# CineMatch AI — Smart Movie Discovery & Recommendation Platform

> **A full-stack, AI-powered movie discovery and recommendation platform built with FastAPI, React (Vite), Tailwind CSS, SQLite, and scikit-learn.**

---

## 📽️ Project Overview

**CineMatch AI** is a production-grade movie recommendation and discovery web application. It combines **multi-criteria rule-based recommendation scoring**, **content-based Machine Learning similarity** (TF-IDF + Cosine Similarity), a **deterministic Natural Language search parser**, and a **streaming-inspired UI** (deep midnight `#080B14`, electric violet `#8B5CF6`, cyan `#22D3EE`).

This application does not rely on cloud services, vector databases, paid APIs, or third-party LLMs. It is completely self-contained, locally runnable on Windows 10/11, and seeded with 55+ cinematic classics and modern blockbusters.

---

## 🌟 Key Features

1. **Rule-Based Recommendation Engine**:
   - Multi-criteria weighted scoring (up to 100 points):
     - Preferred Genre Match: up to 30 pts
     - Mood Match: up to 20 pts
     - Minimum Rating Criterion: up to 15 pts
     - Release Era Match: up to 10 pts
     - Runtime Constraint Match: up to 10 pts
     - Similarity to Positively Rated Films: up to 15 pts
   - Fully **explainable recommendations**: Displays exact matched criteria and point contributions.
   - Dynamic feedback suppression (`not_interested`, `already_watched`).
   - Greedy genre diversification to prevent monotonous recommendations.

2. **Content-Based ML Similarity (scikit-learn)**:
   - Metadata feature union combining Title, Overview, Genres, Mood tags, Keywords, Director, and Cast.
   - Vectorized using `TfidfVectorizer` (sublinear TF scaling, English stopwords).
   - Real-time pairwise `cosine_similarity` matrix computed and cached in-memory.
   - Invalidation mechanism triggers auto-rebuild whenever an admin creates, edits, or deletes a movie.

3. **Deterministic Natural Language Query Parser**:
   - Understands queries like:
     - *"Mind-bending movies under 150 minutes"*
     - *"Highly rated Hindi drama movies"*
     - *"Thriller movies released after 2020"*
     - *"Movies similar to Inception"*
   - Extracts structured filters (genres, moods, languages, runtime constraints, rating floors, and reference movie titles) without relying on external LLM APIs.
   - Seamless fallback to title, director, cast, and keyword substring matching.

4. **Interactive Mood-Based Discovery**:
   - 10 distinct mood categories: *Feel-Good, Mind-Bending, Suspenseful, Emotional, Motivational, Scary, Relaxing, Adventure, Romantic, Family-Friendly*.
   - Filter by mood, genres, maximum duration, and minimum rating.

5. **User Personalization & Interactions**:
   - Personal Watchlist with real-time add/remove toggles.
   - 1 to 5-star ratings with optional written reviews.
   - Preference Learning: Rating a film 4.0★ or higher automatically adapts user profile preferences.
   - Active feedback tracking (`useful`, `not_interested`, `already_watched`).

6. **Full-Featured Admin Management Dashboard**:
   - Real-time aggregated database analytics (Recharts): Total movies, published/draft status, registered users, genre distribution, rating distribution, movie additions over time, and feedback counts.
   - Complete Movie CRUD with modal forms and validation.
   - Local poster uploads (`backend/uploads/posters/`) or remote poster URLs.
   - Bulk CSV movie importing with validation.
   - User account status management (active/inactive).
   - Immutable administrative audit activity logs.

7. **Authentication & Security**:
   - Secure password hashing using `bcrypt`.
   - Signed JSON Web Tokens (JWT) with bearer authorization.
   - Role-Based Access Control (RBAC) protecting all administrative endpoints.
   - SQL-injection-safe queries via SQLAlchemy 2.0 ORM.
   - Pydantic v2 data validation for all payloads.

---

## 🏛️ System Architecture

```
CineMatch-AI/
├── backend/
│   ├── app/
│   │   ├── core/              # Config, security (bcrypt & JWT), RBAC dependencies
│   │   ├── db/                # Database connection and idempotent schema initializer
│   │   ├── models/            # SQLAlchemy 2.0 database models (12 normalized tables)
│   │   ├── schemas/           # Pydantic v2 request & response schemas
│   │   ├── routers/           # FastAPI modular API routers:
│   │   │   ├── auth.py        # /api/auth (register, login, me)
│   │   │   ├── movies.py      # /api/movies (listing, details, CRUD)
│   │   │   ├── search.py      # /api/search (NLP parser + suggestions)
│   │   │   ├── recommendations.py # /api/recommendations (for-you, similar, feedback)
│   │   │   ├── watchlist.py   # /api/watchlist
│   │   │   ├── ratings.py     # /api/ratings
│   │   │   ├── preferences.py # /api/preferences
│   │   │   ├── history.py     # /api/history
│   │   │   └── admin.py       # /api/admin (stats, users, movies, audit, CSV import)
│   │   ├── services/          # Pure business logic services:
│   │   │   ├── recommendation_engine.py # Rule-based multi-criteria scoring
│   │   │   ├── content_similarity.py   # Scikit-learn TF-IDF & Cosine Similarity
│   │   │   ├── search_service.py       # Deterministic NLP query parser
│   │   │   ├── preference_service.py   # User preference learning
│   │   │   └── analytics_service.py    # Live SQL aggregation service
│   │   ├── seed/              # 55+ movie seed dataset & idempotent importer
│   │   └── tests/             # Pytest automated test suite (20 core tests)
│   ├── uploads/posters/       # Uploaded movie poster files
│   ├── bootstrap_admin.py     # Interactive CLI tool to create administrator
│   ├── requirements.txt       # Python dependencies
│   ├── .env.example           # Example backend configuration
│   └── cinematch.db           # Persistent SQLite database
│
├── frontend/
│   ├── src/
│   │   ├── api/client.js      # Unified Axios/Fetch API client
│   │   ├── components/        # Navbar, Footer, MovieCard, TrailerModal, AuthModal
│   │   ├── context/           # AuthContext (JWT management), ToastContext
│   │   ├── pages/             # Home, Discover, MovieDetail, ForYou, MoodFinder,
│   │   │                      # Watchlist, Profile, AdminDashboard
│   │   ├── App.jsx            # Hash-synchronized lightweight router
│   │   ├── main.jsx           # React root entrypoint
│   │   └── index.css          # Tailwind CSS design system tokens
│   ├── package.json           # Frontend dependencies
│   ├── tailwind.config.js     # Custom theme palette
│   └── vite.config.js         # Vite configuration with proxy
│
├── run_backend.bat            # Windows batch launcher for backend
├── run_frontend.bat           # Windows batch launcher for frontend
├── start_all.bat              # One-click launcher for both servers
├── verify_e2e.py              # End-to-end automated verification script (15 steps)
└── README.md
```

---

## 🗄️ Database Schema

The database uses SQLite stored at `backend/cinematch.db` with 12 relational models:

| Table | Description |
|---|---|
| `users` | User credentials, name, email, hashed password, role (`user`/`admin`), `is_active`, timestamps. |
| `movies` | Core metadata: title, slug, description, release_date, runtime, language, director, cast, poster_url, trailer_url, ratings, popularity, status (`published`/`draft`). |
| `genres` | Normalized genre catalogue (Action, Sci-Fi, Drama, Thriller, Comedy, etc.). |
| `movie_genres` | Foreign key junction table linking `movie_id` to `genre_id`. |
| `movie_moods` | Emotional mood tags mapped to movies (e.g. *Mind-Bending, Suspenseful, Feel-Good*). |
| `movie_keywords` | Descriptive plot tags for search indexing and content similarity. |
| `user_preferences` | User profile criteria: preferred genres, moods, languages, min rating, year span, max runtime. |
| `ratings` | User ratings (1.0 to 5.0 scale) and optional reviews (unique constraint on `user_id` + `movie_id`). |
| `watchlist_items` | Saved movie queue with duplicate prevention (unique constraint on `user_id` + `movie_id`). |
| `watch_history` | Audit log of viewed titles. |
| `recommendation_feedback` | Explicit user reactions: `useful`, `not_interested`, `already_watched`. |
| `admin_activity` | Immutable audit log recording administrative actions (`MOVIE_CREATE`, `MOVIE_UPDATE`, `CSV_IMPORT`, etc.). |

---

## ⚙️ Quick Start Guide (Windows 10/11)

### Prerequisites
- Python 3.10+ (Python 3.12 recommended)
- Node.js 18+ & npm
- PowerShell or Windows Command Prompt

### Step 1: Clone & Open
```powershell
cd c:\Users\RD\OneDrive\Desktop\AI-MiniProject
```

### Step 2: Backend Setup
```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
python -m pip install -r requirements.txt
copy .env.example .env
```

Initialize the database schema and seed the initial 55-movie catalogue:
```powershell
python -c "from app.db.init_db import init_db; from app.seed.seed_data import seed_movies; init_db(); seed_movies()"
```

Create the initial administrator account:
```powershell
python bootstrap_admin.py --email admin@cinematch.ai --name "System Admin" --password Admin@12345
```

Start the FastAPI backend:
```powershell
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```
Backend will be live at `http://127.0.0.1:8000`. Interactive Swagger API docs are available at `http://127.0.0.1:8000/docs`.

### Step 3: Frontend Setup
Open a second PowerShell window:
```powershell
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```
Frontend will be live at `http://127.0.0.1:5173`.

### Or Use the One-Click Launcher:
Simply double-click `start_all.bat` from the root directory to launch both servers in separate command windows.

---

## 🧪 Testing & Verification

### 1. Pytest Backend Suite (20 Tests)
Run the automated test suite against an isolated temporary SQLite database:
```powershell
cd backend
python -m pytest -v app/tests
```
**Results**:
- `test_database_initialization` — PASSED
- `test_user_registration` — PASSED
- `test_duplicate_email_rejection` — PASSED
- `test_login_success` — PASSED
- `test_login_failure` — PASSED
- `test_protected_endpoint_access` — PASSED
- `test_admin_only_access` — PASSED
- `test_movie_listing` — PASSED
- `test_movie_creation_by_admin` — PASSED
- `test_movie_creation_by_normal_user_rejected` — PASSED
- `test_movie_update_and_deletion` — PASSED
- `test_search_filters_and_nlp` — PASSED
- `test_recommendation_scoring` — PASSED
- `test_recommendation_score_boundaries` — PASSED
- `test_recommendation_explanation_correctness` — PASSED
- `test_similar_movie_ranking` — PASSED
- `test_watchlist_persistence` — PASSED
- `test_rating_creation_and_update` — PASSED
- `test_feedback_based_recommendation_filtering` — PASSED
- `test_csv_import_validation` — PASSED

### 2. Live End-to-End Integration Test (15 Scenarios)
With both servers running, execute the verification script:
```powershell
python verify_e2e.py
```
**Results**:
```
=========================================================
  CINEMATCH AI — END-TO-END DEMONSTRATION & VERIFICATION
=========================================================
[PASS] 1. Backend health check: OK
[PASS] 2. Movie Catalogue seeded (54 titles). Hero: 'The Shawshank Redemption'
[PASS] 3. NLP Search Query: 'Mind-bending movies under 150 minutes' -> Parsed Mood: ['Mind-Bending'], Max Runtime: 150m. Found 15 matches.
[PASS] 4. Multi-criteria Filter (Sci-Fi, Rating >= 8.0, English): Found 9 titles.
[PASS] 5. Movie Details & TF-IDF Cosine Similarity: Found 8 similar movies.
[PASS] 6. User Registration: Created demo user with JWT token.
[PASS] 7. User Preferences updated: Sci-Fi & Thriller, Mind-Bending mood.
[PASS] 8. Explainable 'For You' Recommendations: Top pick 'Inception' (85.0/100).
[PASS] 9. Watchlist: Successfully saved to personal queue.
[PASS] 10. Rating: Rated 5.0 ★ with review note.
[PASS] 11. Recommendation Feedback: Movie marked 'not_interested' suppressed.
[PASS] 12. Admin Dashboard Live Stats: 55 movies, 3 users, live aggregates.
[PASS] 13. Admin Movie Management: Created & published new movie in catalogue.
[PASS] 14. Admin CSV Bulk Import: Imported title via CSV file.
[PASS] 15. Admin Audit Trail: Verified audit log trail.
=========================================================
  ALL 15 END-TO-END DEMONSTRATION WORKFLOWS PASSED!
=========================================================
```

---

## 🎓 College Presentation Walkthrough (Demo Script)

1. **Home Page & Catalogue**:
   - Navigate to `http://127.0.0.1:5173`.
   - Highlight the dynamic Hero section (fetched live from SQLite), "Trending Movies", "Top Rated", and "Browse by Mood" carousels.
   - Click "Watch Trailer" on any card to see responsive YouTube trailer embeds.
2. **Deterministic Natural Language Search**:
   - In the top search bar, type: `Mind-bending movies under 150 minutes` or `Hindi drama`.
   - Demonstrate the parsed criteria tags rendered above the search results showing detected moods, runtime boundaries, or languages.
3. **Advanced Discovery & Filters**:
   - Navigate to **Discover**.
   - Combine genre filters (e.g. *Sci-Fi*), minimum rating sliders (e.g. `8.0+`), and sorting (by rating or release date).
4. **Personalized Recommendations ("For You")**:
   - Register or sign in with a user account.
   - Go to **Profile** and set favorite genres (*Sci-Fi, Thriller*) and preferred mood (*Mind-Bending*).
   - Navigate to **For You**: Observe the top recommendation (e.g., *Inception*, 85/100).
   - Point out the **Explainable AI Breakdown** explaining why the points were awarded.
   - Click **"Not for me"**: Notice how the movie is immediately suppressed from subsequent recommendations.
5. **Content-Based Similarity**:
   - Open any movie detail page (e.g. *Interstellar*).
   - Scroll down to the **"Similar Movies"** carousel: Explain that this is generated via scikit-learn TF-IDF vectorization and cosine similarity over plot overviews, genres, director, and keywords.
6. **Admin Dashboard & Analytics**:
   - Sign in as `admin@cinematch.ai` / `Admin@12345`.
   - Access the **Admin** panel via the navbar crown badge.
   - Review live Recharts visualizations: Movie breakdown by genre, user ratings distribution, and additions over time.
   - Add a new movie or edit an existing title.
   - Test bulk CSV upload using a sample CSV file.
   - Show the Admin Activity Audit Log showing timestamps and administrative actions.

---

## 🔒 Security & Data Integrity

- Passwords are encrypted with salted `bcrypt` hashes. Plaintext passwords are never saved or returned.
- Role-based authorization ensures normal users cannot access administrative endpoints (`403 Forbidden`).
- SQLite uses parameterized SQLAlchemy queries, immunizing the backend to SQL injection.
- User uploaded files are validated for size and MIME types (`image/jpeg`, `image/png`, `image/webp`).

---

## 👥 Authors & License

Developed as an Academic Mini-Project for AI & Full-Stack Engineering.
Available under the MIT License.
