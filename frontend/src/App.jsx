import React, { useState, useEffect } from "react";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { Navbar } from "./components/layout/Navbar";
import { Footer } from "./components/layout/Footer";
import { AuthModal } from "./components/common/AuthModal";

// Pages
import { HomePage } from "./pages/HomePage";
import { DiscoverPage } from "./pages/DiscoverPage";
import { MovieDetailPage } from "./pages/MovieDetailPage";
import { ForYouPage } from "./pages/ForYouPage";
import { MoodFinderPage } from "./pages/MoodFinderPage";
import { WatchlistPage } from "./pages/WatchlistPage";
import { ProfilePage } from "./pages/ProfilePage";
import { AdminPage } from "./pages/AdminPage";

// Lightweight hash parser & state synchronization
function parseHash() {
  const hash = window.location.hash.replace(/^#\/?/, "");
  if (!hash) return { page: "home", params: {} };

  const [path, queryString] = hash.split("?");
  const params = {};
  if (queryString) {
    const searchParams = new URLSearchParams(queryString);
    for (const [k, v] of searchParams.entries()) {
      params[k] = v;
    }
  }
  return { page: path || "home", params };
}

function MainApp() {
  const [route, setRoute] = useState(parseHash());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState("login");

  // Listen to hashchange events (back / forward navigation)
  useEffect(() => {
    const handleHashChange = () => {
      setRoute(parseHash());
      window.scrollTo(0, 0);
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const navigate = (page, params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") {
        query.append(k, v);
      }
    });
    const qs = query.toString();
    const newHash = qs ? `#/${page}?${qs}` : `#/${page}`;
    window.location.hash = newHash;
    setRoute({ page, params });
    window.scrollTo(0, 0);
  };

  const openAuthModal = (mode = "login") => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const renderCurrentPage = () => {
    switch (route.page) {
      case "discover":
        return <DiscoverPage navigate={navigate} initialQuery={route.params.q || ""} />;
      case "movie":
        return (
          <MovieDetailPage
            movieId={parseInt(route.params.id) || 1}
            navigate={navigate}
          />
        );
      case "for-you":
        return <ForYouPage navigate={navigate} openAuthModal={openAuthModal} />;
      case "moods":
        return (
          <MoodFinderPage
            navigate={navigate}
            initialMood={route.params.mood || "Mind-Bending"}
          />
        );
      case "watchlist":
        return <WatchlistPage navigate={navigate} openAuthModal={openAuthModal} />;
      case "profile":
        return <ProfilePage navigate={navigate} openAuthModal={openAuthModal} />;
      case "admin":
        return <AdminPage navigate={navigate} />;
      case "home":
      default:
        return <HomePage navigate={navigate} />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-primary-text">
      {/* Top Navbar */}
      <Navbar
        currentRoute={route}
        navigate={navigate}
        openAuthModal={openAuthModal}
      />

      {/* Main Page Area */}
      <main className="flex-1">
        {renderCurrentPage()}
      </main>

      {/* Footer */}
      <Footer navigate={navigate} />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <MainApp />
      </ToastProvider>
    </AuthProvider>
  );
}
