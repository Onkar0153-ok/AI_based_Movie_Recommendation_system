import React, { useState, useEffect } from "react";
import { 
  Sparkles, RefreshCw, ThumbsUp, EyeOff, Check, 
  HelpCircle, Sliders, ChevronDown, ChevronUp, Star, Film 
} from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { MovieCard } from "../components/movies/MovieCard";

export const ForYouPage = ({ navigate, openAuthModal }) => {
  const { isAuthenticated, user } = useAuth();
  const toast = useToast();

  const [recommendations, setRecommendations] = useState([]);
  const [strategy, setStrategy] = useState("personalized_hybrid");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedBreakdown, setExpandedBreakdown] = useState({});

  const fetchRecommendations = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await api.recommendations.getForYou(18, true);
      setRecommendations(res.recommendations || []);
      setStrategy(res.strategy || "personalized_hybrid");
      if (isManualRefresh) {
        toast.success("Recommendations refreshed with your latest taste signals!");
      }
    } catch (err) {
      console.error("Failed to load recommendations:", err);
      toast.error("Could not fetch recommendations.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, [isAuthenticated]);

  const handleFeedback = async (movieId, type, movieTitle) => {
    if (!isAuthenticated) {
      toast.info("Please sign in to submit recommendation feedback.");
      return;
    }
    try {
      await api.recommendations.submitFeedback(movieId, type);
      if (type === "not_interested") {
        toast.info(`We won't recommend "${movieTitle}" again.`);
        // Remove immediately from current view
        setRecommendations((prev) => prev.filter((r) => r.movie.id !== movieId));
      } else if (type === "already_watched") {
        toast.success(`Marked "${movieTitle}" as already watched.`);
        setRecommendations((prev) => prev.filter((r) => r.movie.id !== movieId));
      } else {
        toast.success(`Marked recommendation as useful!`);
      }
    } catch (err) {
      toast.error(err.message || "Feedback could not be recorded.");
    }
  };

  const toggleBreakdown = (movieId) => {
    setExpandedBreakdown((prev) => ({
      ...prev,
      [movieId]: !prev[movieId],
    }));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-secondary uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5 text-secondary" /> Intelligent Scoring Engine
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Picked For You
          </h1>
          <p className="text-sm text-muted-text mt-1.5 max-w-2xl">
            Ranked by our transparent weighted recommendation algorithm using your genre tastes, mood targets, and high ratings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("profile")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface border border-border hover:bg-surface-elevated text-xs font-semibold text-white transition-colors"
          >
            <Sliders className="w-4 h-4 text-primary" /> Tune Taste
          </button>
          <button
            onClick={() => fetchRecommendations(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-hover text-white text-xs font-semibold shadow-glow-violet transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Unauthenticated / Cold Start Prompt */}
      {!isAuthenticated && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-primary/20 via-surface to-secondary/10 border border-primary/40 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="text-base font-bold text-white flex items-center justify-center sm:justify-start gap-2">
              <Sparkles className="w-4 h-4 text-secondary" /> Enhance Your Recommendations
            </h3>
            <p className="text-xs text-muted-text max-w-xl">
              Sign in to rate films, customize favorite genres, and get transparent score breakdowns tailored specifically to you.
            </p>
          </div>
          <button
            onClick={() => openAuthModal("register")}
            className="px-6 py-2.5 rounded-xl bg-secondary text-background font-bold text-xs uppercase tracking-wider shadow-glow-cyan shrink-0 hover:bg-cyan-300 transition-colors"
          >
            Sign Up Now
          </button>
        </div>
      )}

      {/* Recommendations Feed */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 rounded-2xl skeleton-shimmer" />
          ))}
        </div>
      ) : recommendations.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recommendations.map((item) => {
            const movie = item.movie;
            const isExpanded = !!expandedBreakdown[movie.id];
            const scoreColor =
              item.match_score >= 80
                ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
                : item.match_score >= 60
                ? "text-primary bg-primary/10 border-primary/30"
                : "text-secondary bg-secondary/10 border-secondary/30";

            return (
              <div
                key={movie.id}
                className="flex flex-col justify-between p-5 rounded-2xl bg-surface border border-border shadow-card hover:border-primary/50 transition-all space-y-4"
              >
                {/* Movie Header Card */}
                <div 
                  onClick={() => navigate("movie", { id: movie.id })}
                  className="flex gap-4 cursor-pointer group"
                >
                  <div className="w-20 h-28 rounded-xl overflow-hidden bg-surface-elevated shrink-0 border border-border">
                    {movie.poster_url ? (
                      <img
                        src={movie.poster_url}
                        alt={movie.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-text">
                        <Film className="w-6 h-6" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${scoreColor}`}>
                        {Math.round(item.match_score)}% Match
                      </span>
                      {movie.external_rating && (
                        <span className="flex items-center gap-1 text-xs text-amber-400 font-bold">
                          <Star className="w-3.5 h-3.5 fill-amber-400" />
                          {movie.external_rating.toFixed(1)}
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-white text-base truncate group-hover:text-secondary transition-colors">
                      {movie.title}
                    </h3>
                    <p className="text-xs text-muted-text">
                      {movie.release_date?.slice(0, 4)} • {movie.runtime_minutes}m
                    </p>
                    <p className="text-xs text-slate-300 line-clamp-2 mt-2 leading-relaxed">
                      {movie.description}
                    </p>
                  </div>
                </div>

                {/* Score Reason Summary */}
                <div className="p-3 rounded-xl bg-surface-elevated border border-border/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-violet-300 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-secondary" /> Why Recommended
                    </span>
                    <button
                      onClick={() => toggleBreakdown(movie.id)}
                      className="text-muted-text hover:text-white flex items-center gap-0.5 text-[11px]"
                    >
                      {isExpanded ? (
                        <>Hide Details <ChevronUp className="w-3 h-3" /></>
                      ) : (
                        <>Score Breakdown ({item.reasons.length}) <ChevronDown className="w-3 h-3" /></>
                      )}
                    </button>
                  </div>

                  <p className="text-xs text-slate-300 leading-snug">
                    {item.summary_explanation}
                  </p>

                  {/* Expandable Exact Criteria Breakdown */}
                  {isExpanded && (
                    <div className="pt-2 border-t border-border/60 space-y-1.5 animate-in fade-in duration-150">
                      {item.reasons.map((r, rIdx) => (
                        <div key={rIdx} className="flex items-start justify-between text-[11px] gap-2">
                          <span className="text-slate-300">• {r.description}</span>
                          <span className="font-bold text-secondary shrink-0">
                            +{r.score_contribution.toFixed(0)} pts
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recommendation Feedback Action Row */}
                <div className="flex items-center justify-between pt-1 border-t border-border/60 text-xs">
                  <span className="text-muted-text text-[11px]">Feedback:</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleFeedback(movie.id, "useful", movie.title)}
                      className="p-1.5 rounded-lg bg-surface-elevated hover:bg-emerald-500/20 hover:text-emerald-300 text-muted-text border border-border transition-colors flex items-center gap-1"
                      title="Good recommendation"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" /> Useful
                    </button>
                    <button
                      onClick={() => handleFeedback(movie.id, "already_watched", movie.title)}
                      className="p-1.5 rounded-lg bg-surface-elevated hover:bg-secondary/20 hover:text-secondary text-muted-text border border-border transition-colors flex items-center gap-1"
                      title="I've already seen this"
                    >
                      <Check className="w-3.5 h-3.5" /> Seen
                    </button>
                    <button
                      onClick={() => handleFeedback(movie.id, "not_interested", movie.title)}
                      className="p-1.5 rounded-lg bg-surface-elevated hover:bg-rose-500/20 hover:text-rose-300 text-muted-text border border-border transition-colors flex items-center gap-1"
                      title="Not interested in this movie"
                    >
                      <EyeOff className="w-3.5 h-3.5" /> Skip
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-16 text-center rounded-2xl bg-surface border border-border space-y-4">
          <Sparkles className="w-12 h-12 text-primary mx-auto" />
          <h3 className="text-xl font-bold text-white">No Recommendations Left to Display</h3>
          <p className="text-sm text-muted-text max-w-md mx-auto">
            You've interacted with or filtered all currently eligible recommendations. Rate more movies or reset filters to receive new suggestions.
          </p>
          <button
            onClick={() => fetchRecommendations(true)}
            className="px-6 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm shadow-glow-violet"
          >
            Refresh Catalog
          </button>
        </div>
      )}

    </div>
  );
};
