import React, { useState, useEffect, useRef } from "react";
import { 
  Film, Sparkles, Search, Bookmark, User as UserIcon, 
  LogOut, Shield, Compass, Smile, Menu, X, Star, ChevronDown 
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../api/client";

export const Navbar = ({ currentRoute, navigate, openAuthModal }) => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const searchRef = useRef(null);
  const userMenuRef = useRef(null);

  // Debounced search autocomplete
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await api.search.getSuggestions(searchQuery.trim());
        setSuggestions(results);
        setShowDropdown(results.length > 0);
      } catch (err) {
        console.error("Autocomplete error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowDropdown(false);
      navigate("discover", { q: searchQuery.trim() });
    }
  };

  const handleSuggestionClick = (movie) => {
    setShowDropdown(false);
    setSearchQuery("");
    navigate("movie", { id: movie.id });
  };

  const navLinks = [
    { id: "home", label: "Home", icon: Film },
    { id: "discover", label: "Discover", icon: Compass },
    { id: "for-you", label: "For You", icon: Sparkles, highlight: true },
    { id: "moods", label: "Moods", icon: Smile },
    { id: "watchlist", label: "Watchlist", icon: Bookmark, authRequired: true },
  ];

  return (
    <nav className="sticky top-0 z-40 w-full glass-panel border-b border-border bg-background/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Brand Logo */}
          <div 
            onClick={() => navigate("home")}
            className="flex items-center gap-2.5 cursor-pointer group shrink-0"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-glow-violet group-hover:scale-105 transition-transform duration-200">
              <Film className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                CineMatch <span className="text-secondary text-sm font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-secondary/15 border border-secondary/30">AI</span>
              </span>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-1.5 lg:gap-2">
            {navLinks.map((link) => {
              if (link.authRequired && !isAuthenticated) return null;
              const Icon = link.icon;
              const isActive = currentRoute.page === link.id;

              return (
                <button
                  key={link.id}
                  onClick={() => navigate(link.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? "bg-primary/20 text-white border border-primary/40 shadow-sm"
                      : "text-muted-text hover:text-white hover:bg-surface-elevated/70"
                  } ${link.highlight && !isActive ? "text-violet-300 hover:text-violet-100" : ""}`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-secondary" : ""}`} />
                  {link.label}
                </button>
              );
            })}
          </div>

          {/* Global Search Bar */}
          <div className="flex-1 max-w-md relative" ref={searchRef}>
            <form onSubmit={handleSearchSubmit}>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-text" />
                <input
                  type="text"
                  placeholder="Search titles, 'Sci-Fi released after 2020'..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
                  className="w-full bg-surface border border-border text-sm rounded-xl pl-10 pr-4 py-2 text-white placeholder-muted-text focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                )}
              </div>
            </form>

            {/* Autocomplete Dropdown */}
            {showDropdown && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 mt-2 glass-dropdown rounded-xl shadow-2xl py-2 z-50 max-h-96 overflow-y-auto animate-in fade-in duration-150">
                <div className="px-3 py-1 text-xs font-semibold text-muted-text uppercase tracking-wider">
                  Suggestions
                </div>
                {suggestions.map((movie) => (
                  <div
                    key={movie.id}
                    onClick={() => handleSuggestionClick(movie)}
                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-surface-elevated/90 cursor-pointer transition-colors group"
                  >
                    <div className="w-9 h-12 rounded bg-surface-elevated overflow-hidden shrink-0 border border-border/50">
                      {movie.poster_url ? (
                        <img 
                          src={movie.poster_url} 
                          alt={movie.title} 
                          className="w-full h-full object-cover"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-text text-xs">
                          <Film className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate group-hover:text-secondary transition-colors">
                        {movie.title}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-text mt-0.5">
                        <span>{movie.release_date ? movie.release_date.slice(0, 4) : "N/A"}</span>
                        {movie.genres?.length > 0 && (
                          <>
                            <span>•</span>
                            <span className="truncate">{movie.genres.join(", ")}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {movie.external_rating && (
                      <div className="flex items-center gap-1 text-xs text-amber-400 font-semibold shrink-0">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        {movie.external_rating.toFixed(1)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* User / Auth Action Controls */}
          <div className="flex items-center gap-3 shrink-0">
            {isAuthenticated ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2.5 p-1.5 pr-3 rounded-xl bg-surface border border-border hover:border-primary/50 transition-all text-sm"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-violet-400 flex items-center justify-center text-white font-bold text-xs uppercase shadow-sm">
                    {user?.name?.slice(0, 2) || "U"}
                  </div>
                  <span className="hidden sm:inline font-medium text-slate-200 max-w-[120px] truncate">
                    {user?.name}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-text" />
                </button>

                {/* Dropdown Menu */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 glass-dropdown rounded-xl shadow-2xl py-2 z-50 animate-in fade-in duration-150">
                    <div className="px-4 py-2 border-b border-border/60">
                      <p className="text-xs text-muted-text">Signed in as</p>
                      <p className="text-sm font-semibold text-white truncate">{user?.email}</p>
                      {isAdmin && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-secondary uppercase tracking-wider mt-1 px-1.5 py-0.5 bg-secondary/10 rounded border border-secondary/20">
                          <Shield className="w-3 h-3" /> Administrator
                        </span>
                      )}
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => { setShowUserMenu(false); navigate("profile"); }}
                        className="w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-surface-elevated hover:text-white flex items-center gap-2.5 transition-colors"
                      >
                        <UserIcon className="w-4 h-4 text-primary" />
                        Profile & Taste
                      </button>

                      <button
                        onClick={() => { setShowUserMenu(false); navigate("watchlist"); }}
                        className="w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-surface-elevated hover:text-white flex items-center gap-2.5 transition-colors"
                      >
                        <Bookmark className="w-4 h-4 text-secondary" />
                        My Watchlist
                      </button>

                      {isAdmin && (
                        <button
                          onClick={() => { setShowUserMenu(false); navigate("admin"); }}
                          className="w-full text-left px-4 py-2 text-sm text-violet-300 hover:bg-surface-elevated hover:text-violet-100 flex items-center gap-2.5 transition-colors"
                        >
                          <Shield className="w-4 h-4 text-secondary" />
                          Admin Panel
                        </button>
                      )}
                    </div>

                    <div className="border-t border-border/60 pt-1">
                      <button
                        onClick={() => { setShowUserMenu(false); logout(); }}
                        className="w-full text-left px-4 py-2 text-sm text-rose-400 hover:bg-rose-500/10 flex items-center gap-2.5 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => openAuthModal("login")}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-primary-hover hover:from-primary-hover hover:to-primary text-white font-semibold text-sm shadow-glow-violet hover:shadow-lg transition-all"
              >
                Sign In
              </button>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-muted-text hover:text-white rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border py-3 space-y-1">
            {navLinks.map((link) => {
              if (link.authRequired && !isAuthenticated) return null;
              const Icon = link.icon;
              const isActive = currentRoute.page === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => {
                    navigate(link.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium ${
                    isActive ? "bg-primary/20 text-white" : "text-muted-text hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
};
