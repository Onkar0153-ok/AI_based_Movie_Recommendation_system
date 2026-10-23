# CineMatch AI — Backend Documentation

FastAPI-powered REST backend for **CineMatch AI**, featuring SQLAlchemy 2.0 ORM, SQLite database, Pydantic v2 schemas, JWT authentication, a rule-based explainable recommendation engine, and scikit-learn TF-IDF content similarity.

---

## 🏗️ Directory Layout

```
backend/
├── app/
│   ├── main.py                  # FastAPI application entrypoint and lifespan handlers
│   ├── core/
│   │   ├── config.py            # App settings (Pydantic BaseSettings) & recommendation weights
│   │   ├── security.py          # Direct bcrypt password hashing and JWT encode/decode
│   │   └── dependencies.py      # FastAPI Depends: get_current_user, get_current_admin
│   ├── db/
│   │   ├── database.py          # SQLAlchemy 2.0 engine, declarative base, get_db session
│   │   └── init_db.py           # Idempotent table creator
│   ├── models/
│   │   └── models.py            # 12 SQLAlchemy ORM models with relations and indexes
│   ├── schemas/
│   │   └── schemas.py           # Pydantic v2 request/response schemas
│   ├── routers/
│   │   ├── auth.py              # User registration, login, profile (/api/auth)
│   │   ├── movies.py            # Public movie listing, details, CRUD (/api/movies)
│   │   ├── search.py            # NLP search and autocomplete suggestions (/api/search)
│   │   ├── recommendations.py   # For You, similar movies, feedback (/api/recommendations)
│   │   ├── watchlist.py         # Personal watchlist management (/api/watchlist)
│   │   ├── ratings.py           # Star ratings and reviews (/api/ratings)
│   │   ├── preferences.py       # User discovery preferences (/api/preferences)
│   │   ├── history.py           # Movie viewing history (/api/history)
│   │   └── admin.py             # Admin analytics, user status, audit trail, CSV import (/api/admin)
│   ├── services/
│   │   ├── recommendation_engine.py  # Rule-based scoring with explainable reasons
│   │   ├── content_similarity.py    # TF-IDF + Cosine Similarity service with caching
│   │   ├── search_service.py        # Deterministic NLP query parser
│   │   ├── preference_service.py    # Preference learning from ratings
│   │   └── analytics_service.py     # Live SQL aggregation service
│   ├── seed/
│   │   ├── seed_movies.json     # 55+ structured movies dataset
│   │   └── seed_data.py         # Idempotent seed script
│   └── tests/
│       ├── conftest.py          # Pytest fixtures with isolated test SQLite database
│       └── test_cinematch.py    # 20 required automated tests
├── uploads/posters/             # Local movie poster upload directory
├── bootstrap_admin.py           # CLI tool to create admin user
├── cinematch.db                 # Production/local SQLite database file
├── requirements.txt             # Pip dependency list
└── .env.example                 # Environment variable template
```

---

## ⚙️ Environment Configuration

Copy `.env.example` to `.env`:
```ini
PROJECT_NAME="CineMatch AI"
DATABASE_URL="sqlite:///./cinematch.db"
SECRET_KEY="cinematch-super-secret-production-grade-jwt-key"
ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=1440
ALLOWED_ORIGINS="http://localhost:5173,http://127.0.0.1:5173"
UPLOAD_DIR="./uploads/posters"
MAX_UPLOAD_SIZE_MB=5
```

---

## 🧮 Recommendation Algorithm Details

The **Rule-Based Recommendation Engine** computes an explainable compatibility score out of 100 points for each published movie:

$$Score = S_{genre} + S_{mood} + S_{rating} + S_{year} + S_{runtime} + S_{similarity}$$

### Scoring Components:

1. **Genre Match ($S_{genre}$, max 30 pts)**:
   - Evaluates intersection between movie genres and user's preferred genres.
   - Proportional to match count, capped at 30 points.
2. **Mood Match ($S_{mood}$, max 20 pts)**:
   - Matches movie mood tags against user's target moods.
   - 20 points awarded for full match, 10 for partial match.
3. **Rating Threshold ($S_{rating}$, max 15 pts)**:
   - If movie's external rating $\ge$ user's minimum rating threshold: full 15 pts awarded.
   - Graded penalty if lower: $\max(0, 15 - (\text{min\_rating} - \text{rating}) \times 7.5)$.
4. **Release Era ($S_{year}$, max 10 pts)**:
   - Full 10 pts if the movie release year falls within the user's preferred year range $[Y_{from}, Y_{to}]$.
   - Graded penalty for years outside the window: $\max(0, 10 - \Delta_{years} \times 2)$.
5. **Runtime Constraint ($S_{runtime}$, max 10 pts)**:
   - Full 10 pts if movie runtime $\le$ user's maximum acceptable runtime.
   - Graded penalty for exceeding runtime: $\max(0, 10 - \Delta_{minutes} \times 0.2)$.
6. **Positively Rated Similarity ($S_{similarity}$, max 15 pts)**:
   - Computes maximum TF-IDF cosine similarity between the candidate movie and movies the user rated $\ge 4.0\star$.
   - Contribution: $\min(15.0, \text{similarity} \times 15.0)$.

### Ranking & Filtering Rules:
- Unpublished (draft) movies are strictly excluded.
- Movies previously watched or marked `not_interested` via recommendation feedback are suppressed.
- Final recommendations undergo **greedy genre diversification**: At most 3 movies of the same primary genre are permitted in the top 10 results.

---

## 🤖 Content-Based Machine Learning (TF-IDF + Cosine Similarity)

- Feature construction combines `title`, `overview`, `genres`, `moods`, `keywords`, `director`, and `cast`.
- Vectorized using `sklearn.feature_extraction.text.TfidfVectorizer(stop_words='english', sublinear_tf=True)`.
- Real-time pairwise cosine similarity matrix is calculated and cached in memory.
- Invalidation: Calling `invalidate_cache()` automatically triggers recalculation when movies are added, updated, or removed by an administrator.

---

## 🔍 Deterministic NLP Search Parser

The search service inspects incoming search strings and deterministically extracts:
- **Mood**: Matches against predefined mood vocabulary (*Mind-Bending, Suspenseful, Feel-Good, etc.*).
- **Genre**: Matches known genre names (*Sci-Fi, Action, Thriller, etc.*).
- **Language**: Recognizes language queries (*Hindi, English, Spanish, Japanese, etc.*).
- **Runtime**: Regex patterns matching *under X minutes*, *less than X min*, etc.
- **Rating**: Regex patterns matching *rated above X*, *X+ stars*, *highly rated*.
- **Release Era**: Regex patterns matching *released after YYYY*, *between YYYY and YYYY*, *in the 90s*.
- **Reference Movies**: Recognizes *movies similar to <Title>*.

If no structured criteria are matched, the service transparently queries titles, director, cast, and keyword substrings using SQL `LIKE`.

---

## 🧪 Running Pytest Tests

```powershell
python -m pytest -v app/tests
```
All 20 tests execute against an in-memory or temporary SQLite database (`test_cinematch.db`) without altering development data.
