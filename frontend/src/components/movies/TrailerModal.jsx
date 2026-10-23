import React from "react";
import { X, ExternalLink, Film } from "lucide-react";

export const TrailerModal = ({ isOpen, onClose, movie }) => {
  if (!isOpen || !movie) return null;

  // Extract YouTube embed URL if valid YouTube link
  let embedUrl = null;
  if (movie.trailer_url) {
    const ytMatch = movie.trailer_url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    if (ytMatch && ytMatch[1]) {
      embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0`;
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-4xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-surface-elevated">
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-secondary" />
            <h3 className="font-bold text-white text-base sm:text-lg">
              {movie.title} <span className="text-muted-text text-sm font-normal">— Official Trailer</span>
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-muted-text hover:text-white p-1 rounded-lg hover:bg-surface transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Player or Fallback */}
        <div className="relative aspect-video w-full bg-black flex items-center justify-center">
          {embedUrl ? (
            <iframe
              src={embedUrl}
              title={`${movie.title} Trailer`}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : movie.trailer_url ? (
            <div className="text-center p-8 space-y-4">
              <Film className="w-16 h-16 text-muted-text mx-auto" />
              <p className="text-slate-200 text-sm">Direct trailer link available on external player:</p>
              <a
                href={movie.trailer_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm shadow-glow-violet hover:bg-primary-hover transition-colors"
              >
                Open Trailer <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          ) : (
            <div className="text-center p-8 text-muted-text text-sm">
              <Film className="w-12 h-12 mx-auto mb-2 opacity-50" />
              No trailer preview currently available for this title.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
