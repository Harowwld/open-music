"use client";

import { useState, useEffect } from "react";
import { usePlayer, Track } from "@/context/PlayerContext";
import { Play, Trash2, Heart, Disc, ListPlus, CheckSquare, Square } from "lucide-react";
import TrackContextMenu from "@/components/TrackContextMenu";

export default function DownloadedPage() {
  const [results, setResults] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const { playTrack, currentTrack, isPlaying, openAlbumModal, addToQueue, addMultipleToQueue } = usePlayer();

  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, track: Track } | null>(null);
  
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(new Set());

  const fetchDownloaded = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/downloaded`);
      if (!res.ok) throw new Error("Failed to load downloaded music");
      const data = await res.json();
      setResults(data.tracks || []);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDownloaded();
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

  const toggleLike = async (track: Track, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const currentlyLiked = track.isLiked;
    
    // Optimistic UI update
    setResults(results.map(t => t.id === track.id ? { ...t, isLiked: !currentlyLiked } : t));
    
    try {
      if (currentlyLiked) {
        await fetch(`/api/library?id=${track.id}`, { method: 'DELETE' });
      } else {
        await fetch('/api/library', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(track)
        });
      }
    } catch (err) {
      // Revert if failed
      setResults(results.map(t => t.id === track.id ? { ...t, isLiked: currentlyLiked } : t));
      alert('Failed to update library status');
    }
  };

  const deleteDownload = async (track: Track) => {
    try {
      const res = await fetch(`/api/download?id=${track.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete download');
      
      setResults(results.filter(t => t.id !== track.id));
      setContextMenu(null);
    } catch (e) {
      alert("Failed to delete track");
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedTrackIds(new Set());
  };

  const toggleSelection = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const next = new Set(selectedTrackIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedTrackIds(next);
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedTrackIds.size} tracks from device?`)) return;
    const tracksToRemove = results.filter(t => selectedTrackIds.has(t.id));
    for (const t of tracksToRemove) {
      await deleteDownload(t);
    }
    toggleSelectionMode();
  };

  const handleBulkQueue = () => {
    const selectedTracks = results.filter(t => selectedTrackIds.has(t.id));
    addMultipleToQueue(selectedTracks);
    toggleSelectionMode();
  };

  const handleBulkAlbum = () => {
    const selectedTracks = results.filter(t => selectedTrackIds.has(t.id));
    openAlbumModal(selectedTracks);
    toggleSelectionMode();
  };

  return (
    <div className="p-8 pb-32">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-white">Downloaded Music</h1>
          {results.length > 0 && (
            <button
              onClick={toggleSelectionMode}
              className={`p-2 px-4 transition-colors rounded-lg flex items-center gap-2 ${isSelectionMode ? 'bg-[var(--brand-gold)] text-black font-bold' : 'text-[var(--text-muted)] hover:text-white bg-gray-800'}`}
            >
              <CheckSquare className="w-5 h-5" />
              {isSelectionMode ? "Done" : "Select"}
            </button>
          )}
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
            <span className="text-4xl block mb-4">⬇️</span>
            <p>Your downloaded music will appear here.</p>
          </div>
        )}

        {!isLoading && results.length > 0 && (
          <div className="flex flex-col gap-2 pb-24">
            {results.map((track) => {
              const isCurrentlyPlaying = currentTrack?.id === track.id;
              const isSelected = selectedTrackIds.has(track.id);
              
              return (
                <div
                  key={track.id}
                  onClick={(e) => {
                    if (isSelectionMode) toggleSelection(track.id, e);
                    else playTrack(track);
                  }}
                  onContextMenu={(e) => !isSelectionMode && handleContextMenu(e, track)}
                  className={`flex items-center justify-between p-3 rounded-md cursor-pointer transition-colors group ${
                    isCurrentlyPlaying && !isSelectionMode ? "bg-[var(--card-hover)]" : "hover:bg-[var(--card-hover)]"
                  } ${isSelected ? "bg-[var(--brand-gold)]/20 border border-[var(--brand-gold)]/50" : "border border-transparent"}`}
                >
                  <div className="flex items-center gap-4">
                    {isSelectionMode && (
                      <div className="text-[var(--text-muted)] hover:text-white flex-shrink-0">
                        {isSelected ? <CheckSquare className="w-6 h-6 text-[var(--brand-gold)]" /> : <Square className="w-6 h-6" />}
                      </div>
                    )}
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
                      {!isSelectionMode && (
                        <div className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center">
                          <span className="text-white text-xl">
                            {isCurrentlyPlaying && isPlaying ? "⏸" : "▶"}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className={`font-semibold ${isCurrentlyPlaying && !isSelectionMode ? "text-[var(--brand-gold)]" : "text-white"}`}>
                        {track.title}
                      </span>
                      <span className="text-sm text-[var(--text-muted)] flex items-center gap-2">
                        {track.artist}
                        <span className="text-[10px] bg-[var(--brand-gold)] text-black px-1.5 py-0.5 rounded-full font-bold">
                          OFFLINE
                        </span>
                      </span>
                    </div>
                  </div>
                  {!isSelectionMode && (
                    <div className="text-sm text-[var(--text-muted)] flex items-center gap-4">
                      <button 
                        onClick={(e) => toggleLike(track, e)}
                        className={`transition-colors ${track.isLiked ? 'text-[var(--brand-gold)]' : 'text-[var(--text-muted)] hover:text-white'}`}
                        title={track.isLiked ? "Unlike" : "Like"}
                      >
                        <Heart className={`w-5 h-5 ${track.isLiked ? 'fill-current' : ''}`} />
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

      {/* Bulk Action Bar */}
      {isSelectionMode && selectedTrackIds.size > 0 && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-[var(--card-bg)] border border-[var(--border-color)] shadow-2xl rounded-full px-6 py-3 flex items-center gap-6 z-50 glass animate-in slide-in-from-bottom-10 fade-in">
          <div className="flex items-center gap-2 pr-4 border-r border-[var(--border-color)]">
            <span className="font-bold text-white bg-[var(--brand-gold)] text-black w-6 h-6 flex items-center justify-center rounded-full text-sm">
              {selectedTrackIds.size}
            </span>
            <span className="text-sm text-[var(--text-muted)] font-medium">Selected</span>
          </div>
          <button onClick={() => setSelectedTrackIds(new Set(results.map(t => t.id)))} className="text-sm font-medium hover:text-white text-[var(--text-muted)]">Select All</button>
          
          <button onClick={handleBulkQueue} className="text-[var(--text-muted)] hover:text-white transition-colors" title="Add to Queue">
            <ListPlus className="w-5 h-5" />
          </button>
          <button onClick={handleBulkAlbum} className="text-[var(--text-muted)] hover:text-white transition-colors" title="Add to Album">
            <Disc className="w-5 h-5" />
          </button>
          <button onClick={handleBulkDelete} className="text-red-400 hover:text-red-300 transition-colors" title="Delete Download">
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Context Menu Overlay */}
      {contextMenu && (
        <TrackContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          track={contextMenu.track}
          onClose={() => setContextMenu(null)}
          onPlay={playTrack}
          onAddToQueue={addToQueue}
          onToggleLike={toggleLike}
          onAddToAlbum={openAlbumModal}
          onDownload={async (track) => {
            try {
              const res = await fetch('/api/download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(track)
              });
              if (res.ok) alert(`Downloaded ${track.title} for offline playback!`);
              else throw new Error('Failed');
            } catch (e) {
              alert('Failed to download track');
            }
          }}
          onRemoveDownload={deleteDownload}
        />
      )}
    </div>
  );
}
