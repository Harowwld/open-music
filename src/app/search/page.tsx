"use client";

import { useState, useEffect } from "react";
import { usePlayer, Track } from "@/context/PlayerContext";
import { Search, Play, Pause, ListPlus, Library, Download, Loader2, Heart, Disc } from "lucide-react";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { playTrack, currentTrack, isPlaying, openAlbumModal } = usePlayer();

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

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="p-8 pb-32 drag-region">
      {/* Draggable spacer for window controls */}
      <div className="h-4 w-full shrink-0" />
      
      <div className="max-w-4xl mx-auto no-drag relative z-10">
        <form onSubmit={handleSearch} className="mb-10 relative search-container">
          <input
            type="text"
            value={query}
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

        {!isLoading && results.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-6 text-white">Search Results</h2>
            <div className="flex flex-col gap-2">
              {results.map((track) => {
                const isCurrentlyPlaying = currentTrack?.id === track.id;
                
                return (
                  <div
                    key={track.id}
                    onClick={() => playTrack(track)}
                    onContextMenu={(e) => handleContextMenu(e, track)}
                    className={`flex items-center justify-between p-3 rounded-md cursor-pointer hover:bg-[var(--card-hover)] transition-colors group press-scale ${
                      isCurrentlyPlaying ? "bg-[var(--card-hover)]" : ""
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative w-12 h-12 rounded overflow-hidden shadow-md flex-shrink-0 bg-[var(--card-bg)]">
                        {track.thumbnail && (
                          <img
                            src={track.thumbnail}
                            alt={track.title}
                            className="object-cover w-full h-full"
                          />
                        )}
                        <div className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center">
                          {isCurrentlyPlaying && isPlaying ? (
                             <Pause className="w-5 h-5 text-white fill-current" />
                          ) : (
                             <Play className="w-5 h-5 text-white fill-current ml-0.5" />
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <span className={`font-semibold ${isCurrentlyPlaying ? "text-[var(--brand-gold)]" : "text-white"}`}>
                          {track.title}
                        </span>
                        <span className="text-sm text-[var(--text-muted)]">
                          {track.artist}
                        </span>
                      </div>
                    </div>
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
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Context Menu Overlay */}
      {contextMenu && (
        <div 
          className="fixed z-[100] bg-[var(--card-bg)] border border-[var(--border-color)] shadow-xl rounded-lg py-2 w-48 text-sm glass no-drag"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div className="px-4 py-2 text-[var(--text-muted)] border-b border-[var(--border-color)] mb-1 truncate font-semibold text-xs">
            {contextMenu.track.title}
          </div>
          <button 
            className="w-full text-left px-4 py-2 hover:bg-[var(--card-hover)] hover:text-white transition-colors flex items-center gap-3"
            onClick={() => {
              playTrack(contextMenu.track);
              setContextMenu(null);
            }}
          >
            <Play className="w-4 h-4 fill-current" /> Play
          </button>
          <button 
            className="w-full text-left px-4 py-2 hover:bg-[var(--card-hover)] hover:text-white transition-colors flex items-center gap-3"
            onClick={() => {
              alert(`Added ${contextMenu.track.title} to Queue (Stub)`);
              setContextMenu(null);
            }}
          >
            <ListPlus className="w-4 h-4" /> Add to Queue
          </button>
          <button 
            className="w-full text-left px-4 py-2 hover:bg-[var(--card-hover)] hover:text-white transition-colors flex items-center gap-3"
            onClick={async () => {
              const track = contextMenu.track;
              setContextMenu(null);
              toggleLike(track);
            }}
          >
            <Heart className={`w-4 h-4 ${contextMenu.track.isLiked ? 'fill-current text-[var(--brand-gold)]' : ''}`} /> 
            {contextMenu.track.isLiked ? "Unlike" : "Like"}
          </button>
          <button 
            className="w-full text-left px-4 py-2 hover:bg-[var(--card-hover)] hover:text-white transition-colors flex items-center gap-3"
            onClick={() => {
              const track = contextMenu.track;
              setContextMenu(null);
              openAlbumModal(track);
            }}
          >
            <Disc className="w-4 h-4" /> Add to Album
          </button>
          <button 
            className="w-full text-left px-4 py-2 hover:bg-[var(--card-hover)] hover:text-white transition-colors flex items-center gap-3"
            onClick={async () => {
              const track = contextMenu.track;
              setContextMenu(null);
              try {
                const res = await fetch('/api/download', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(track)
                });
                if (res.ok) {
                  alert(`Downloaded ${track.title} for offline playback!`);
                } else {
                  throw new Error('Failed');
                }
              } catch (e) {
                alert('Failed to download track');
              }
            }}
          >
            <Download className="w-4 h-4" /> Download
          </button>
        </div>
      )}
    </div>
  );
}
