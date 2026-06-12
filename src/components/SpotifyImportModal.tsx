"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Music, CheckCircle2, AlertCircle } from "lucide-react";

interface SpotifyImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SpotifyImportModal({ isOpen, onClose, onSuccess }: SpotifyImportModalProps) {
  const [url, setUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  
  const [progress, setProgress] = useState<{
    totalTracks: number;
    completedTracks: number;
    failedTracks: number;
    status: 'processing' | 'completed' | 'failed';
    currentTrack?: string;
  } | null>(null);

  // Poll for progress
  useEffect(() => {
    if (!jobId || progress?.status === 'completed' || progress?.status === 'failed') return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/import/spotify/${jobId}`);
        const data = await res.json();
        
        if (res.ok && data.job) {
          setProgress(data.job);
          if (data.job.status === 'completed' || data.job.status === 'failed') {
            clearInterval(interval);
            fetch(`/api/import/spotify/${jobId}`, { method: 'DELETE' }).catch(console.error);
          }
        }
      } catch (err) {
        console.error("Failed to poll progress:", err);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [jobId, progress?.status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.includes('spotify.com/album') && !url.includes('spotify.com/playlist')) {
      setError("Please enter a valid Spotify Album or Playlist URL");
      return;
    }
    
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/import/spotify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to start import");
      }

      setJobId(data.jobId);
    } catch (err: any) {
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (progress?.status === 'completed') {
      onSuccess();
    }
    setUrl("");
    setError(null);
    setJobId(null);
    setProgress(null);
    setIsSubmitting(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[var(--card-bg)] w-full max-w-md rounded-2xl shadow-2xl border border-[var(--border-color)] overflow-hidden flex flex-col transform transition-all animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6 pb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Music className="w-5 h-5 text-[#1DB954]" />
            Import from Spotify
          </h2>
          <button onClick={handleClose} className="p-2 rounded-full hover:bg-[var(--card-hover)] text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 pt-0">
          {!jobId ? (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <p className="text-sm text-[var(--text-muted)]">
                Paste a Spotify Album or Playlist URL. We'll search for the tracks on YouTube Music and add them to your library.
              </p>
              
              <div>
                <input
                  type="text"
                  placeholder="https://open.spotify.com/album/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full bg-[var(--search-bg)] border border-[var(--border-color)] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)] transition-all"
                  autoFocus
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={!url || isSubmitting}
                className="w-full py-3 bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl mt-2 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Starting Import...
                  </>
                ) : (
                  'Start Import'
                )}
              </button>
            </form>
          ) : (
            <div className="flex flex-col gap-6 py-4">
              {progress?.status === 'failed' ? (
                <div className="flex flex-col items-center gap-4 text-center">
                  <AlertCircle className="w-12 h-12 text-red-500 mb-2" />
                  <h3 className="text-xl font-bold text-white">Import Failed</h3>
                  <p className="text-[var(--text-muted)] text-sm">{error || "An unexpected error occurred during processing."}</p>
                  <button onClick={handleClose} className="mt-4 px-6 py-2 bg-[var(--card-hover)] text-white font-medium rounded-full hover:bg-gray-700 transition-colors">
                    Close
                  </button>
                </div>
              ) : progress?.status === 'completed' ? (
                <div className="flex flex-col items-center gap-4 text-center">
                  <CheckCircle2 className="w-16 h-16 text-[#1DB954] mb-2 animate-in zoom-in" />
                  <h3 className="text-2xl font-bold text-white">Import Complete!</h3>
                  <p className="text-[var(--text-muted)] text-sm">
                    Successfully imported {progress.completedTracks} tracks. 
                    {progress.failedTracks > 0 && ` Failed to find ${progress.failedTracks} tracks.`}
                  </p>
                  <button onClick={handleClose} className="mt-4 px-8 py-3 bg-[#1DB954] text-black font-bold rounded-full hover:brightness-110 transition-all shadow-lg">
                    View Album
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-sm font-medium text-white">Processing Tracks...</span>
                    <span className="text-xs text-[var(--text-muted)] font-mono">
                      {progress ? `${progress.completedTracks + progress.failedTracks} / ${progress.totalTracks}` : '0 / 0'}
                    </span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden relative">
                    <div 
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#1DB954] to-green-400 transition-all duration-300 ease-out"
                      style={{ 
                        width: progress ? `${((progress.completedTracks + progress.failedTracks) / progress.totalTracks) * 100}%` : '0%' 
                      }}
                    />
                  </div>

                  {progress?.currentTrack ? (
                    <p className="text-xs text-[var(--text-muted)] truncate text-center mt-2">
                      Searching: <span className="text-white font-medium">{progress.currentTrack}</span>
                    </p>
                  ) : (
                    <p className="text-xs text-[var(--text-muted)] truncate text-center mt-2 animate-pulse">
                      Initializing...
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
