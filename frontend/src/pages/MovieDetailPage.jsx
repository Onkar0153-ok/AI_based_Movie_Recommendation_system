import React, { useState, useEffect } from "react";
import { 
  Star, Clock, Calendar, Globe, User as DirectorIcon, 
  Users, Film, Play, Bookmark, Check, Sparkles, ArrowLeft, MessageSquare 
} from "lucide-react";
import { api } from "../api/client";
import { MovieCard } from "../components/movies/MovieCard";
import { TrailerModal } from "../components/movies/TrailerModal";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export const MovieDetailPage = ({ movieId, navigate }) => {
  const { isAuthenticated } = useAuth();
  const toast = useToast();

  const [movie, setMovie] = useState(null);
  const [similarMovies, setSimilarMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [userReview, setUserReview] = useState("");
  const [hoverRating, setHoverRating] = useState(0);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);

  useEffect(() => {
    const fetchMovieData = async () => {
      setLoading(true);
      try {
        const [movieData, similarData] = await Promise.all([
          api.movies.getById(movieId),
          api.recommendations.getSimilar(movieId, 6)
        ]);

        setMovie(movieData);
        setInWatchlist(movieData.is_in_watchlist || false);
        setUserRating(movieData.current_user_rating || 0);
        setSimilarMovies(similarData || []);

        // Record viewing history in background if authenticated
        if (isAuthenticated) {
          api.history.record(movieId).catch(() => {});
        }
      } catch (err) {
        console.error("Failed to load movie:", err);
        toast.error("Could not load movie details.");
      } finally {
        setLoading(false);
      }
    };

    fetchMovieData();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [movieId, isAuthenticated]);

  const handleWatchlistToggle = async () => {
    if (!isAuthenticated) {
      toast.info("Please sign in to save movies to your watchlist.");
      return;
    }
    try {
      if (inWatchlist) {
        await api.watchlist.remove(movie.id);
        setInWatchlist(false);
        toast.info(`Removed "${movie.title}" from your watchlist.`);
      } else {
        await api.watchlist.add(movie.id);
        setInWatchlist(true);
        toast.success(`Saved "${movie.title}" to your watchlist!`);
      }
    } catch (err) {
      toast.error(err.message || "Failed to update watchlist.");
    }
  };

  const handleRatingSubmit = async (val) => {
    if (!isAuthenticated) {
      toast.info("Please sign in to rate movies.");
      return;
    }
    setSubmittingRating(true);
    try {
      await api.ratings.rateMovie(movie.id, val, userReview.trim() || null);
      setUserRating(val);
      toast.success(`You rated "${movie.title}" ${val} \u2605! Your taste profile has been updated.`);
    } catch (err) {
      toast.error(err.message || "Failed to save rating.");
    } finally {
      setSubmittingRating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-text text-sm animate-pulse">Loading cinematic feature...</p>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <Film className="w-16 h-16 text-muted-text mx-auto" />
        <h2 className="text-2xl font-bold text-white">Movie Not Found</h2>
        <p className="text-muted-text text-sm">The movie you requested could not be located in our catalog.</p>
        <button
          onClick={() => navigate("discover")}
          className="px-6 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm"
        >
          Return to Discover
        </button>
      </div>
    );
  }

  const releaseYear = movie.release_date ? movie.release_date.slice(0, 4) : "";
  const genresList = movie.genres?.map(g => typeof g === "string" ? g : g.name) || [];
  const moodsList = movie.moods?.map(m => typeof m === "string" ? m : m.mood_name) || [];
  const keywordsList = movie.keywords?.map(k => typeof k === "string" ? k : k.keyword) || [];

  return (
    <div className="space-y-12 pb-16">
      
      {/* Top Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <button
          onClick={() => navigate("discover")}
          className="inline-flex items-center gap-2 text-sm text-muted-text hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Movies
        </button>
      </div>

      {/* Main Movie Hero Banner */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          
          {/* Poster Column */}
          <div className="md:col-span-4 lg:col-span-4">
            <div className="aspect-[2/3] w-full rounded-2xl overflow-hidden border border-border shadow-2xl bg-surface relative group">
              {movie.poster_url ? (
                <img
                  src={movie.poster_url}
                  alt={movie.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-surface-elevated text-muted-text">
                  <Film className="w-16 h-16 mb-2 opacity-50" />
                  <span className="text-center font-bold text-white">{movie.title}</span>
                </div>
              )}
            </div>

            {/* Quick Action Buttons Under Poster */}
            <div className="mt-4 flex flex-col gap-2.5">
              {movie.trailer_url && (
                <button
                  onClick={() => setShowTrailer(true)}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-primary-hover hover:from-primary-hover hover:to-primary text-white font-semibold text-sm shadow-glow-violet transition-all flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-current" /> Watch Trailer
                </button>
              )}

              <button
                onClick={handleWatchlistToggle}
                className={`w-full py-3 rounded-xl border text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                  inWatchlist
                    ? "bg-secondary text-background border-secondary font-bold shadow-glow-cyan"
                    : "bg-surface-elevated border-border text-white hover:bg-surface"
                }`}
              >
                <Bookmark className={`w-4 h-4 ${inWatchlist ? "fill-current" : ""}`} />
                {inWatchlist ? "Saved in Watchlist" : "Add to Watchlist"}
              </button>
            </div>
          </div>

          {/* Details Column */}
          <div className="md:col-span-8 lg:col-span-8 space-y-6">
            
            {/* Title & Ratings */}
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {genresList.map((g, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-surface-elevated text-secondary border border-border"
                  >
                    {g}
                  </span>
                ))}
              </div>

              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
                {movie.title}
              </h1>

              {/* Quick Meta */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-text mt-3">
                {movie.external_rating && (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold">
                    <Star className="w-4 h-4 fill-amber-400" />
                    <span>{movie.external_rating.toFixed(1)}</span>
                    <span className="text-xs font-normal text-muted-text">/ 10</span>
                  </div>
                )}
                {movie.average_user_rating && (
                  <span className="text-slate-300">
                    Community: <strong className="text-white">{movie.average_user_rating}</strong> ({movie.user_ratings_count} reviews)
                  </span>
                )}
                {releaseYear && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-primary" /> {movie.release_date}
                  </span>
                )}
                {movie.runtime_minutes && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4 text-primary" /> {movie.runtime_minutes} mins
                  </span>
                )}
                {movie.language && (
                  <span className="flex items-center gap-1">
                    <Globe className="w-4 h-4 text-secondary" /> {movie.language}
                  </span>
                )}
              </div>
            </div>

            {/* Synopsis */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-muted-text uppercase tracking-wider">Synopsis</h3>
              <p className="text-base text-slate-200 leading-relaxed font-light">
                {movie.description || "No overview available for this title."}
              </p>
            </div>

            {/* Cast & Crew */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-surface border border-border">
              {movie.director && (
                <div>
                  <span className="text-xs font-semibold text-muted-text uppercase flex items-center gap-1 mb-1">
                    <DirectorIcon className="w-3.5 h-3.5 text-primary" /> Director
                  </span>
                  <p className="text-sm font-medium text-white">{movie.director}</p>
                </div>
              )}
              {movie.cast && (
                <div>
                  <span className="text-xs font-semibold text-muted-text uppercase flex items-center gap-1 mb-1">
                    <Users className="w-3.5 h-3.5 text-secondary" /> Key Cast
                  </span>
                  <p className="text-sm font-medium text-white">{movie.cast}</p>
                </div>
              )}
            </div>

            {/* Mood & Keywords */}
            {(moodsList.length > 0 || keywordsList.length > 0) && (
              <div className="space-y-3">
                {moodsList.length > 0 && (
                  <div>
                    <span className="text-xs font-bold text-muted-text uppercase tracking-wider block mb-1.5">
                      Mood Resonance
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {moodsList.map((m, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 rounded-full text-xs font-medium bg-primary/15 text-primary border border-primary/30"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {keywordsList.length > 0 && (
                  <div>
                    <span className="text-xs font-bold text-muted-text uppercase tracking-wider block mb-1.5">
                      Thematic Keywords
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {keywordsList.map((kw, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-0.5 rounded-md text-xs bg-surface-elevated text-slate-300 border border-border"
                        >
                          #{kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Interactive User Rating Section */}
            <div className="p-6 rounded-2xl bg-surface-elevated border border-border space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-amber-400" /> Rate This Movie
                  </h3>
                  <p className="text-xs text-muted-text mt-0.5">
                    Your rating directly trains your personalized CineMatch AI discovery engine.
                  </p>
                </div>
                {userRating > 0 && (
                  <span className="text-xs font-bold px-2 py-1 bg-amber-400/20 text-amber-300 rounded-lg border border-amber-400/30">
                    Your Rating: {userRating.toFixed(1)} \u2605
                  </span>
                )}
              </div>

              {/* Star selector */}
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((val) => {
                  const isFilled = (hoverRating || userRating) >= val;
                  return (
                    <button
                      key={val}
                      type="button"
                      onMouseEnter={() => setHoverRating(val)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => handleRatingSubmit(val)}
                      disabled={submittingRating}
                      className="p-1 text-slate-600 hover:scale-125 transition-transform"
                    >
                      <Star
                        className={`w-7 h-7 transition-colors ${
                          isFilled ? "text-amber-400 fill-amber-400" : "text-slate-600"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>

              {/* Optional Review Text */}
              <div className="pt-2">
                <input
                  type="text"
                  placeholder="Add an optional one-line review or thought..."
                  value={userReview}
                  onChange={(e) => setUserReview(e.target.value)}
                  className="w-full bg-surface border border-border rounded-xl px-4 py-2 text-xs text-white placeholder-muted-text focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Why You May Like This Movie Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/30 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-secondary" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">Why CineMatch Recommends This</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Scored highly based on {genresList.join(", ")} themes with {movie.external_rating ? `${movie.external_rating}/10 critical acclaim` : "high user appeal"}. 
                  {moodsList.length > 0 && ` Ideal if you are looking for a ${moodsList.join(" or ")} viewing experience.`}
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Similar Movies Section (Computed via TF-IDF & Cosine Similarity) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pt-6">
        <div className="border-b border-border pb-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-secondary uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5 text-secondary" /> Content Similarity ML
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Similar Movies You Might Enjoy
          </h2>
        </div>

        {similarMovies.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6">
            {similarMovies.map((item) => (
              <MovieCard
                key={item.movie.id}
                movie={item.movie}
                matchScore={item.match_score}
                explanation={item.summary_explanation}
                onClick={() => navigate("movie", { id: item.movie.id })}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-text">No similar titles computed yet for this catalog record.</p>
        )}
      </section>

      {/* Trailer Modal */}
      <TrailerModal
        isOpen={showTrailer}
        onClose={() => setShowTrailer(false)}
        movie={movie}
      />

    </div>
  );
};
