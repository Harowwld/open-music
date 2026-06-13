"use client";

import { useState, useEffect } from "react";
import { usePlayer, Track } from "@/context/PlayerContext";
import { Play, Trash2, Download as DownloadIcon, Heart, Disc, Check, Loader2, ListPlus, CloudOff } from "lucide-react";
import TrackContextMenu from "@/components/TrackContextMenu";
import { useTrackSelection } from "@/hooks/useTrackSelection";
import BulkActionBar from "@/components/BulkActionBar";

export default function LibraryPage() {
  const [results, setResults] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const { playTrack, currentTrack, isPlaying, openAlbumModal, addToQueue, addMultipleToQueue, downloadingTrackIds, downloadedTrackIds, deletingTrackIds, downloadTrack, downloadTracks, removeDownload, removeDownloads } = usePlayer();

  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, track: Track } | null>(null);

  const { selectedTrackIds, handleMouseDown, handleMouseEnter, clearSelection, selectAll, withSelectionGuard } = useTrackSelection(results);

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

  const handleBulkUnlike = async () => {
    if (!confirm(`Unlike ${selectedTrackIds.size} tracks?`)) return;
    const tracksToRemove = results.filter(t => selectedTrackIds.has(t.id));
    for (const t of tracksToRemove) {
      await removeFromLibrary(t);
    }
    clearSelection();
  };

  const handleBulkQueue = () => {
    const selectedTracks = results.filter(t => selectedTrackIds.has(t.id));
    addMultipleToQueue(selectedTracks);
    clearSelection();
  };

  const handleBulkDownload = async () => {
    const selectedTracks = results.filter(t => selectedTrackIds.has(t.id));
    if (selectedTracks.length === 0) return;
    downloadTracks(selectedTracks);
    clearSelection();
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
    <div className="p-8 pb-32 select-none">
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
              const isSelected = selectedTrackIds.has(track.id);
              const isSelectionActive = selectedTrackIds.size > 0;
              
              return (
                <div
                  key={track.id}
                  onClick={withSelectionGuard(track.id, () => playTrack(track))}
                  onMouseDown={(e) => handleMouseDown(e, track.id)}
                  onMouseEnter={() => handleMouseEnter(track.id)}
                  onContextMenu={(e) => !isSelectionActive && handleContextMenu(e, track)}
                  className={`flex items-center justify-between p-3 rounded-md cursor-pointer transition-colors group ${
                    isCurrentlyPlaying && !isSelectionActive ? "bg-[var(--card-hover)]" : "hover:bg-[var(--card-hover)]"
                  } ${isSelected ? "bg-[var(--brand-gold)]/20 border border-[var(--brand-gold)]/50" : "border border-transparent"}`}
                >
                  <div className="flex items-center gap-4 pointer-events-none">
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
                      {!isSelectionActive && (
                        <div className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center">
                          <span className="text-white text-xl">
                            {isCurrentlyPlaying && isPlaying ? "⏸" : "▶"}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className={`font-semibold ${isCurrentlyPlaying && !isSelectionActive ? "text-[var(--brand-gold)]" : "text-white"}`}>
                        {track.title}
                      </span>
                      <span className="text-sm text-[var(--text-muted)] flex items-center gap-1.5">
                        {downloadingTrackIds.has(track.id) ? (
                          <Loader2 className="w-3.5 h-3.5 text-[var(--brand-gold)] animate-spin" />
                        ) : deletingTrackIds.has(track.id) ? (
                          <Loader2 className="w-3.5 h-3.5 text-red-400 animate-spin" />
                        ) : downloadedTrackIds.has(track.id) ? (
                          <Check className="w-3.5 h-3.5 text-[var(--brand-gold)]" />
                        ) : null}
                        {track.artist}
                      </span>
                    </div>
                  </div>
                  {!isSelectionActive && (
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
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BulkActionBar selectedCount={selectedTrackIds.size} onClear={clearSelection}>
        <button onClick={selectAll} className="text-sm font-medium hover:text-white text-[var(--text-muted)] px-2">Select All</button>
        <div className="w-px h-4 bg-white/10 mx-1"></div>
        <button onClick={handleBulkQueue} className="text-[var(--text-muted)] hover:text-white transition-colors" title="Add to Queue">
          <ListPlus className="w-5 h-5" />
        </button>
        <button onClick={handleBulkDownload} className="text-[var(--text-muted)] hover:text-white transition-colors" title="Download">
          <DownloadIcon className="w-5 h-5" />
        </button>
        <button onClick={handleBulkUnlike} className="text-red-400 hover:text-red-300 transition-colors" title="Unlike">
          <Heart className="w-5 h-5" />
        </button>
      </BulkActionBar>

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
