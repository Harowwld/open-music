"use client";

import { useState, useEffect, use } from "react";
import { usePlayer, Track } from "@/context/PlayerContext";
import { Play, Trash2, Heart, Disc, Download as DownloadIcon, ListPlus, Shuffle, X, CheckCircle2, Check, Loader2, CloudOff, Search } from "lucide-react";
import TrackContextMenu from "@/components/TrackContextMenu";
import { useTrackSelection } from "@/hooks/useTrackSelection";
import BulkActionBar from "@/components/BulkActionBar";

export default function AlbumViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [album, setAlbum] = useState<any>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { playTrack, currentTrack, isPlaying, openAlbumModal, addToQueue, addMultipleToQueue, downloadTracks, downloadingTrackIds, downloadedTrackIds, downloadTrack, removeDownload, removeDownloads } = usePlayer();
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, track: Track } | null>(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  const { selectedTrackIds, handleMouseDown, handleMouseEnter, clearSelection, selectAll, withSelectionGuard } = useTrackSelection(tracks);

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
    const menuHeight = 160;
    let x = e.pageX;
    let y = e.pageY;

    if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth - 10;
    if (y + menuHeight > window.innerHeight) y = window.innerHeight - menuHeight - 10;

    setContextMenu({ x, y, track });
  };

  useEffect(() => {
    fetch(`/api/albums/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.album) {
          setAlbum(data.album);
          setTracks(data.tracks || []);
        }
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  const removeTrack = async (track: Track) => {
    try {
      await fetch(`/api/albums/${id}?trackId=${track.id}`, { method: "DELETE" });
      setTracks(tracks.filter(t => t.id !== track.id));
    } catch (e) {
      alert("Failed to remove track");
    }
  };

  const deleteAlbum = async () => {
    if (!confirm("Are you sure you want to delete this album?")) return;
    try {
      await fetch(`/api/albums/${id}`, { method: "DELETE" });
      window.location.href = "/library";
    } catch (e) {
      alert("Failed to delete album");
    }
  };

  const toggleLike = async (track: Track) => {
    const currentlyLiked = track.isLiked;
    setTracks(tracks.map(t => t.id === track.id ? { ...t, isLiked: !currentlyLiked } : t));
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
      setTracks(tracks.map(t => t.id === track.id ? { ...t, isLiked: currentlyLiked } : t));
      alert('Failed to update library status');
    }
  };

  const shufflePlay = () => {
    if (tracks.length === 0) return;
    const shuffled = [...tracks].sort(() => Math.random() - 0.5);
    playTrack(shuffled[0]);
    addMultipleToQueue(shuffled.slice(1));
  };

  const addAlbumToQueue = () => {
    if (tracks.length === 0) return;
    const shuffled = [...tracks].sort(() => Math.random() - 0.5);
    addMultipleToQueue(shuffled);
  };

  const downloadAll = async () => {
    if (tracks.length === 0) return;
    downloadTracks(tracks);
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Remove ${selectedTrackIds.size} tracks from this album?`)) return;
    const tracksToRemove = tracks.filter(t => selectedTrackIds.has(t.id));
    for (const t of tracksToRemove) {
      await removeTrack(t);
    }
    clearSelection();
  };

  const handleBulkQueue = () => {
    const selectedTracks = tracks.filter(t => selectedTrackIds.has(t.id));
    addMultipleToQueue(selectedTracks);
    clearSelection();
  };

  const handleBulkDownload = async () => {
    const selectedTracks = tracks.filter(t => selectedTrackIds.has(t.id));
    if (selectedTracks.length === 0) return;
    downloadTracks(selectedTracks);
    clearSelection();
  };

  const handleBulkRemoveDownload = async () => {
    const selectedTracks = tracks.filter(t => selectedTrackIds.has(t.id));
    if (selectedTracks.length === 0) return;
    await removeDownloads(selectedTracks);
    clearSelection();
  };

  const filteredTracks = tracks.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const fullyDownloaded = tracks.length > 0 && tracks.every(t => downloadedTrackIds.has(t.id));
  const someDownloaded = tracks.length > 0 && tracks.some(t => downloadedTrackIds.has(t.id));

  if (isLoading) return <div className="p-8 flex justify-center"><span className="animate-spin text-3xl">💿</span></div>;
  if (!album) return <div className="p-8 text-center text-red-500">Album not found</div>;

  return (
    <div className="p-8 pb-32 select-none">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-end gap-6 mb-8 bg-gradient-to-t from-black/40 to-transparent p-6 -mx-8 -mt-8 pt-20">
          <div className="w-48 h-48 rounded-lg shadow-2xl overflow-hidden bg-gray-800 flex items-center justify-center flex-shrink-0">
            {album.cover_image ? (
              <img src={album.cover_image} alt={album.title} className="w-full h-full object-cover pointer-events-none" />
            ) : (
              <Disc className="w-20 h-20 text-gray-500" />
            )}
          </div>
          <div className="flex flex-col gap-2 flex-1 pb-2">
            <span className="text-sm font-bold uppercase tracking-widest text-gray-300">Playlist</span>
            <h1 className="text-5xl font-extrabold text-white truncate">{album.title}</h1>
            <p className="text-[var(--text-muted)] mt-2">{tracks.length} {tracks.length === 1 ? 'song' : 'songs'}</p>
          </div>
          <button onClick={deleteAlbum} className="text-sm text-red-400 hover:text-red-300 transition-colors pb-4 flex items-center gap-2">
            <Trash2 className="w-4 h-4" /> Delete Album
          </button>
        </div>

        {/* Action Bar */}
        <div className="flex items-center gap-6 mb-8">
          <button 
            onClick={shufflePlay}
            className="w-14 h-14 bg-[var(--brand-gold)] hover:bg-[#957a5c] text-black rounded-full flex items-center justify-center transition-transform hover:scale-105 shadow-lg"
            title="Shuffle Play"
          >
            <Shuffle className="w-6 h-6" />
          </button>
          
          <button
            onClick={addAlbumToQueue}
            className="text-[var(--text-muted)] hover:text-white transition-colors p-2"
            title="Add Shuffled Album to Queue"
          >
            <ListPlus className="w-8 h-8" />
          </button>
          
          {!fullyDownloaded && (
            <button
              onClick={downloadAll}
              className="text-[var(--text-muted)] hover:text-white transition-colors p-2"
              title="Download Album"
            >
              <DownloadIcon className="w-8 h-8" />
            </button>
          )}

          {someDownloaded && (
            <button
              onClick={() => removeDownloads(tracks)}
              className="text-[var(--text-muted)] hover:text-red-400 transition-colors p-2"
              title="Remove Album Downloads"
            >
              <CloudOff className="w-8 h-8" />
            </button>
          )}
          
          <div className="flex-1"></div>
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search in album..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-full pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-[var(--brand-gold)] w-64 transition-all"
            />
          </div>
        </div>

        {tracks.length === 0 && (
          <div className="text-center py-20 text-[var(--text-muted)]">
            <p>No songs in this album yet.</p>
          </div>
        )}

        {tracks.length > 0 && filteredTracks.length === 0 && (
          <div className="text-center py-20 text-[var(--text-muted)]">
            <p>No songs found matching "{searchQuery}".</p>
          </div>
        )}

        <div className="flex flex-col gap-2 pb-24">
          {filteredTracks.map((track) => {
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
                    {track.thumbnail ? <img src={track.thumbnail} alt={track.title} className="object-cover w-full h-full" /> : <div className="w-full h-full bg-gray-800" />}
                    {!isSelectionActive && (
                      <div className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center">
                        <span className="text-white text-xl">{isCurrentlyPlaying && isPlaying ? "⏸" : "▶"}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className={`font-semibold ${isCurrentlyPlaying && !isSelectionActive ? "text-[var(--brand-gold)]" : "text-white"}`}>{track.title}</span>
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
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeTrack(track); }}
                      className="text-[var(--text-muted)] hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                      title="Remove from Album"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
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
        <button onClick={handleBulkDelete} className="text-red-400 hover:text-red-300 transition-colors" title="Remove from Album">
          <Trash2 className="w-5 h-5" />
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
          onRemoveFromAlbum={removeTrack}
          onRemoveDownload={removeDownload}
          isDownloaded={contextMenu ? downloadedTrackIds.has(contextMenu.track.id) : false}
        />
      )}
    </div>
  );
}
