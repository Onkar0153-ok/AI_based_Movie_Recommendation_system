import React, { useState } from "react";
import { Star, Clock, Bookmark, Film, Sparkles } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { api } from "../../api/client";

export const MovieCard = ({ movie, matchScore, explanation, onClick, onWatchlistChange }) => {
  const { isAuthenticated } = useAuth();
  const toast = useToast();
  const [inWatchlist, setInWatchlist] = useState(movie.is_in_watchlist || false);
  const [isToggling, setIsToggling] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleWatchlistToggle = async (e) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.info("Please sign in to save movies to your watchlist.");
      return;
    }

    setIsToggling(true);
    try {
      if (inWatchlist) {
        await api.watchlist.remove(movie.id);
        setInWatchlist(false);
        toast.info(`Removed "${movie.title}" from watchlist.`);
        if (onWatchlistChange) onWatchlistChange(movie.id, false);
      } else {
        await api.watchlist.add(movie.id);
        setInWatchlist(true);
        toast.success(`Saved "${movie.title}" to watchlist!`);
        if (onWatchlistChange) onWatchlistChange(movie.id, true);
      }
    } catch (err) {
      toast.error(err.message || "Failed to update watchlist.");
    } finally {
      setIsToggling(false);
    }
  };

  const releaseYear = movie.release_date ? movie.release_date.slice(0, 4) : "";
  const genresList = movie.genres?.map((g) => (typeof g === "string" ? g : g.name)) || [];

  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col bg-surface rounded-2xl overflow-hidden border border-border hover:border-primary/60 transition-all duration-300 hover:shadow-card hover:-translate-y-1.5 cursor-pointer"
    >
      {/* Poster Media Box */}
      <div className="relative aspect-[2/3] w-full bg-surface-elevated overflow-hidden">
        {movie.poster_url && !imgError ? (
          <img
            src={movie.poster_url}
            alt={movie.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-surface to-surface-elevated">
            <Film className="w-12 h-12 text-muted-text/40 mb-3" />
            <span className="text-sm font-semibold text-slate-300 line-clamp-2">{movie.title}</span>
            <span className="text-xs text-muted-text mt-1">{releaseYear}</span>
          </div>
        )}

        {/* Gradient Overlay for badges */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-black/40 opacity-80 group-hover:opacity-60 transition-opacity" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          {/* Match Score Badge (if passed) */}
          {matchScore !== undefined ? (
            <div className="pointer-events-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-primary/90 text-white shadow-glow-violet backdrop-blur-md border border-white/20">
              <Sparkles className="w-3 h-3 text-secondary" />
              <span>{Math.round(matchScore)}% Match</span>
            </div>
          ) : movie.external_rating ? (
            <div className="pointer-events-auto flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-black/60 backdrop-blur-md text-amber-400 border border-amber-400/20">
              <Star className="w-3.5 h-3.5 fill-amber-400" />
              <span>{movie.external_rating.toFixed(1)}</span>
            </div>
          ) : <div />}

          {/* Quick Bookmark Button */}
          <button
            onClick={handleWatchlistToggle}
            disabled={isToggling}
            className={`pointer-events-auto w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              inWatchlist
                ? "bg-secondary text-background shadow-glow-cyan"
                : "bg-black/60 text-white hover:bg-primary hover:text-white backdrop-blur-md border border-white/20"
            }`}
            title={inWatchlist ? "Remove from watchlist" : "Add to watchlist"}
          >
            <Bookmark className={`w-4 h-4 ${inWatchlist ? "fill-current" : ""}`} />
          </button>
        </div>

        {/* Bottom Poster Metadata */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-slate-300">
          {releaseYear && <span>{releaseYear}</span>}
          {movie.runtime_minutes && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-muted-text" />
              {movie.runtime_minutes}m
            </span>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 flex flex-col flex-1 justify-between gap-2">
        <div>
          {/* Genre chips */}
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {genresList.slice(0, 2).map((genre, idx) => (
              <span
                key={idx}
                className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-surface-elevated text-secondary/90 border border-border"
              >
                {genre}
              </span>
            ))}
          </div>

          {/* Title */}
          <h3 className="font-semibold text-white group-hover:text-secondary text-sm leading-snug line-clamp-1 transition-colors">
            {movie.title}
          </h3>

          {/* Short description */}
          <p className="text-xs text-muted-text line-clamp-2 mt-1 leading-relaxed">
            {movie.description}
          </p>
        </div>

        {/* Explainable Recommendation Note if present */}
        {explanation && (
          <div className="mt-2 pt-2 border-t border-border/60">
            <p className="text-[11px] text-violet-300 line-clamp-1 italic flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5 shrink-0 text-secondary" />
              {explanation}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
