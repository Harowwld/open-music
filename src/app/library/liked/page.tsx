"use client";

import { useState, useEffect } from "react";
import { usePlayer, Track } from "@/context/PlayerContext";
import { Play, Trash2, Download, Heart, Disc, Check, Loader2 } from "lucide-react";
import TrackContextMenu from "@/components/TrackContextMenu";

export default function LibraryPage() {
  const [results, setResults] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const { playTrack, currentTrack, isPlaying, openAlbumModal, addToQueue, downloadingTrackIds, downloadedTrackIds, downloadTrack, removeDownload } = usePlayer();

  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, track: Track } | null>(null);

  const fetchLibrary = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/library`);
      if (!res.ok) throw new Error("Failed to load library");
      const data = await res.json();
      setResults(data.tracks || []);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLibrary();
  }, []);

  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    document.addEventListener("click", handleClickOutside);
    window.addEventListener("scroll", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
      window.removeEventListener("scroll", handleClickOutside);
    };
  }, []);

  const handleContextMenu = (e: React.MouseEvent, track: Track) => {
    e.preventDefault();
    const menuWidth = 200;
    const menuHeight = 120;
    let x = e.pageX;
    let y = e.pageY;

    if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth - 10;
    if (y + menuHeight > window.innerHeight) y = window.innerHeight - menuHeight - 10;

    setContextMenu({ x, y, track });
  };

  const removeFromLibrary = async (track: Track) => {
    try {
      await fetch(`/api/library?id=${track.id}`, { method: "DELETE" });
      setResults(results.filter(t => t.id !== track.id));
    } catch (e) {
      alert("Failed to remove track");
    }
  };

  const formatDuration = (val?: number | string) => {
    if (!val) return "";
    if (typeof val === 'string' && val.includes(':') && !val.includes('NaN')) return val;
    const num = Number(val);
    if (isNaN(num)) return "";
    const m = Math.floor(num / 60);
    const s = Math.floor(num % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="p-8 pb-32">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => window.history.back()} 
            className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center hover:scale-105 transition-transform text-[var(--text-muted)] hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <h1 className="text-4xl font-bold text-white">Liked Songs</h1>
        </div>

        {isLoading && (
          <div className="flex justify-center my-12">
            <span className="animate-spin text-3xl">💿</span>
          </div>
        )}

        {error && (
          <div className="text-red-500 text-center bg-red-500/10 py-4 rounded-lg">
            {error}
          </div>
        )}

        {!isLoading && results.length === 0 && !error && (
          <div className="text-center py-20 text-[var(--text-muted)]">
            <span className="text-4xl block mb-4">🎵</span>
            <p>Your liked songs will appear here. Go like some songs!</p>
          </div>
        )}

        {!isLoading && results.length > 0 && (
          <div className="flex flex-col gap-2">
            {results.map((track) => {
              const isCurrentlyPlaying = currentTrack?.id === track.id;
              
              return (
                <div
                  key={track.id}
                  onClick={() => playTrack(track)}
                  onContextMenu={(e) => handleContextMenu(e, track)}
                  className={`flex items-center justify-between p-3 rounded-md cursor-pointer hover:bg-[var(--card-hover)] transition-colors group ${
                    isCurrentlyPlaying ? "bg-[var(--card-hover)]" : ""
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="relative w-12 h-12 rounded overflow-hidden shadow-md flex-shrink-0">
                      {track.thumbnail ? (
                        <img
                          src={track.thumbnail}
                          alt={track.title}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-800" />
                      )}
                      <div className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center">
                        <span className="text-white text-xl">
                          {isCurrentlyPlaying && isPlaying ? "⏸" : "▶"}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className={`font-semibold ${isCurrentlyPlaying ? "text-[var(--brand-gold)]" : "text-white"}`}>
                        {track.title}
                      </span>
                      <span className="text-sm text-[var(--text-muted)] flex items-center gap-1.5">
                        {downloadingTrackIds.has(track.id) ? (
                          <Loader2 className="w-3.5 h-3.5 text-[var(--brand-gold)] animate-spin" title="Downloading..." />
                        ) : downloadedTrackIds.has(track.id) ? (
                          <Check className="w-3.5 h-3.5 text-[var(--brand-gold)]" title="Downloaded" />
                        ) : null}
                        {track.artist}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm text-[var(--text-muted)] flex items-center gap-4">
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeFromLibrary(track); }}
                      className="text-[var(--brand-gold)] hover:text-[var(--text-muted)] transition-colors"
                      title="Unlike"
                    >
                      <Heart className="w-5 h-5 fill-current" />
                    </button>
                    {formatDuration(track.duration)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Context Menu Overlay */}
      {contextMenu && (
        <TrackContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          track={contextMenu.track}
          onClose={() => setContextMenu(null)}
          onPlay={playTrack}
          onAddToQueue={addToQueue}
          onToggleLike={removeFromLibrary}
          onAddToAlbum={openAlbumModal}
          onDownload={downloadTrack}
          onRemoveDownload={removeDownload}
          isDownloaded={downloadedTrackIds.has(contextMenu.track.id)}
        />
      )}
    </div>
  );
}
