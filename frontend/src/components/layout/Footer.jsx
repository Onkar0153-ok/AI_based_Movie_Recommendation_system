import React from "react";
import { Film, Heart, Sparkles, Shield, Database } from "lucide-react";

export const Footer = ({ navigate }) => {
  return (
    <footer className="border-t border-border bg-surface mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Brand info */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Film className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">
                CineMatch <span className="text-secondary text-xs uppercase px-1 py-0.5 rounded bg-secondary/15">AI</span>
              </span>
            </div>
            <p className="text-sm text-muted-text max-w-md leading-relaxed">
              An intelligent, transparent movie discovery and recommendation platform combining rule-based multi-criteria scoring, local TF-IDF semantic content similarity, and natural-language query processing.
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-text pt-2">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Database className="w-3.5 h-3.5 text-secondary" /> Local SQLite Persistence
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <Sparkles className="w-3.5 h-3.5 text-primary" /> Explainable Matching
              </span>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Discovery</h4>
            <ul className="space-y-2 text-sm text-muted-text">
              <li>
                <button onClick={() => navigate("home")} className="hover:text-secondary transition-colors">
                  Home Spotlight
                </button>
              </li>
              <li>
                <button onClick={() => navigate("discover")} className="hover:text-secondary transition-colors">
                  Browse All Movies
                </button>
              </li>
              <li>
                <button onClick={() => navigate("for-you")} className="hover:text-secondary transition-colors">
                  Personalized For You
                </button>
              </li>
              <li>
                <button onClick={() => navigate("moods")} className="hover:text-secondary transition-colors">
                  Mood Discovery Engine
                </button>
              </li>
            </ul>
          </div>

          {/* Technology & Disclaimers */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Architecture</h4>
            <ul className="space-y-2 text-sm text-muted-text">
              <li>FastAPI + Python 3.12</li>
              <li>React 19 + Vite 8 + Tailwind</li>
              <li>scikit-learn (TF-IDF & Cosine)</li>
              <li>SQLAlchemy 2.0 ORM</li>
              <li>Recharts Analytics</li>
            </ul>
          </div>

        </div>

        <div className="mt-12 pt-8 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-text">
          <p>© {new Date().getFullYear()} CineMatch AI. Built for movie discovery and educational recommendation modeling.</p>
          <p className="flex items-center gap-1">
            Engineered with <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> for cinematic discovery.
          </p>
        </div>
      </div>
    </footer>
  );
};
