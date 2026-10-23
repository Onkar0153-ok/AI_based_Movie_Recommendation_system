import React, { useState, useEffect } from "react";
import { 
  Play, Sparkles, Smile, Star, ArrowRight, Flame, 
  TrendingUp, Clock, Bookmark, Film, ChevronRight 
} from "lucide-react";
import { api } from "../api/client";
import { MovieCard } from "../components/movies/MovieCard";
import { TrailerModal } from "../components/movies/TrailerModal";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export const HomePage = ({ navigate }) => {
  const { isAuthenticated } = useAuth();
  const toast = useToast();

  const [heroMovie, setHeroMovie] = useState(null);
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [topRatedMovies, setTopRatedMovies] = useState([]);
  const [recentMovies, setRecentMovies] = useState([]);
  const [forYouMovies, setForYouMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trailerMovie, setTrailerMovie] = useState(null);

  useEffect(() => {
    const fetchHomeData = async () => {
      setLoading(true);
      try {
        // Fetch published movies sorted by popularity and ratings
        const [popularRes, topRes, recsRes] = await Promise.all([
          api.movies.getAll({ sort_by: "popularity", page_size: 10 }),
          api.movies.getAll({ sort_by: "rating", page_size: 10 }),
          api.recommendations.getForYou(8)
        ]);

        const popItems = popularRes.items || [];
        const topItems = topRes.items || [];
        const recItems = recsRes.recommendations || [];

        // Choose hero movie from top items with high rating and backdrop/poster
        if (popItems.length > 0) {
          setHeroMovie(popItems[0]);
          setTrendingMovies(popItems.slice(1, 7));
        }
        setTopRatedMovies(topItems.slice(0, 6));
        setRecentMovies(popItems.slice(3, 9));
        setForYouMovies(recItems);
      } catch (err) {
        console.error("Error fetching home data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHomeData();
  }, [isAuthenticated]);

  const moodsList = [
    { name: "Mind-Bending", desc: "Twists & alternate realities", color: "from-purple-600/30 to-indigo-600/30", border: "border-purple-500/40" },
    { name: "Feel-Good", desc: "Heartwarming joy & laughs", color: "from-amber-600/30 to-orange-600/30", border: "border-amber-500/40" },
    { name: "Suspenseful", desc: "Edge-of-your-seat thrills", color: "from-rose-600/30 to-red-600/30", border: "border-rose-500/40" },
    { name: "Emotional", desc: "Deeply moving human dramas", color: "from-blue-600/30 to-cyan-600/30", border: "border-blue-500/40" },
    { name: "Motivational", desc: "Triumphs of the human spirit", color: "from-emerald-600/30 to-teal-600/30", border: "border-emerald-500/40" },
    { name: "Scary", desc: "Supernatural chills & dread", color: "from-zinc-700/40 to-stone-800/40", border: "border-zinc-600/40" },
  ];

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-text text-sm animate-pulse">Curating your cinematic discovery experience...</p>
      </div>
    );
  }

  const heroYear = heroMovie?.release_date ? heroMovie.release_date.slice(0, 4) : "";
  const heroGenres = heroMovie?.genres?.map(g => typeof g === "string" ? g : g.name) || [];

  return (
    <div className="space-y-16 pb-12">
      {/* Cinematic Hero Section */}
      {heroMovie && (
        <section className="relative -mt-6 -mx-4 sm:-mx-6 lg:-mx-8 aspect-[16/9] min-h-[520px] max-h-[680px] overflow-hidden flex items-end">
          {/* Hero Backdrop / Poster */}
          <div className="absolute inset-0">
            {heroMovie.poster_url ? (
              <img
                src={heroMovie.poster_url}
                alt={heroMovie.title}
                className="w-full h-full object-cover object-center filter brightness-[0.35] blur-[1px] scale-105"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-surface to-background" />
            )}
            {/* Multi-layered cinematic gradients */}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
          </div>

          {/* Hero Content */}
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 w-full">
            <div className="max-w-2xl space-y-4">
              
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/30 border border-primary/50 text-secondary text-xs font-semibold uppercase tracking-wider backdrop-blur-md">
                <Flame className="w-3.5 h-3.5 text-secondary" /> Featured Spotlight
              </div>

              {/* Title */}
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-none drop-shadow-md">
                {heroMovie.title}
              </h1>

              {/* Meta tags */}
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
                {heroMovie.external_rating && (
                  <span className="flex items-center gap-1 font-bold text-amber-400">
                    <Star className="w-4 h-4 fill-amber-400" />
                    {heroMovie.external_rating.toFixed(1)}
                  </span>
                )}
                {heroYear && <span>{heroYear}</span>}
                {heroMovie.runtime_minutes && <span>{heroMovie.runtime_minutes} mins</span>}
                {heroMovie.content_rating && (
                  <span className="px-1.5 py-0.5 rounded text-xs bg-white/10 border border-white/20">
                    {heroMovie.content_rating}
                  </span>
                )}
                {heroGenres.length > 0 && (
                  <span className="text-secondary/90 font-medium">
                    {heroGenres.slice(0, 3).join(" • ")}
                  </span>
                )}
              </div>

              {/* Synopsis */}
              <p className="text-sm sm:text-base text-slate-300 line-clamp-3 leading-relaxed max-w-xl">
                {heroMovie.description}
              </p>

              {/* Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                {heroMovie.trailer_url && (
                  <button
                    onClick={() => setTrailerMovie(heroMovie)}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-hover hover:from-primary-hover hover:to-primary text-white font-semibold text-sm shadow-glow-violet transition-all hover:scale-105"
                  >
                    <Play className="w-4 h-4 fill-current" /> Watch Trailer
                  </button>
                )}

                <button
                  onClick={() => navigate("movie", { id: heroMovie.id })}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl bg-surface-elevated/80 hover:bg-surface-elevated text-white font-semibold text-sm border border-border backdrop-blur-md transition-all hover:scale-105"
                >
                  Movie Details
                </button>

                <button
                  onClick={() => navigate("moods")}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl bg-transparent hover:bg-white/10 text-slate-300 hover:text-white font-semibold text-sm transition-all"
                >
                  <Smile className="w-4 h-4 text-secondary" /> Find by Mood
                </button>
              </div>

            </div>
          </div>
        </section>
      )}

      {/* Main Content Sections */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        
        {/* Section: Picked for Your Taste (Personalized / Cold-start) */}
        <section className="space-y-6">
          <div className="flex items-end justify-between border-b border-border/80 pb-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-secondary uppercase tracking-wider mb-1">
                <Sparkles className="w-3.5 h-3.5 text-secondary" /> 
                {isAuthenticated ? "Tailored Recommendations" : "Curated Platform Favorites"}
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Picked for Your Taste
              </h2>
            </div>
            <button
              onClick={() => navigate("for-you")}
              className="text-sm font-semibold text-primary hover:text-secondary flex items-center gap-1 transition-colors"
            >
              Explore All <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6">
            {forYouMovies.slice(0, 6).map((item, idx) => (
              <MovieCard
                key={item.movie?.id || idx}
                movie={item.movie}
                matchScore={item.match_score}
                explanation={item.summary_explanation}
                onClick={() => navigate("movie", { id: item.movie.id })}
              />
            ))}
          </div>
        </section>

        {/* Section: Mood Discovery Cards */}
        <section className="space-y-6">
          <div className="flex items-end justify-between border-b border-border/80 pb-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-secondary uppercase tracking-wider mb-1">
                <Smile className="w-3.5 h-3.5 text-secondary" /> Emotional Resonance
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Discover by Mood
              </h2>
            </div>
            <button
              onClick={() => navigate("moods")}
              className="text-sm font-semibold text-primary hover:text-secondary flex items-center gap-1 transition-colors"
            >
              Open Mood Finder <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {moodsList.map((mood) => (
              <div
                key={mood.name}
                onClick={() => navigate("moods", { mood: mood.name })}
                className={`p-6 rounded-2xl bg-gradient-to-br ${mood.color} bg-surface border ${mood.border} hover:scale-[1.02] cursor-pointer transition-all duration-300 shadow-card group`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-white group-hover:text-secondary transition-colors">
                    {mood.name}
                  </h3>
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-xs text-slate-300">{mood.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Section: Trending Movies */}
        <section className="space-y-6">
          <div className="flex items-end justify-between border-b border-border/80 pb-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-secondary uppercase tracking-wider mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-secondary" /> Popularity Surge
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Trending Right Now
              </h2>
            </div>
            <button
              onClick={() => navigate("discover", { sort_by: "popularity" })}
              className="text-sm font-semibold text-primary hover:text-secondary flex items-center gap-1 transition-colors"
            >
              View More <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6">
            {trendingMovies.map((movie) => (
              <MovieCard
                key={movie.id}
                movie={movie}
                onClick={() => navigate("movie", { id: movie.id })}
              />
            ))}
          </div>
        </section>

        {/* Section: Top-Rated Masterpieces */}
        <section className="space-y-6">
          <div className="flex items-end justify-between border-b border-border/80 pb-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-secondary uppercase tracking-wider mb-1">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> All-Time Classics
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Critically Acclaimed Hits
              </h2>
            </div>
            <button
              onClick={() => navigate("discover", { sort_by: "rating" })}
              className="text-sm font-semibold text-primary hover:text-secondary flex items-center gap-1 transition-colors"
            >
              View More <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6">
            {topRatedMovies.map((movie) => (
              <MovieCard
                key={movie.id}
                movie={movie}
                onClick={() => navigate("movie", { id: movie.id })}
              />
            ))}
          </div>
        </section>

      </div>

      {/* Trailer Modal */}
      <TrailerModal
        isOpen={!!trailerMovie}
        onClose={() => setTrailerMovie(null)}
        movie={trailerMovie}
      />
    </div>
  );
};
