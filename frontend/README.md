# CineMatch AI — Frontend Documentation

The user interface for **CineMatch AI** is a responsive single-page web application built with React 19, Vite, Tailwind CSS, Recharts, and Lucide React.

---

## 🎨 Design System & Visual Palette

The visual design is inspired by premium modern streaming platforms (HBO Max, Apple TV+, Letterboxd):

| Token | Hex Value | Semantic Purpose |
|---|---|---|
| **Background** | `#080B14` | Deep midnight canvas |
| **Surface** | `#101626` | Card background, input fields |
| **Elevated Surface** | `#171F32` | Dropdowns, modals, elevated controls |
| **Primary Accent** | `#8B5CF6` | Electric violet (buttons, active tabs, scores) |
| **Secondary Accent** | `#22D3EE` | Bright cyan (mood tags, badges, subtitles) |
| **Primary Text** | `#F8FAFC` | High-contrast readable headings & labels |
| **Muted Text** | `#A5B0C5` | Subtle descriptions and secondary metadata |
| **Border** | `#293249` | Crisp borders and dividers |

---

## 🧩 Component Architecture

```
frontend/src/
├── api/
│   └── client.js             # API wrapper handling JWT tokens, base URL, error parsing
├── components/
│   ├── AuthModal.jsx         # Accessible login / registration modal with tabs
│   ├── Footer.jsx            # Project footer with attribution and links
│   ├── MovieCard.jsx         # Card component with poster fallback, ratings, watchlist button
│   ├── Navbar.jsx            # Top navigation bar with debounced global search & live autocomplete
│   └── TrailerModal.jsx      # Responsive YouTube iframe modal for movie trailers
├── context/
│   ├── AuthContext.jsx       # User authentication state (JWT stored in localStorage)
│   └── ToastContext.jsx      # Global transient toast notification provider
├── pages/
│   ├── AdminPage.jsx         # Admin dashboard with Recharts, Movie CRUD, CSV import, audit logs
│   ├── DiscoverPage.jsx      # Advanced discovery filters, search, sorting, pagination
│   ├── ForYouPage.jsx        # Personalized recommendations with explainable score breakdowns
│   ├── HomePage.jsx          # Cinematic hero, trending, top rated, and mood carousels
│   ├── MoodFinderPage.jsx    # Interactive emotional mood exploration screen
│   ├── MovieDetailPage.jsx  # Detailed overview, cast, trailer, ratings, and similar movies
│   ├── ProfilePage.jsx       # User preferences (genres, moods, ratings) & watchlist stats
│   └── WatchlistPage.jsx     # Personal queue management with search and sorting
├── App.jsx                   # Lightweight hash router (#/, #/discover, #/for-you, #/admin)
├── index.css                 # Tailwind directives, custom scrollbars, glassmorphism utilities
└── main.jsx                  # React application root mounting Auth and Toast providers
```

---

## 🧭 Hash-Based Routing

The application uses an efficient URL hash router that provides:
- Native browser back and forward button support.
- Direct bookmarking and link sharing without requiring complex server-side fallback rules (`/index.html`).
- Synchronized query parameters (e.g. `#/discover?genre=Sci-Fi` or `#/movie/1`).

### Supported Routes:
- `#/`: Home page with hero feature and carousels.
- `#/discover`: Comprehensive filter and search catalogue.
- `#/for-you`: Personalized recommendations with explainability.
- `#/moods`: Mood-based interactive film exploration.
- `#/watchlist`: User saved queue.
- `#/movie/:id`: Detailed movie information and similar titles.
- `#/profile`: Discovery preferences and account management.
- `#/admin`: Administrator dashboard and movie catalogue management.

---

## 📊 Analytics & Data Visualizations (Recharts)

The Admin panel utilizes **Recharts** to render live aggregated metrics:
- **Genre Distribution**: BarChart illustrating movie distribution across genres.
- **Rating Score Spread**: AreaChart displaying the distribution of movie ratings.
- **Additions Over Time**: LineChart tracking the growth of the catalogue.
- **Feedback Metrics**: Responsive cards displaying user reactions (`useful`, `not_interested`, `already_watched`).

---

## 🛠️ Development & Production Build

### Running Locally
```powershell
npm run dev -- --host 127.0.0.1 --port 5173
```

### Production Build
```powershell
npm run build
```
Generates an optimized, tree-shaken static bundle in `frontend/dist/`.
