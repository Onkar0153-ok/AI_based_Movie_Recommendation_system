import React, { useState, useEffect } from "react";
import { 
  Shield, Film, Users, BarChart3, Activity, Plus, 
  Upload, Trash2, Edit, Check, X, Search, Star, 
  Bookmark, Eye, EyeOff, AlertCircle, RefreshCw 
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell 
} from "recharts";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export const AdminPage = ({ navigate }) => {
  const { user, isAdmin, isAuthenticated } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState("overview"); // 'overview', 'movies', 'users', 'activity'
  const [stats, setStats] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Movie Management States
  const [moviesList, setMoviesList] = useState([]);
  const [moviesTotal, setMoviesTotal] = useState(0);
  const [moviePage, setMoviePage] = useState(1);
  const [movieSearch, setMovieSearch] = useState("");
  const [movieStatusFilter, setMovieStatusFilter] = useState("all");
  const [loadingMovies, setLoadingMovies] = useState(false);

  // Movie Add / Edit Modal
  const [isMovieModalOpen, setIsMovieModalOpen] = useState(false);
  const [editingMovie, setEditingMovie] = useState(null);
  const [movieForm, setMovieForm] = useState({
    title: "",
    description: "",
    release_date: "",
    runtime_minutes: 120,
    language: "English",
    director: "",
    cast: "",
    poster_url: "",
    trailer_url: "",
    content_rating: "PG-13",
    external_rating: 7.5,
    status: "published",
    genres: "",
    moods: "",
    keywords: ""
  });
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [savingMovie, setSavingMovie] = useState(false);

  // Delete confirmation
  const [deletingMovieId, setDeletingMovieId] = useState(null);

  // CSV Import Modal
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [importingCsv, setImportingCsv] = useState(false);

  // User Management States
  const [usersList, setUsersList] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Activity Log
  const [activities, setActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(false);

  // Verify Admin authorization
  useEffect(() => {
    if (!isAuthenticated || !isAdmin) {
      toast.error("Administrative privileges required.");
      navigate("home");
    }
  }, [isAuthenticated, isAdmin]);

  // Load Dashboard Stats
  const loadDashboardData = async () => {
    setLoadingStats(true);
    try {
      const [dashStats, evalMetrics] = await Promise.all([
        api.admin.getDashboard(),
        api.admin.getMetrics()
      ]);
      setStats(dashStats);
      setMetrics(evalMetrics);
    } catch (err) {
      console.error("Failed to load admin stats:", err);
      toast.error("Failed to load admin dashboard stats.");
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadDashboardData();
    }
  }, [isAdmin]);

  // Load Movies Tab
  const loadMovies = async () => {
    setLoadingMovies(true);
    try {
      const res = await api.movies.getAll({
        page: moviePage,
        page_size: 15,
        status: movieStatusFilter,
        sort_by: "release_date",
        sort_order: "desc"
      });
      setMoviesList(res.items || []);
      setMoviesTotal(res.total || 0);
    } catch (err) {
      toast.error("Failed to fetch movies table.");
    } finally {
      setLoadingMovies(false);
    }
  };

  useEffect(() => {
    if (activeTab === "movies") {
      loadMovies();
    }
  }, [activeTab, moviePage, movieStatusFilter]);

  // Load Users Tab
  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await api.admin.getUsers(userSearch);
      setUsersList(res || []);
    } catch (err) {
      toast.error("Failed to load users list.");
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (activeTab === "users") {
      loadUsers();
    }
  }, [activeTab, userSearch]);

  // Load Activity Tab
  const loadActivities = async () => {
    setLoadingActivities(true);
    try {
      const res = await api.admin.getActivity(50);
      setActivities(res || []);
    } catch (err) {
      toast.error("Failed to load audit logs.");
    } finally {
      setLoadingActivities(false);
    }
  };

  useEffect(() => {
    if (activeTab === "activity") {
      loadActivities();
    }
  }, [activeTab]);

  // Handle Poster File Upload
  const handlePosterFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingPoster(true);
    try {
      const res = await api.movies.uploadPoster(file);
      setMovieForm((prev) => ({ ...prev, poster_url: res.url }));
      toast.success("Poster uploaded successfully.");
    } catch (err) {
      toast.error(err.message || "Poster upload failed.");
    } finally {
      setUploadingPoster(false);
    }
  };

  // Open Movie Modal (Create or Edit)
  const openMovieModal = (movie = null) => {
    if (movie) {
      setEditingMovie(movie);
      setMovieForm({
        title: movie.title || "",
        description: movie.description || "",
        release_date: movie.release_date || "",
        runtime_minutes: movie.runtime_minutes || 120,
        language: movie.language || "English",
        director: movie.director || "",
        cast: movie.cast || "",
        poster_url: movie.poster_url || "",
        trailer_url: movie.trailer_url || "",
        content_rating: movie.content_rating || "PG-13",
        external_rating: movie.external_rating || 7.5,
        status: movie.status || "published",
        genres: movie.genres?.map(g => typeof g === "string" ? g : g.name).join(", ") || "",
        moods: movie.moods?.map(m => typeof m === "string" ? m : m.mood_name).join(", ") || "",
        keywords: movie.keywords?.map(k => typeof k === "string" ? k : k.keyword).join(", ") || "",
      });
    } else {
      setEditingMovie(null);
      setMovieForm({
        title: "",
        description: "",
        release_date: "",
        runtime_minutes: 120,
        language: "English",
        director: "",
        cast: "",
        poster_url: "",
        trailer_url: "",
        content_rating: "PG-13",
        external_rating: 7.5,
        status: "published",
        genres: "",
        moods: "",
        keywords: ""
      });
    }
    setIsMovieModalOpen(true);
  };

  // Save Movie (Create or Update)
  const handleSaveMovie = async (e) => {
    e.preventDefault();
    if (!movieForm.title.trim()) {
      toast.error("Movie title is required.");
      return;
    }
    setSavingMovie(true);
    try {
      const payload = {
        title: movieForm.title.trim(),
        description: movieForm.description.trim() || null,
        release_date: movieForm.release_date.trim() || null,
        runtime_minutes: parseInt(movieForm.runtime_minutes) || null,
        language: movieForm.language.trim() || "English",
        director: movieForm.director.trim() || null,
        cast: movieForm.cast.trim() || null,
        poster_url: movieForm.poster_url.trim() || null,
        trailer_url: movieForm.trailer_url.trim() || null,
        content_rating: movieForm.content_rating || "PG-13",
        external_rating: parseFloat(movieForm.external_rating) || 7.0,
        status: movieForm.status,
        genres: movieForm.genres.split(",").map(g => g.trim()).filter(Boolean),
        moods: movieForm.moods.split(",").map(m => m.trim()).filter(Boolean),
        keywords: movieForm.keywords.split(",").map(k => k.trim()).filter(Boolean),
      };

      if (editingMovie) {
        await api.movies.update(editingMovie.id, payload);
        toast.success(`Updated movie "${payload.title}" successfully.`);
      } else {
        await api.movies.create(payload);
        toast.success(`Created movie "${payload.title}" successfully.`);
      }

      setIsMovieModalOpen(false);
      loadMovies();
      loadDashboardData();
    } catch (err) {
      toast.error(err.message || "Failed to save movie.");
    } finally {
      setSavingMovie(false);
    }
  };

  // Delete Movie
  const handleDeleteMovie = async () => {
    if (!deletingMovieId) return;
    try {
      await api.movies.delete(deletingMovieId);
      toast.success("Movie deleted permanently.");
      setDeletingMovieId(null);
      loadMovies();
      loadDashboardData();
    } catch (err) {
      toast.error(err.message || "Failed to delete movie.");
    }
  };

  // Toggle Movie Publish/Draft
  const handleToggleStatus = async (movie) => {
    const nextStatus = movie.status === "published" ? "draft" : "published";
    try {
      await api.movies.update(movie.id, { status: nextStatus });
      toast.success(`Movie marked as ${nextStatus}.`);
      loadMovies();
      loadDashboardData();
    } catch (err) {
      toast.error(err.message || "Failed to toggle status.");
    }
  };

  // Toggle User Active Status
  const handleToggleUserStatus = async (targetUser) => {
    const nextActive = !targetUser.is_active;
    try {
      await api.admin.toggleUserStatus(targetUser.id, nextActive);
      toast.success(`User ${targetUser.email} ${nextActive ? "activated" : "deactivated"}.`);
      loadUsers();
      loadDashboardData();
    } catch (err) {
      toast.error(err.message || "Failed to toggle user status.");
    }
  };

  // CSV Import
  const handleImportCsv = async (e) => {
    e.preventDefault();
    if (!csvFile) {
      toast.error("Please select a CSV file.");
      return;
    }
    setImportingCsv(true);
    try {
      const res = await api.admin.importCsv(csvFile);
      toast.success(res.message);
      setIsCsvModalOpen(false);
      setCsvFile(null);
      loadMovies();
      loadDashboardData();
    } catch (err) {
      toast.error(err.message || "CSV import failed.");
    } finally {
      setImportingCsv(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Admin Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-secondary/15 border border-secondary/30 flex items-center justify-center text-secondary shadow-glow-cyan">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Administrator Command Center
            </h1>
            <p className="text-xs text-muted-text">
              Live movie catalog controls, platform analytics, user accounts & audit logs.
            </p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface border border-border">
          {[
            { id: "overview", label: "Overview", icon: BarChart3 },
            { id: "movies", label: "Movies", icon: Film },
            { id: "users", label: "Users", icon: Users },
            { id: "activity", label: "Audit Log", icon: Activity },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-primary text-white shadow-glow-violet"
                    : "text-muted-text hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: OVERVIEW & ANALYTICS */}
      {activeTab === "overview" && (
        <div className="space-y-8">
          {loadingStats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-28 rounded-2xl skeleton-shimmer" />
              ))}
            </div>
          ) : stats ? (
            <>
              {/* KPI Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="p-5 rounded-2xl bg-surface border border-border space-y-1">
                  <span className="text-xs font-semibold text-muted-text uppercase">Total Movies</span>
                  <p className="text-2xl font-black text-white">{stats.total_movies}</p>
                  <p className="text-[11px] text-emerald-400 font-medium">{stats.published_movies} Published</p>
                </div>
                <div className="p-5 rounded-2xl bg-surface border border-border space-y-1">
                  <span className="text-xs font-semibold text-muted-text uppercase">Drafts</span>
                  <p className="text-2xl font-black text-white">{stats.draft_movies}</p>
                  <p className="text-[11px] text-amber-400 font-medium">Unpublished</p>
                </div>
                <div className="p-5 rounded-2xl bg-surface border border-border space-y-1">
                  <span className="text-xs font-semibold text-muted-text uppercase">Users</span>
                  <p className="text-2xl font-black text-white">{stats.total_users}</p>
                  <p className="text-[11px] text-secondary font-medium">Active accounts</p>
                </div>
                <div className="p-5 rounded-2xl bg-surface border border-border space-y-1">
                  <span className="text-xs font-semibold text-muted-text uppercase">Ratings</span>
                  <p className="text-2xl font-black text-white">{stats.total_ratings}</p>
                  <p className="text-[11px] text-slate-300 font-medium">{stats.average_platform_rating} \u2605 Avg</p>
                </div>
                <div className="p-5 rounded-2xl bg-surface border border-border space-y-1">
                  <span className="text-xs font-semibold text-muted-text uppercase">Watchlists</span>
                  <p className="text-2xl font-black text-white">{stats.total_watchlist_items}</p>
                  <p className="text-[11px] text-violet-400 font-medium">Saved items</p>
                </div>
                <div className="p-5 rounded-2xl bg-surface border border-border space-y-1">
                  <span className="text-xs font-semibold text-muted-text uppercase">Precision Benchmark</span>
                  <p className="text-2xl font-black text-secondary">{metrics?.positive_feedback_rate_pct || 92}%</p>
                  <p className="text-[11px] text-slate-300 font-medium">{metrics?.catalog_coverage_pct || 85}% Coverage</p>
                </div>
              </div>

              {/* Recharts Analytics Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Genre Distribution Bar Chart */}
                <div className="p-6 rounded-2xl bg-surface border border-border shadow-card space-y-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" /> Movie Catalog By Genre
                  </h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.genre_distribution.slice(0, 8)}>
                        <XAxis dataKey="genre" stroke="#A5B0C5" fontSize={11} tickLine={false} />
                        <YAxis stroke="#A5B0C5" fontSize={11} tickLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: "#171F32", borderColor: "#293249", borderRadius: "10px", fontSize: "12px", color: "#fff" }} 
                        />
                        <Bar dataKey="count" fill="#8B5CF6" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Rating Distribution Chart */}
                <div className="p-6 rounded-2xl bg-surface border border-border shadow-card space-y-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-400" /> Platform Ratings Distribution
                  </h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.rating_distribution}>
                        <XAxis dataKey="rating" stroke="#A5B0C5" fontSize={11} tickLine={false} tickFormatter={(v) => `${v} ★`} />
                        <YAxis stroke="#A5B0C5" fontSize={11} tickLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: "#171F32", borderColor: "#293249", borderRadius: "10px", fontSize: "12px", color: "#fff" }} 
                        />
                        <Bar dataKey="count" fill="#22D3EE" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>

              {/* Top Rankings Rows */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Most Rated */}
                <div className="p-5 rounded-2xl bg-surface border border-border space-y-3">
                  <h4 className="text-xs font-bold text-muted-text uppercase tracking-wider">Most Rated Titles</h4>
                  <div className="space-y-2">
                    {stats.most_rated_movies?.length > 0 ? (
                      stats.most_rated_movies.map((m) => (
                        <div key={m.id} className="flex items-center justify-between text-xs">
                          <span className="text-white font-medium truncate max-w-[180px]">{m.title}</span>
                          <span className="text-amber-400 font-bold">{m.ratings_count} ratings</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-text">No user ratings submitted yet.</p>
                    )}
                  </div>
                </div>

                {/* Highest Rated */}
                <div className="p-5 rounded-2xl bg-surface border border-border space-y-3">
                  <h4 className="text-xs font-bold text-muted-text uppercase tracking-wider">Top Rated Classics</h4>
                  <div className="space-y-2">
                    {stats.highest_rated_movies?.map((m) => (
                      <div key={m.id} className="flex items-center justify-between text-xs">
                        <span className="text-white font-medium truncate max-w-[180px]">{m.title}</span>
                        <span className="text-amber-400 font-bold">{m.rating.toFixed(1)} \u2605</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Feedback Breakdown */}
                <div className="p-5 rounded-2xl bg-surface border border-border space-y-3">
                  <h4 className="text-xs font-bold text-muted-text uppercase tracking-wider">Recommendation Feedback</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-300">Useful:</span>
                      <strong className="text-emerald-400">{stats.feedback_summary?.useful || 0}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-300">Seen Already:</span>
                      <strong className="text-secondary">{stats.feedback_summary?.already_watched || 0}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-300">Not Interested:</span>
                      <strong className="text-rose-400">{stats.feedback_summary?.not_interested || 0}</strong>
                    </div>
                  </div>
                </div>

              </div>
            </>
          ) : (
            <p className="text-xs text-muted-text">Failed to load statistics.</p>
          )}
        </div>
      )}

      {/* TAB 2: MOVIES MANAGEMENT */}
      {activeTab === "movies" && (
        <div className="space-y-6">
          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <select
                value={movieStatusFilter}
                onChange={(e) => { setMovieStatusFilter(e.target.value); setMoviePage(1); }}
                className="bg-surface border border-border text-xs rounded-xl px-3 py-2 text-white focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="published">Published Only</option>
                <option value="draft">Drafts Only</option>
              </select>
              <span className="text-xs text-muted-text">Total: {moviesTotal}</span>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                onClick={() => setIsCsvModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-surface border border-border hover:bg-surface-elevated text-white text-xs font-semibold flex items-center gap-2 transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-secondary" /> Bulk Import CSV
              </button>
              <button
                onClick={() => openMovieModal()}
                className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold shadow-glow-violet hover:bg-primary-hover flex items-center gap-2 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Movie
              </button>
            </div>
          </div>

          {/* Movies Table */}
          <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-surface-elevated border-b border-border text-muted-text uppercase font-semibold">
                  <tr>
                    <th className="p-3.5">Title</th>
                    <th className="p-3.5">Year</th>
                    <th className="p-3.5">Language</th>
                    <th className="p-3.5">Rating</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {moviesList.map((movie) => (
                    <tr key={movie.id} className="hover:bg-surface-elevated/40 transition-colors">
                      <td className="p-3.5 font-semibold text-white">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-9 rounded bg-surface-elevated overflow-hidden shrink-0 border border-border">
                            {movie.poster_url && (
                              <img src={movie.poster_url} alt="" className="w-full h-full object-cover" />
                            )}
                          </div>
                          <span className="truncate max-w-[220px]">{movie.title}</span>
                        </div>
                      </td>
                      <td className="p-3.5">{movie.release_date?.slice(0, 4) || "—"}</td>
                      <td className="p-3.5">{movie.language || "English"}</td>
                      <td className="p-3.5 font-bold text-amber-400">
                        {movie.external_rating ? `${movie.external_rating.toFixed(1)} ★` : "—"}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            movie.status === "published"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                          }`}
                        >
                          {movie.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right space-x-1">
                        <button
                          onClick={() => handleToggleStatus(movie)}
                          className="p-1.5 rounded-lg text-muted-text hover:text-secondary hover:bg-surface-elevated transition-colors"
                          title={movie.status === "published" ? "Unpublish to Draft" : "Publish to Public"}
                        >
                          {movie.status === "published" ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => openMovieModal(movie)}
                          className="p-1.5 rounded-lg text-muted-text hover:text-white hover:bg-surface-elevated transition-colors"
                          title="Edit movie"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingMovieId(movie.id)}
                          className="p-1.5 rounded-lg text-muted-text hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Delete movie"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-4 border-t border-border flex items-center justify-between text-xs text-muted-text">
              <span>Showing {moviesList.length} of {moviesTotal} records</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setMoviePage((p) => Math.max(p - 1, 1))}
                  disabled={moviePage === 1}
                  className="px-3 py-1 rounded-lg bg-surface-elevated border border-border text-white disabled:opacity-40"
                >
                  Prev
                </button>
                <button
                  onClick={() => setMoviePage((p) => p + 1)}
                  disabled={moviesList.length < 15}
                  className="px-3 py-1 rounded-lg bg-surface-elevated border border-border text-white disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: USERS MANAGEMENT */}
      {activeTab === "users" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-text" />
              <input
                type="text"
                placeholder="Search registered users..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full bg-surface border border-border rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-muted-text focus:outline-none focus:border-primary"
              />
            </div>
            <span className="text-xs text-muted-text">Total Users: {usersList.length}</span>
          </div>

          <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-card">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-surface-elevated border-b border-border text-muted-text uppercase font-semibold">
                <tr>
                  <th className="p-3.5">Name</th>
                  <th className="p-3.5">Email</th>
                  <th className="p-3.5">Role</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Joined</th>
                  <th className="p-3.5 text-right">Active Toggle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-surface-elevated/40 transition-colors">
                    <td className="p-3.5 font-bold text-white">{u.name}</td>
                    <td className="p-3.5">{u.email}</td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        u.role === "admin" ? "bg-secondary/15 text-secondary border border-secondary/30" : "text-muted-text"
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        u.is_active ? "text-emerald-400 bg-emerald-500/10" : "text-rose-400 bg-rose-500/10"
                      }`}>
                        {u.is_active ? "Active" : "Deactivated"}
                      </span>
                    </td>
                    <td className="p-3.5">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => handleToggleUserStatus(u)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                          u.is_active
                            ? "bg-rose-500/15 text-rose-300 hover:bg-rose-500/30"
                            : "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/30"
                        }`}
                      >
                        {u.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT LOG */}
      {activeTab === "activity" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center text-xs text-muted-text border-b border-border pb-3">
            <span>Recent System & Administrative Actions</span>
            <button onClick={loadActivities} className="text-secondary hover:underline flex items-center gap-1">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh Log
            </button>
          </div>

          <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-card">
            <div className="divide-y divide-border/60">
              {activities.map((act) => (
                <div key={act.id} className="p-4 flex items-start justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-secondary uppercase tracking-wider">{act.action}</span>
                      <span className="text-muted-text">• by {act.admin_name || "Admin"}</span>
                    </div>
                    <p className="text-slate-200">{act.details}</p>
                  </div>
                  <span className="text-muted-text shrink-0">{new Date(act.created_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT MOVIE MODAL */}
      {isMovieModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div 
            className="relative w-full max-w-2xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden p-6 max-h-[90vh] overflow-y-auto space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-bold text-white">
                {editingMovie ? `Edit Movie: ${editingMovie.title}` : "Add New Movie to Catalogue"}
              </h3>
              <button onClick={() => setIsMovieModalOpen(false)} className="text-muted-text hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMovie} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-muted-text uppercase font-semibold mb-1">Title *</label>
                  <input
                    type="text"
                    required
                    value={movieForm.title}
                    onChange={(e) => setMovieForm({ ...movieForm, title: e.target.value })}
                    className="w-full bg-surface-elevated border border-border rounded-xl px-3 py-2 text-white focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-muted-text uppercase font-semibold mb-1">Release Date (YYYY-MM-DD)</label>
                  <input
                    type="text"
                    placeholder="2024-03-01"
                    value={movieForm.release_date}
                    onChange={(e) => setMovieForm({ ...movieForm, release_date: e.target.value })}
                    className="w-full bg-surface-elevated border border-border rounded-xl px-3 py-2 text-white focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-muted-text uppercase font-semibold mb-1">Synopsis</label>
                <textarea
                  rows={3}
                  value={movieForm.description}
                  onChange={(e) => setMovieForm({ ...movieForm, description: e.target.value })}
                  className="w-full bg-surface-elevated border border-border rounded-xl p-3 text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-muted-text uppercase font-semibold mb-1">Runtime (Minutes)</label>
                  <input
                    type="number"
                    value={movieForm.runtime_minutes}
                    onChange={(e) => setMovieForm({ ...movieForm, runtime_minutes: e.target.value })}
                    className="w-full bg-surface-elevated border border-border rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-muted-text uppercase font-semibold mb-1">Language</label>
                  <input
                    type="text"
                    value={movieForm.language}
                    onChange={(e) => setMovieForm({ ...movieForm, language: e.target.value })}
                    className="w-full bg-surface-elevated border border-border rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-muted-text uppercase font-semibold mb-1">External Rating (0-10)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={movieForm.external_rating}
                    onChange={(e) => setMovieForm({ ...movieForm, external_rating: e.target.value })}
                    className="w-full bg-surface-elevated border border-border rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-muted-text uppercase font-semibold mb-1">Director</label>
                  <input
                    type="text"
                    value={movieForm.director}
                    onChange={(e) => setMovieForm({ ...movieForm, director: e.target.value })}
                    className="w-full bg-surface-elevated border border-border rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-muted-text uppercase font-semibold mb-1">Cast Members</label>
                  <input
                    type="text"
                    placeholder="Comma separated"
                    value={movieForm.cast}
                    onChange={(e) => setMovieForm({ ...movieForm, cast: e.target.value })}
                    className="w-full bg-surface-elevated border border-border rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-muted-text uppercase font-semibold mb-1">Genres (Comma separated)</label>
                <input
                  type="text"
                  placeholder="Sci-Fi, Action, Thriller"
                  value={movieForm.genres}
                  onChange={(e) => setMovieForm({ ...movieForm, genres: e.target.value })}
                  className="w-full bg-surface-elevated border border-border rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-muted-text uppercase font-semibold mb-1">Mood Tags (Comma separated)</label>
                  <input
                    type="text"
                    placeholder="Mind-Bending, Suspenseful"
                    value={movieForm.moods}
                    onChange={(e) => setMovieForm({ ...movieForm, moods: e.target.value })}
                    className="w-full bg-surface-elevated border border-border rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-muted-text uppercase font-semibold mb-1">Keywords</label>
                  <input
                    type="text"
                    placeholder="dreams, heist, time"
                    value={movieForm.keywords}
                    onChange={(e) => setMovieForm({ ...movieForm, keywords: e.target.value })}
                    className="w-full bg-surface-elevated border border-border rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              {/* Poster URL or File Upload */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border">
                <div>
                  <label className="block text-muted-text uppercase font-semibold mb-1">Poster Image URL</label>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={movieForm.poster_url}
                    onChange={(e) => setMovieForm({ ...movieForm, poster_url: e.target.value })}
                    className="w-full bg-surface-elevated border border-border rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-muted-text uppercase font-semibold mb-1">Upload Local Poster File</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePosterFileUpload}
                    disabled={uploadingPoster}
                    className="w-full text-xs text-slate-300 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-surface-elevated file:text-white hover:file:bg-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-muted-text uppercase font-semibold mb-1">Trailer YouTube Link</label>
                  <input
                    type="text"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={movieForm.trailer_url}
                    onChange={(e) => setMovieForm({ ...movieForm, trailer_url: e.target.value })}
                    className="w-full bg-surface-elevated border border-border rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-muted-text uppercase font-semibold mb-1">Status</label>
                  <select
                    value={movieForm.status}
                    onChange={(e) => setMovieForm({ ...movieForm, status: e.target.value })}
                    className="w-full bg-surface-elevated border border-border rounded-xl px-3 py-2 text-white"
                  >
                    <option value="published">Published (Visible in catalogue)</option>
                    <option value="draft">Draft (Hidden from public)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsMovieModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-surface-elevated text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingMovie}
                  className="px-6 py-2 rounded-xl bg-primary text-white font-semibold shadow-glow-violet hover:bg-primary-hover"
                >
                  {savingMovie ? "Saving..." : editingMovie ? "Update Movie" : "Create Movie"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV IMPORT MODAL */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md bg-surface border border-border rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-secondary" /> Bulk Import Movies (CSV)
              </h3>
              <button onClick={() => setIsCsvModalOpen(false)} className="text-muted-text hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-muted-text leading-relaxed">
              Upload a valid CSV with headers: <code>title, description, release_date, runtime_minutes, language, director, cast, genres, moods, external_rating</code>
            </p>

            <form onSubmit={handleImportCsv} className="space-y-4">
              <input
                type="file"
                accept=".csv"
                required
                onChange={(e) => setCsvFile(e.target.files[0])}
                className="w-full text-xs text-slate-300 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-surface-elevated file:text-white hover:file:bg-primary"
              />

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCsvModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-surface-elevated text-slate-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={importingCsv}
                  className="px-6 py-2 rounded-xl bg-primary text-white text-xs font-semibold shadow-glow-violet"
                >
                  {importingCsv ? "Importing..." : "Start Import"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingMovieId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-sm bg-surface border border-border rounded-2xl p-6 space-y-4 text-center">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
            <h3 className="text-base font-bold text-white">Confirm Movie Deletion</h3>
            <p className="text-xs text-muted-text">
              Are you sure you want to delete this movie? This will also remove associated ratings and watchlist entries.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => setDeletingMovieId(null)}
                className="px-4 py-2 rounded-xl bg-surface-elevated text-slate-300 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteMovie}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
