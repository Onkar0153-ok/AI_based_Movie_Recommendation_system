import React, { useState, useEffect } from "react";
import { 
  Search, SlidersHorizontal, RotateCcw, Sparkles, Filter, 
  ChevronLeft, ChevronRight, X, Film, Check 
} from "lucide-react";
import { api } from "../api/client";
import { MovieCard } from "../components/movies/MovieCard";

export const DiscoverPage = ({ navigate, initialQuery = "" }) => {
  const [movies, setMovies] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [activeSearch, setActiveSearch] = useState(initialQuery);
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [selectedMood, setSelectedMood] = useState("All");
  const [selectedLanguage, setSelectedLanguage] = useState("All");
  const [minRating, setMinRating] = useState(0);
  const [maxRuntime, setMaxRuntime] = useState(240);
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const [sortBy, setSortBy] = useState("popularity");
  const [sortOrder, setSortOrder] = useState("desc");

  const [parsedFilters, setParsedFilters] = useState(null);
  const [genresList, setGenresList] = useState([]);
  const [moodsList, setMoodsList] = useState([]);

  // Fetch genres & moods on mount
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [gRes, mRes] = await Promise.all([
          api.recommendations.getGenres(),
          api.recommendations.getMoods()
        ]);
        setGenresList(gRes || []);
        setMoodsList(mRes || []);
      } catch (err) {
        console.error("Failed to fetch genres/moods:", err);
      }
    };
    fetchMetadata();
  }, []);

  // Fetch movies whenever filters or page changes
  useEffect(() => {
    const fetchFilteredMovies = async () => {
      setLoading(true);
      try {
        const params = {
          page,
          page_size: 18,
          sort_by: sortBy,
          sort_order: sortOrder,
        };

        if (activeSearch.trim()) params.q = activeSearch.trim();
        if (selectedGenre !== "All") params.genre = selectedGenre;
        if (selectedMood !== "All") params.mood = selectedMood;
        if (selectedLanguage !== "All") params.language = selectedLanguage;
        if (minRating > 0) params.min_rating = minRating;
        if (maxRuntime < 240) params.max_runtime = maxRuntime;
        if (yearFrom) params.year_from = parseInt(yearFrom);
        if (yearTo) params.year_to = parseInt(yearTo);

        let res;
        if (activeSearch.trim()) {
          res = await api.search.query(params);
          setParsedFilters(res.parsed_filters);
        } else {
          res = await api.movies.getAll(params);
          setParsedFilters(null);
        }

        setMovies(res.items || []);
        setTotal(res.total || 0);
        setTotalPages(res.total_pages || 1);
      } catch (err) {
        console.error("Search fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFilteredMovies();
  }, [
    page, activeSearch, selectedGenre, selectedMood, 
    selectedLanguage, minRating, maxRuntime, yearFrom, yearTo, sortBy, sortOrder
  ]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    setActiveSearch(searchQuery);
  };

  const handleQuickPrompt = (promptText) => {
    setSearchQuery(promptText);
    setActiveSearch(promptText);
    setPage(1);
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setActiveSearch("");
    setSelectedGenre("All");
    setSelectedMood("All");
    setSelectedLanguage("All");
    setMinRating(0);
    setMaxRuntime(240);
    setYearFrom("");
    setYearTo("");
    setSortBy("popularity");
    setSortOrder("desc");
    setPage(1);
    setParsedFilters(null);
  };

  const quickPrompts = [
    "Thriller movies released after 2015",
    "Mind-bending movies under 140 mins",
    "Highly rated Hindi movies",
    "Movies similar to Inception",
    "Feel-good family comedy",
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Page Header */}
      <div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Discover Movies
        </h1>
        <p className="text-sm text-muted-text mt-1.5 max-w-2xl">
          Search with natural phrasing or combine precise filters for genre, mood, rating, runtime, and release eras.
        </p>
      </div>

      {/* Natural Language Search Input Box */}
      <div className="p-4 sm:p-6 rounded-2xl bg-surface border border-border shadow-card space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-text" />
            <input
              type="text"
              placeholder="Type natural query e.g. 'Mind-bending sci-fi movies after 2010' or movie title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-elevated border border-border text-white text-sm rounded-xl pl-12 pr-4 py-3 placeholder-muted-text focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-hover hover:from-primary-hover hover:to-primary text-white font-semibold text-sm shadow-glow-violet transition-all shrink-0"
          >
            Search
          </button>
        </form>

        {/* Quick Prompts Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-text">
          <span className="flex items-center gap-1 font-semibold text-secondary">
            <Sparkles className="w-3.5 h-3.5 text-secondary" /> Try asking:
          </span>
          {quickPrompts.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleQuickPrompt(prompt)}
              className="px-2.5 py-1 rounded-lg bg-surface-elevated hover:bg-primary/20 hover:text-white border border-border/80 text-slate-300 transition-colors"
            >
              "{prompt}"
            </button>
          ))}
        </div>

        {/* Interpreted Natural Language Badges */}
        {parsedFilters && (
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/30 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold text-secondary uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-secondary" /> Interpreted Intent:
            </span>
            {parsedFilters.genres?.map((g, i) => (
              <span key={i} className="px-2 py-0.5 rounded bg-surface border border-border text-white">
                Genre: <strong>{g}</strong>
              </span>
            ))}
            {parsedFilters.moods?.map((m, i) => (
              <span key={i} className="px-2 py-0.5 rounded bg-surface border border-border text-white">
                Mood: <strong>{m}</strong>
              </span>
            ))}
            {parsedFilters.languages?.map((l, i) => (
              <span key={i} className="px-2 py-0.5 rounded bg-surface border border-border text-white">
                Language: <strong>{l}</strong>
              </span>
            ))}
            {parsedFilters.year_from && (
              <span className="px-2 py-0.5 rounded bg-surface border border-border text-white">
                Year &ge; <strong>{parsedFilters.year_from}</strong>
              </span>
            )}
            {parsedFilters.year_to && (
              <span className="px-2 py-0.5 rounded bg-surface border border-border text-white">
                Year &le; <strong>{parsedFilters.year_to}</strong>
              </span>
            )}
            {parsedFilters.min_rating && (
              <span className="px-2 py-0.5 rounded bg-surface border border-border text-white">
                Rating &ge; <strong>{parsedFilters.min_rating}</strong>
              </span>
            )}
            {parsedFilters.max_runtime && (
              <span className="px-2 py-0.5 rounded bg-surface border border-border text-white">
                Runtime &le; <strong>{parsedFilters.max_runtime}m</strong>
              </span>
            )}
            {parsedFilters.referenced_title && (
              <span className="px-2 py-0.5 rounded bg-surface border border-border text-white">
                Similar to: <strong>{parsedFilters.referenced_title}</strong>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Filter Control Bar */}
      <div className="p-6 rounded-2xl bg-surface border border-border shadow-card space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <SlidersHorizontal className="w-4 h-4 text-primary" /> Filter Options
          </div>
          <button
            onClick={clearAllFilters}
            className="text-xs font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Clear All
          </button>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Genre Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-muted-text uppercase tracking-wider mb-1.5">
              Genre
            </label>
            <select
              value={selectedGenre}
              onChange={(e) => { setSelectedGenre(e.target.value); setPage(1); }}
              className="w-full bg-surface-elevated border border-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
            >
              <option value="All">All Genres</option>
              {genresList.map((g) => (
                <option key={g.id} value={g.name}>{g.name}</option>
              ))}
            </select>
          </div>

          {/* Mood Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-muted-text uppercase tracking-wider mb-1.5">
              Mood
            </label>
            <select
              value={selectedMood}
              onChange={(e) => { setSelectedMood(e.target.value); setPage(1); }}
              className="w-full bg-surface-elevated border border-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
            >
              <option value="All">All Moods</option>
              {moodsList.map((m, idx) => (
                <option key={idx} value={m.mood}>{m.mood} ({m.count})</option>
              ))}
            </select>
          </div>

          {/* Language Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-muted-text uppercase tracking-wider mb-1.5">
              Language
            </label>
            <select
              value={selectedLanguage}
              onChange={(e) => { setSelectedLanguage(e.target.value); setPage(1); }}
              className="w-full bg-surface-elevated border border-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
            >
              <option value="All">All Languages</option>
              <option value="English">English</option>
              <option value="Hindi">Hindi</option>
              <option value="Korean">Korean</option>
              <option value="Japanese">Japanese</option>
              <option value="Spanish">Spanish</option>
              <option value="French">French</option>
              <option value="Kannada">Kannada</option>
              <option value="Telugu">Telugu</option>
              <option value="Bengali">Bengali</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-xs font-semibold text-muted-text uppercase tracking-wider mb-1.5">
              Sort By
            </label>
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                className="w-full bg-surface-elevated border border-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
              >
                <option value="popularity">Popularity</option>
                <option value="rating">Rating</option>
                <option value="release_date">Release Date</option>
                <option value="title">Title (A-Z)</option>
              </select>
              <button
                type="button"
                onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
                className="px-3 py-2 bg-surface-elevated border border-border rounded-xl text-xs font-bold text-secondary uppercase hover:bg-surface transition-colors"
                title={`Order: ${sortOrder.toUpperCase()}`}
              >
                {sortOrder}
              </button>
            </div>
          </div>

        </div>

        {/* Sliders: Min Rating & Max Runtime */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 border-t border-border/60">
          
          <div>
            <div className="flex justify-between text-xs font-semibold text-muted-text uppercase mb-1.5">
              <span>Minimum Rating</span>
              <span className="text-amber-400 font-bold">{minRating > 0 ? `${minRating.toFixed(1)}+` : "Any"}</span>
            </div>
            <input
              type="range"
              min="0"
              max="9"
              step="0.5"
              value={minRating}
              onChange={(e) => { setMinRating(parseFloat(e.target.value)); setPage(1); }}
              className="w-full h-1.5 bg-surface-elevated rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold text-muted-text uppercase mb-1.5">
              <span>Max Runtime</span>
              <span className="text-secondary font-bold">{maxRuntime < 240 ? `${maxRuntime}m` : "Any"}</span>
            </div>
            <input
              type="range"
              min="80"
              max="240"
              step="10"
              value={maxRuntime}
              onChange={(e) => { setMaxRuntime(parseInt(e.target.value)); setPage(1); }}
              className="w-full h-1.5 bg-surface-elevated rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div>
            <div className="text-xs font-semibold text-muted-text uppercase mb-1.5">
              Release Era (Years)
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="From (1970)"
                value={yearFrom}
                onChange={(e) => { setYearFrom(e.target.value); setPage(1); }}
                className="w-1/2 bg-surface-elevated border border-border rounded-xl px-3 py-1.5 text-xs text-white placeholder-muted-text"
              />
              <span className="text-muted-text text-xs">—</span>
              <input
                type="number"
                placeholder="To (2025)"
                value={yearTo}
                onChange={(e) => { setYearTo(e.target.value); setPage(1); }}
                className="w-1/2 bg-surface-elevated border border-border rounded-xl px-3 py-1.5 text-xs text-white placeholder-muted-text"
              />
            </div>
          </div>

        </div>
      </div>

      {/* Result Status Header */}
      <div className="flex items-center justify-between text-sm text-muted-text">
        <span>
          Showing <strong className="text-white">{movies.length}</strong> of <strong className="text-white">{total}</strong> movies
        </span>
        {total > 0 && (
          <span>Page {page} of {totalPages}</span>
        )}
      </div>

      {/* Movie Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] rounded-2xl skeleton-shimmer" />
          ))}
        </div>
      ) : movies.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6">
          {movies.map((movie) => (
            <MovieCard
              key={movie.id}
              movie={movie}
              onClick={() => navigate("movie", { id: movie.id })}
            />
          ))}
        </div>
      ) : (
        <div className="p-16 text-center rounded-2xl bg-surface border border-border space-y-4">
          <Film className="w-12 h-12 text-muted-text/50 mx-auto" />
          <h3 className="text-xl font-bold text-white">No Movies Match Your Criteria</h3>
          <p className="text-sm text-muted-text max-w-md mx-auto">
            We couldn't find any titles matching the selected filters. Try broadening your rating threshold or clearing query terms.
          </p>
          <button
            onClick={clearAllFilters}
            className="px-6 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm shadow-glow-violet transition-colors"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-6">
          <button
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            disabled={page === 1}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface border border-border text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-elevated transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>
          <span className="text-sm text-muted-text px-2">
            Page <strong className="text-white">{page}</strong> of <strong className="text-white">{totalPages}</strong>
          </span>
          <button
            onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
            disabled={page === totalPages}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface border border-border text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-elevated transition-colors"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

    </div>
  );
};
