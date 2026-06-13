"use client";

import { useState, useEffect, useMemo } from "react";
import { usePlayer, Track } from "@/context/PlayerContext";
import { Search, Play, Pause, ListPlus, Download as DownloadIcon, Loader2, Heart, Disc, Check, CloudOff } from "lucide-react";
import TrackContextMenu from "@/components/TrackContextMenu";
import { useTrackSelection } from "@/hooks/useTrackSelection";
import BulkActionBar from "@/components/BulkActionBar";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { playTrack, currentTrack, isPlaying, openAlbumModal, addToQueue, addMultipleToQueue, downloadingTrackIds, downloadedTrackIds, downloadTrack, downloadTracks, history, removeDownload, removeDownloads } = usePlayer();
  const [likedOverrides, setLikedOverrides] = useState<Record<string, boolean>>({});

  const recentTracks = useMemo(() => {
    const deduped = new Map();
    if (currentTrack) {
      deduped.set(currentTrack.id, currentTrack);
    }
    for (let i = history.length - 1; i >= 0; i--) {
      const track = history[i];
      if (!deduped.has(track.id)) {
        deduped.set(track.id, track);
      }
      if (deduped.size >= 50) break;
    }
    return Array.from(deduped.values());
  }, [history, currentTrack]);

  const displayedTracks = query.trim() ? results : recentTracks;

  const { selectedTrackIds, handleMouseDown, handleMouseEnter, clearSelection, selectAll, withSelectionGuard } = useTrackSelection(displayedTracks);

  const [suggestions, setSuggestions] = useState<Track[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, track: Track } | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      setContextMenu(null);
      // Close suggestions if clicked outside form
      if (!(e.target as Element).closest('.search-container')) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    window.addEventListener("scroll", () => setContextMenu(null));
    return () => {
      document.removeEventListener("click", handleClickOutside);
      window.removeEventListener("scroll", () => setContextMenu(null));
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!query.trim()) {
        setSuggestions([]);
        return;
      }
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.results ? data.results.slice(0, 5) : []);
        }
      } catch (err) {
        // Ignore
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setShowSuggestions(false);
    setIsLoading(true);
    setError("");
    clearSelection();
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error("Failed to search");
      const data = await res.json();
      setResults(data.results || []);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (track: Track) => {
    playTrack(track);
    setShowSuggestions(false);
  };

  const handleContextMenu = (e: React.MouseEvent, track: Track) => {
    e.preventDefault();
    const menuWidth = 200;
    const menuHeight = 160;
    let x = e.pageX;
    let y = e.pageY;

    if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth - 10;
    if (y + menuHeight > window.innerHeight) y = window.innerHeight - menuHeight - 10;

    setContextMenu({ x, y, track });
  };

  const toggleLike = async (track: Track, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const currentlyLiked = likedOverrides[track.id] !== undefined ? likedOverrides[track.id] : track.isLiked;
    
    // Optimistic UI update
    setLikedOverrides(prev => ({ ...prev, [track.id]: !currentlyLiked }));
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
      setLikedOverrides(prev => ({ ...prev, [track.id]: !!currentlyLiked }));
      setResults(results.map(t => t.id === track.id ? { ...t, isLiked: !!currentlyLiked } : t));
      alert('Failed to update library status');
    }
  };

  const handleBulkQueue = () => {
    const selectedTracks = displayedTracks.filter(t => selectedTrackIds.has(t.id));
    addMultipleToQueue(selectedTracks);
    clearSelection();
  };

  const handleBulkDownload = async () => {
    const selectedTracks = displayedTracks.filter(t => selectedTrackIds.has(t.id));
    if (selectedTracks.length === 0) return;
    downloadTracks(selectedTracks);
    clearSelection();
  };

  const handleBulkRemoveDownload = async () => {
    const selectedTracks = displayedTracks.filter(t => selectedTrackIds.has(t.id));
    if (selectedTracks.length === 0) return;
    await removeDownloads(selectedTracks);
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
    <div className="p-8 pb-32 drag-region select-none">
      {/* Draggable spacer for window controls */}
      <div className="h-4 w-full shrink-0" />
      
      <div className="max-w-4xl mx-auto no-drag relative z-10">
        <form onSubmit={handleSearch} className="mb-10 relative search-container">
          <input
            type="text"
            value={query ?? ""}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            placeholder="What do you want to play?"
            className="w-full bg-[var(--card-bg)] text-white text-lg rounded-full py-4 pl-14 pr-6 focus:outline-none focus:ring-2 focus:ring-[var(--brand-gold)] transition-shadow shadow-lg placeholder-[var(--text-muted)]"
          />
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-5 h-5" />
          <button type="submit" className="hidden">Search</button>

          {showSuggestions && suggestions.length > 0 && query.trim() && (
             <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl shadow-2xl z-50 overflow-hidden glass py-2 no-drag">
               {suggestions.map(track => (
                 <div 
                   key={track.id} 
                   onClick={() => handleSuggestionClick(track)} 
                   className="flex items-center gap-4 px-4 py-3 hover:bg-[var(--card-hover)] cursor-pointer transition-colors"
                 >
                   <Search className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                   <div className="flex flex-col truncate">
                     <span className="text-white truncate font-medium text-sm">{track.title}</span>
                     <span className="text-[var(--text-muted)] text-xs truncate">{track.artist}</span>
                   </div>
                 </div>
               ))}
             </div>
          )}
        </form>

        {isLoading && (
          <div className="flex justify-center my-12">
             <Loader2 className="animate-spin text-[var(--text-muted)] w-8 h-8" />
          </div>
        )}

        {error && (
          <div className="text-red-500 text-center bg-red-500/10 py-4 rounded-lg">
            {error}
          </div>
        )}

        {!isLoading && displayedTracks.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-6 text-white">
              {query.trim() ? "Search Results" : "Recently Played"}
            </h2>
            <div className="flex flex-col gap-2">
              {displayedTracks.map((rawTrack) => {
                const track = { ...rawTrack, isLiked: likedOverrides[rawTrack.id] !== undefined ? likedOverrides[rawTrack.id] : rawTrack.isLiked };
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
                    className={`flex items-center justify-between p-3 rounded-md cursor-pointer transition-colors group press-scale ${
                      isCurrentlyPlaying && !isSelectionActive ? "bg-[var(--card-hover)]" : "hover:bg-[var(--card-hover)]"
                    } ${isSelected ? "bg-[var(--brand-gold)]/20 border border-[var(--brand-gold)]/50" : "border border-transparent"}`}
                  >
                    <div className="flex items-center gap-4 pointer-events-none">
                      <div className="relative w-12 h-12 rounded overflow-hidden shadow-md flex-shrink-0 bg-[var(--card-bg)]">
                        {track.thumbnail && (
                          <img
                            src={track.thumbnail}
                            alt={track.title}
                            className="object-cover w-full h-full"
                          />
                        )}
                        {!isSelectionActive && (
                          <div className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center">
                            {isCurrentlyPlaying && isPlaying ? (
                               <Pause className="w-5 h-5 text-white fill-current" />
                            ) : (
                               <Play className="w-5 h-5 text-white fill-current ml-0.5" />
                            )}
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
        <button onClick={handleBulkRemoveDownload} className="text-[var(--text-muted)] hover:text-red-400 transition-colors" title="Remove Downloads">
          <CloudOff className="w-5 h-5" />
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
          onToggleLike={toggleLike}
          onAddToAlbum={openAlbumModal}
          onDownload={downloadTrack}
          onRemoveDownload={removeDownload}
          isDownloaded={contextMenu ? downloadedTrackIds.has(contextMenu.track.id) : false}
        />
      )}
    </div>
  );
}
