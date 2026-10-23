import React, { useState, useEffect } from "react";
import { 
  Smile, Sparkles, Filter, SlidersHorizontal, Star, 
  RotateCcw, Compass, Film, Flame, Heart, Zap, Coffee, ShieldAlert, Users 
} from "lucide-react";
import { api } from "../api/client";
import { MovieCard } from "../components/movies/MovieCard";

export const MoodFinderPage = ({ navigate, initialMood = "Mind-Bending" }) => {
  const [selectedMood, setSelectedMood] = useState(initialMood);
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [selectedLanguage, setSelectedLanguage] = useState("All");
  const [minRating, setMinRating] = useState(0);
  const [maxRuntime, setMaxRuntime] = useState(240);
  
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [genresList, setGenresList] = useState([]);

  const moodsConfig = [
    { name: "Mind-Bending", label: "Mind-Bending", icon: Zap, desc: "Complex plots, paradoxes & alternate realities", gradient: "from-purple-900/60 to-indigo-900/40", border: "border-purple-500/50" },
    { name: "Feel-Good", label: "Feel-Good", icon: Smile, desc: "Heartwarming joy, hope & uplifting stories", gradient: "from-amber-900/60 to-yellow-900/40", border: "border-amber-500/50" },
    { name: "Suspenseful", label: "Suspenseful", icon: Flame, desc: "Edge-of-your-seat psychological tension", gradient: "from-rose-900/60 to-red-900/40", border: "border-rose-500/50" },
    { name: "Emotional", label: "Emotional", icon: Heart, desc: "Tearjerkers, pathos & deep human connections", gradient: "from-blue-900/60 to-cyan-900/40", border: "border-blue-500/50" },
    { name: "Motivational", label: "Motivational", icon: Sparkles, desc: "Overcoming odds, triumph & inspiration", gradient: "from-emerald-900/60 to-teal-900/40", border: "border-emerald-500/50" },
    { name: "Scary", label: "Scary", icon: ShieldAlert, desc: "Supernatural terror, dread & dark secrets", gradient: "from-zinc-900/70 to-stone-900/50", border: "border-zinc-500/50" },
    { name: "Relaxing", label: "Relaxing", icon: Coffee, desc: "Gentle pacing, serene visuals & cozy vibes", gradient: "from-teal-900/60 to-emerald-900/40", border: "border-teal-500/50" },
    { name: "Adventure", label: "Adventure", icon: Compass, desc: "Epic quests, uncharted worlds & discovery", gradient: "from-orange-900/60 to-amber-900/40", border: "border-orange-500/50" },
    { name: "Romantic", label: "Romantic", icon: Heart, desc: "Passionate romance, chemistry & sweet love", gradient: "from-pink-900/60 to-rose-900/40", border: "border-pink-500/50" },
    { name: "Family-Friendly", label: "Family-Friendly", icon: Users, desc: "Wholesome fun suitable for all ages", gradient: "from-cyan-900/60 to-blue-900/40", border: "border-cyan-500/50" },
  ];

  useEffect(() => {
    api.recommendations.getGenres().then((res) => setGenresList(res || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const fetchMoodMovies = async () => {
      setLoading(true);
      try {
        const params = {
          mood: selectedMood,
          page_size: 24,
          sort_by: "popularity",
        };
        if (selectedGenre !== "All") params.genre = selectedGenre;
        if (selectedLanguage !== "All") params.language = selectedLanguage;
        if (minRating > 0) params.min_rating = minRating;
        if (maxRuntime < 240) params.max_runtime = maxRuntime;

        const res = await api.movies.getAll(params);
        setMovies(res.items || []);
      } catch (err) {
        console.error("Failed to load mood movies:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMoodMovies();
  }, [selectedMood, selectedGenre, selectedLanguage, minRating, maxRuntime]);

  const activeMoodObj = moodsConfig.find((m) => m.name === selectedMood) || moodsConfig[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      
      {/* Page Header */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/15 text-secondary text-xs font-bold uppercase tracking-wider border border-secondary/30">
          <Smile className="w-3.5 h-3.5" /> Emotional Matchmaker
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
          How Are You Feeling Today?
        </h1>
        <p className="text-sm text-muted-text">
          Select your desired mood vibe and CineMatch AI will filter matching cinema to suit your exact psychological headspace.
        </p>
      </div>

      {/* Mood Selector Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {moodsConfig.map((mood) => {
          const Icon = mood.icon;
          const isSelected = selectedMood === mood.name;

          return (
            <button
              key={mood.name}
              type="button"
              onClick={() => setSelectedMood(mood.name)}
              className={`p-4 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between h-28 relative overflow-hidden ${
                isSelected
                  ? `bg-gradient-to-br ${mood.gradient} ${mood.border} shadow-lg scale-105 ring-2 ring-primary`
                  : "bg-surface border-border hover:bg-surface-elevated hover:border-slate-600"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <Icon className={`w-5 h-5 ${isSelected ? "text-secondary" : "text-muted-text"}`} />
                {isSelected && (
                  <span className="w-2 h-2 rounded-full bg-secondary shadow-glow-cyan" />
                )}
              </div>
              <div>
                <p className="font-bold text-sm text-white">{mood.label}</p>
                <p className="text-[11px] text-muted-text line-clamp-1 mt-0.5">{mood.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Fine-Tuning Secondary Filter Controls */}
      <div className="p-5 rounded-2xl bg-surface border border-border flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
          {/* Genre */}
          <div className="flex items-center gap-2">
            <span className="text-muted-text uppercase">Genre:</span>
            <select
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
              className="bg-surface-elevated border border-border text-white rounded-lg px-2.5 py-1 text-xs focus:outline-none"
            >
              <option value="All">All Genres</option>
              {genresList.map((g) => (
                <option key={g.id} value={g.name}>{g.name}</option>
              ))}
            </select>
          </div>

          {/* Language */}
          <div className="flex items-center gap-2">
            <span className="text-muted-text uppercase">Language:</span>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="bg-surface-elevated border border-border text-white rounded-lg px-2.5 py-1 text-xs focus:outline-none"
            >
              <option value="All">All Languages</option>
              <option value="English">English</option>
              <option value="Hindi">Hindi</option>
              <option value="Korean">Korean</option>
              <option value="Japanese">Japanese</option>
              <option value="Spanish">Spanish</option>
              <option value="French">French</option>
            </select>
          </div>

          {/* Min Rating */}
          <div className="flex items-center gap-2">
            <span className="text-muted-text uppercase">Min Rating:</span>
            <select
              value={minRating}
              onChange={(e) => setMinRating(parseFloat(e.target.value))}
              className="bg-surface-elevated border border-border text-white rounded-lg px-2.5 py-1 text-xs focus:outline-none"
            >
              <option value="0">Any Rating</option>
              <option value="7">7.0+ Rated</option>
              <option value="8">8.0+ Acclaimed</option>
              <option value="8.5">8.5+ Masterpiece</option>
            </select>
          </div>
        </div>

        {/* Clear Filters */}
        <button
          onClick={() => {
            setSelectedGenre("All");
            setSelectedLanguage("All");
            setMinRating(0);
            setMaxRuntime(240);
          }}
          className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-semibold"
        >
          <RotateCcw className="w-3 h-3" /> Reset Options
        </button>
      </div>

      {/* Mood Explanation Card */}
      <div className="p-4 rounded-xl bg-surface-elevated border border-border/80 flex items-center gap-3">
        <Sparkles className="w-5 h-5 text-secondary shrink-0" />
        <p className="text-xs text-slate-300">
          Showing <strong className="text-white">{movies.length}</strong> movies tagged with the{" "}
          <strong className="text-secondary">{activeMoodObj.label}</strong> mood.{" "}
          {activeMoodObj.desc}.
        </p>
      </div>

      {/* Movies Grid */}
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
              explanation={`Matches your ${selectedMood} mood preference`}
              onClick={() => navigate("movie", { id: movie.id })}
            />
          ))}
        </div>
      ) : (
        <div className="p-16 text-center rounded-2xl bg-surface border border-border space-y-3">
          <Smile className="w-12 h-12 text-muted-text/50 mx-auto" />
          <h3 className="text-lg font-bold text-white">No Movies Found for Current Mood Filter</h3>
          <p className="text-xs text-muted-text max-w-sm mx-auto">
            Try resetting the secondary genre or language filter to discover titles in the {selectedMood} mood category.
          </p>
        </div>
      )}

    </div>
  );
};
