import React, { useState, useEffect } from "react";
import { Bookmark, Search, Trash2, Star, Clock, ArrowRight, Film } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { MovieCard } from "../components/movies/MovieCard";

export const WatchlistPage = ({ navigate, openAuthModal }) => {
  const { isAuthenticated } = useAuth();
  const toast = useToast();

  const [watchlistItems, setWatchlistItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("date_added");

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    const fetchWatchlist = async () => {
      setLoading(true);
      try {
        const items = await api.watchlist.getAll();
        setWatchlistItems(items || []);
      } catch (err) {
        console.error("Failed to fetch watchlist:", err);
        toast.error("Could not load your watchlist.");
      } finally {
        setLoading(false);
      }
    };

    fetchWatchlist();
  }, [isAuthenticated]);

  const handleRemove = async (movieId, e) => {
    if (e) e.stopPropagation();
    try {
      await api.watchlist.remove(movieId);
      setWatchlistItems((prev) => prev.filter((item) => item.movie_id !== movieId));
      toast.info("Movie removed from watchlist.");
    } catch (err) {
      toast.error(err.message || "Failed to remove item.");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center mx-auto text-secondary shadow-glow-cyan">
          <Bookmark className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-white">Your Watchlist Awaits</h2>
        <p className="text-sm text-muted-text">
          Sign in to your CineMatch AI account to save movies you want to watch and keep track of your queue across devices.
        </p>
        <button
          onClick={() => openAuthModal("login")}
          className="px-6 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm shadow-glow-violet transition-all"
        >
          Sign In
        </button>
      </div>
    );
  }

  // Filter and Sort
  const filteredItems = watchlistItems
    .filter((item) => {
      const title = item.movie?.title?.toLowerCase() || "";
      return title.includes(searchQuery.toLowerCase().trim());
    })
    .sort((a, b) => {
      if (sortBy === "title") {
        return (a.movie?.title || "").localeCompare(b.movie?.title || "");
      }
      if (sortBy === "rating") {
        return (b.movie?.external_rating || 0) - (a.movie?.external_rating || 0);
      }
      // default: date added descending
      return new Date(b.created_at) - new Date(a.created_at);
    });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-secondary uppercase tracking-wider mb-1">
            <Bookmark className="w-3.5 h-3.5 fill-current" /> Personal Cinema Vault
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            My Watchlist
          </h1>
          <p className="text-sm text-muted-text mt-1">
            {watchlistItems.length} {watchlistItems.length === 1 ? "movie" : "movies"} saved to watch later.
          </p>
        </div>

        {/* Search & Sort inside Watchlist */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-text" />
            <input
              type="text"
              placeholder="Search in watchlist..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-surface border border-border text-xs rounded-xl pl-9 pr-3 py-2 text-white placeholder-muted-text focus:outline-none focus:border-primary"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-surface border border-border text-xs text-white rounded-xl px-3 py-2 focus:outline-none"
          >
            <option value="date_added">Recently Added</option>
            <option value="rating">Highest Rated</option>
            <option value="title">Title (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] rounded-2xl skeleton-shimmer" />
          ))}
        </div>
      ) : filteredItems.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {filteredItems.map((item) => (
            <div key={item.id} className="relative group">
              <MovieCard
                movie={item.movie}
                onClick={() => navigate("movie", { id: item.movie.id })}
                onWatchlistChange={(mId, isIn) => {
                  if (!isIn) {
                    setWatchlistItems((prev) => prev.filter((i) => i.movie_id !== mId));
                  }
                }}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="p-16 text-center rounded-2xl bg-surface border border-border space-y-4 max-w-lg mx-auto">
          <Film className="w-12 h-12 text-muted-text/50 mx-auto" />
          <h3 className="text-xl font-bold text-white">Your Watchlist is Empty</h3>
          <p className="text-sm text-muted-text">
            Browse our catalogue or check your personalized recommendation feed to save titles you want to watch.
          </p>
          <button
            onClick={() => navigate("discover")}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm shadow-glow-violet transition-colors"
          >
            Explore Movies <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

    </div>
  );
};
