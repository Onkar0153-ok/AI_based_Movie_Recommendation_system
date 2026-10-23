import React, { useState, useEffect } from "react";
import { 
  User as UserIcon, Sliders, Star, Bookmark, Shield, 
  Save, Check, Trash2, Mail, Calendar, Clock, Film 
} from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export const ProfilePage = ({ navigate, openAuthModal }) => {
  const { user, isAuthenticated, updateProfile } = useAuth();
  const toast = useToast();

  const [name, setName] = useState(user?.name || "");
  const [savingProfile, setSavingProfile] = useState(false);

  // Preference fields
  const [preferredGenres, setPreferredGenres] = useState([]);
  const [preferredMoods, setPreferredMoods] = useState([]);
  const [preferredLanguages, setPreferredLanguages] = useState([]);
  const [minimumRating, setMinimumRating] = useState(0);
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const [maxRuntime, setMaxRuntime] = useState(240);
  const [savingPrefs, setSavingPrefs] = useState(false);

  // User ratings list
  const [myRatings, setMyRatings] = useState([]);
  const [loadingRatings, setLoadingRatings] = useState(true);

  const allGenres = [
    "Sci-Fi", "Action", "Adventure", "Drama", "Comedy", "Thriller", 
    "Crime", "Mystery", "Horror", "Animation", "Romance", "Family", 
    "Fantasy", "Biography", "Music", "War"
  ];

  const allMoods = [
    "Mind-Bending", "Feel-Good", "Suspenseful", "Emotional", 
    "Motivational", "Scary", "Relaxing", "Adventure", "Romantic", "Family-Friendly"
  ];

  const allLanguages = ["English", "Hindi", "Korean", "Japanese", "Spanish", "French", "Kannada", "Telugu"];

  useEffect(() => {
    if (!isAuthenticated) return;

    setName(user?.name || "");

    const loadUserData = async () => {
      try {
        const [prefs, ratings] = await Promise.all([
          api.preferences.get(),
          api.ratings.getMyRatings()
        ]);

        if (prefs) {
          setPreferredGenres(prefs.preferred_genres || []);
          setPreferredMoods(prefs.preferred_moods || []);
          setPreferredLanguages(prefs.preferred_languages || []);
          setMinimumRating(prefs.minimum_rating || 0);
          setYearFrom(prefs.preferred_year_from ? String(prefs.preferred_year_from) : "");
          setYearTo(prefs.preferred_year_to ? String(prefs.preferred_year_to) : "");
          setMaxRuntime(prefs.maximum_runtime || 240);
        }

        setMyRatings(ratings || []);
      } catch (err) {
        console.error("Error loading profile data:", err);
      } finally {
        setLoadingRatings(false);
      }
    };

    loadUserData();
  }, [isAuthenticated, user]);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSavingProfile(true);
    try {
      await updateProfile({ name: name.trim() });
      toast.success("Profile name updated successfully.");
    } catch (err) {
      toast.error(err.message || "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePreferencesSave = async (e) => {
    e.preventDefault();
    setSavingPrefs(true);
    try {
      await api.preferences.update({
        preferred_genres: preferredGenres,
        preferred_moods: preferredMoods,
        preferred_languages: preferredLanguages,
        minimum_rating: minimumRating,
        preferred_year_from: yearFrom ? parseInt(yearFrom) : null,
        preferred_year_to: yearTo ? parseInt(yearTo) : null,
        maximum_runtime: maxRuntime < 240 ? maxRuntime : null,
      });
      toast.success("Discovery preferences saved to your account!");
    } catch (err) {
      toast.error(err.message || "Failed to save preferences.");
    } finally {
      setSavingPrefs(false);
    }
  };

  const toggleGenre = (genre) => {
    setPreferredGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const toggleMood = (mood) => {
    setPreferredMoods((prev) =>
      prev.includes(mood) ? prev.filter((m) => m !== mood) : [...prev, mood]
    );
  };

  const toggleLanguage = (lang) => {
    setPreferredLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    );
  };

  const handleDeleteRating = async (ratingId) => {
    try {
      await api.ratings.deleteRating(ratingId);
      setMyRatings((prev) => prev.filter((r) => r.id !== ratingId));
      toast.info("Rating deleted.");
    } catch (err) {
      toast.error(err.message || "Failed to delete rating.");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center space-y-4">
        <UserIcon className="w-16 h-16 text-muted-text mx-auto" />
        <h2 className="text-2xl font-bold text-white">Sign In to Customize Preferences</h2>
        <p className="text-sm text-muted-text">
          Customize your favorite genres, rating constraints, and moods to train your personalized discovery engine.
        </p>
        <button
          onClick={() => openAuthModal("login")}
          className="px-6 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm shadow-glow-violet"
        >
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      
      {/* Header */}
      <div className="border-b border-border pb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white font-black text-2xl shadow-glow-violet">
            {user?.name?.slice(0, 2).toUpperCase() || "U"}
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {user?.name}
            </h1>
            <p className="text-xs text-muted-text mt-0.5 flex items-center gap-2">
              <Mail className="w-3.5 h-3.5" /> {user?.email}
              {user?.role === "admin" && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-secondary/15 text-secondary border border-secondary/30 uppercase">
                  Administrator
                </span>
              )}
            </p>
          </div>
        </div>

        {user?.role === "admin" && (
          <button
            onClick={() => navigate("admin")}
            className="px-4 py-2 rounded-xl bg-surface border border-secondary/40 text-secondary hover:bg-secondary/10 text-xs font-semibold flex items-center gap-2 transition-colors"
          >
            <Shield className="w-4 h-4" /> Go to Admin Panel
          </button>
        )}
      </div>

      {/* Profile Form */}
      <div className="p-6 rounded-2xl bg-surface border border-border shadow-card space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <UserIcon className="w-4 h-4 text-primary" /> Profile Information
        </h3>
        <form onSubmit={handleProfileSave} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your Name"
              className="w-full bg-surface-elevated border border-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
            />
          </div>
          <button
            type="submit"
            disabled={savingProfile}
            className="px-6 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm shadow-glow-violet hover:bg-primary-hover transition-colors shrink-0 flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" /> Save Name
          </button>
        </form>
      </div>

      {/* Preference Settings Form */}
      <form onSubmit={handlePreferencesSave} className="p-6 rounded-2xl bg-surface border border-border shadow-card space-y-8">
        
        <div>
          <div className="flex items-center gap-2 text-base font-bold text-white">
            <Sliders className="w-4 h-4 text-secondary" /> CineMatch AI Taste Profile
          </div>
          <p className="text-xs text-muted-text mt-1">
            These weights guide the rule-based recommendation engine when evaluating catalogue items for your 'For You' feed.
          </p>
        </div>

        {/* Favorite Genres Selection */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-muted-text uppercase tracking-wider">
            Favorite Genres ({preferredGenres.length} selected)
          </label>
          <div className="flex flex-wrap gap-2">
            {allGenres.map((genre) => {
              const isSelected = preferredGenres.includes(genre);
              return (
                <button
                  key={genre}
                  type="button"
                  onClick={() => toggleGenre(genre)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    isSelected
                      ? "bg-primary text-white border-primary shadow-glow-violet scale-105"
                      : "bg-surface-elevated text-slate-300 border-border hover:border-slate-500"
                  }`}
                >
                  {genre} {isSelected && "✓"}
                </button>
              );
            })}
          </div>
        </div>

        {/* Favorite Moods Selection */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-muted-text uppercase tracking-wider">
            Preferred Viewing Moods ({preferredMoods.length} selected)
          </label>
          <div className="flex flex-wrap gap-2">
            {allMoods.map((mood) => {
              const isSelected = preferredMoods.includes(mood);
              return (
                <button
                  key={mood}
                  type="button"
                  onClick={() => toggleMood(mood)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    isSelected
                      ? "bg-secondary text-background border-secondary font-bold shadow-glow-cyan scale-105"
                      : "bg-surface-elevated text-slate-300 border-border hover:border-slate-500"
                  }`}
                >
                  {mood} {isSelected && "✓"}
                </button>
              );
            })}
          </div>
        </div>

        {/* Preferred Languages */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-muted-text uppercase tracking-wider">
            Preferred Languages ({preferredLanguages.length} selected)
          </label>
          <div className="flex flex-wrap gap-2">
            {allLanguages.map((lang) => {
              const isSelected = preferredLanguages.includes(lang);
              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => toggleLanguage(lang)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    isSelected
                      ? "bg-violet-600/40 text-violet-200 border-violet-500"
                      : "bg-surface-elevated text-slate-300 border-border"
                  }`}
                >
                  {lang}
                </button>
              );
            })}
          </div>
        </div>

        {/* Numerical constraints: Rating, Years, Runtime */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-border">
          
          <div>
            <div className="flex justify-between text-xs font-bold text-muted-text uppercase mb-1.5">
              <span>Minimum Rating Threshold</span>
              <span className="text-amber-400 font-bold">{minimumRating > 0 ? `${minimumRating.toFixed(1)}+` : "Any"}</span>
            </div>
            <input
              type="range"
              min="0"
              max="9"
              step="0.5"
              value={minimumRating}
              onChange={(e) => setMinimumRating(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-surface-elevated rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-bold text-muted-text uppercase mb-1.5">
              <span>Max Runtime Cap</span>
              <span className="text-secondary font-bold">{maxRuntime < 240 ? `${maxRuntime}m` : "Any"}</span>
            </div>
            <input
              type="range"
              min="80"
              max="240"
              step="10"
              value={maxRuntime}
              onChange={(e) => setMaxRuntime(parseInt(e.target.value))}
              className="w-full h-1.5 bg-surface-elevated rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div>
            <div className="text-xs font-bold text-muted-text uppercase mb-1.5">
              Preferred Era Range (Years)
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="From (1990)"
                value={yearFrom}
                onChange={(e) => setYearFrom(e.target.value)}
                className="w-1/2 bg-surface-elevated border border-border rounded-xl px-3 py-1.5 text-xs text-white"
              />
              <span className="text-muted-text text-xs">—</span>
              <input
                type="number"
                placeholder="To (2025)"
                value={yearTo}
                onChange={(e) => setYearTo(e.target.value)}
                className="w-1/2 bg-surface-elevated border border-border rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>
          </div>

        </div>

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={savingPrefs}
            className="px-6 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm shadow-glow-violet hover:bg-primary-hover transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" /> Save Discovery Preferences
          </button>
        </div>
      </form>

      {/* Ratings History Section */}
      <div className="p-6 rounded-2xl bg-surface border border-border shadow-card space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-400 fill-amber-400" /> Movies You Have Rated ({myRatings.length})
        </h3>
        <p className="text-xs text-muted-text">
          Positively rated movies (4.0+) boost recommendations for similar genres and directors.
        </p>

        {loadingRatings ? (
          <p className="text-xs text-muted-text">Loading ratings...</p>
        ) : myRatings.length > 0 ? (
          <div className="divide-y divide-border">
            {myRatings.map((r) => (
              <div key={r.id} className="py-3 flex items-center justify-between gap-4">
                <div 
                  onClick={() => navigate("movie", { id: r.movie_id })}
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  <div className="w-10 h-14 rounded bg-surface-elevated overflow-hidden shrink-0 border border-border">
                    {r.movie_poster_url ? (
                      <img src={r.movie_poster_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-text text-xs">
                        <Film className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-white group-hover:text-secondary transition-colors">
                      {r.movie_title || `Movie #${r.movie_id}`}
                    </h4>
                    {r.optional_review && (
                      <p className="text-xs text-slate-300 italic line-clamp-1 mt-0.5">"{r.optional_review}"</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="flex items-center gap-1 text-sm font-bold text-amber-400">
                    <Star className="w-4 h-4 fill-amber-400" />
                    {r.rating_value.toFixed(1)}
                  </div>
                  <button
                    onClick={() => handleDeleteRating(r.id)}
                    className="p-1.5 text-muted-text hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
                    title="Delete rating"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-text italic">
            You haven't rated any movies yet. Explore titles and rate them 1-5 stars to train the algorithm!
          </p>
        )}
      </div>

    </div>
  );
};
