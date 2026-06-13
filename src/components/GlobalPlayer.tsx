"use client";

import { useState, useEffect } from "react";
import { usePlayer, Track } from "@/context/PlayerContext";
import YouTube from "react-youtube";
import { Quote, Volume2, MoreHorizontal, ListPlus, Library, Download, Heart, Disc, SkipBack, SkipForward, ListMusic, X, Play, Trash2, CloudOff } from "lucide-react";
import TrackContextMenu from "@/components/TrackContextMenu";
import { useTrackSelection } from "@/hooks/useTrackSelection";
import BulkActionBar from "@/components/BulkActionBar";

export default function GlobalPlayer() {
  const {
    currentTrack,
    isPlaying,
    volume,
    progress,
    duration,
    showLyrics,
    togglePlayPause,
    toggleLyrics,
    setVolume,
    seekTo,
    setYtPlayer,
    nativePlayerRef,
    setIsPlaying,
    setDuration,
    setProgress,
    updateCurrentTrack,
    openAlbumModal,
    addToQueue,
    playNext,
    playPrevious,
    playTrack,
    playFromQueue,
    clearQueue,
    removeFromQueue,
    queue,
    history,
    downloadTracks,
    removeDownload
  } = usePlayer();

  const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null);
  const [showQueuePanel, setShowQueuePanel] = useState(false);

  const { selectedTrackIds, handleMouseDown, handleMouseEnter, clearSelection, selectAll, withSelectionGuard } = useTrackSelection(queue, showQueuePanel);

  // Clear selection if queue closes
  useEffect(() => {
    if (!showQueuePanel) {
      clearSelection();
    }
  }, [showQueuePanel, clearSelection]);

  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    document.addEventListener("click", handleClickOutside);
    window.addEventListener("scroll", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
      window.removeEventListener("scroll", handleClickOutside);
    };
  }, []);

  const handleContextMenu = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    
    const rect = e.currentTarget.getBoundingClientRect();
    const menuWidth = 192; // w-48 is 192px
    const menuHeight = 200; // Approx height of the menu

    // Anchor strictly to the top right of the button
    let x = rect.right - menuWidth;
    let y = rect.top - menuHeight - 8;

    if (x < 10) x = 10;
    if (y < 10) y = 10;

    setContextMenu({ x, y });
  };

  const formatTime = (time: number | string | undefined) => {
    if (!time) return "0:00";
    if (typeof time === 'string' && time.includes(':') && !time.includes('NaN')) return time;
    const numTime = Number(time);
    if (isNaN(numTime) || numTime <= 0) return "0:00";
    const minutes = Math.floor(numTime / 60);
    const seconds = Math.floor(numTime % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    seekTo(Number(e.target.value));
  };

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(Number(e.target.value));
  };

  const onReady = (event: any) => {
    setYtPlayer(event.target);
    event.target.setVolume(volume);
    if (progress > 0) {
      event.target.seekTo(progress, true);
    }
  };

  const onStateChange = (event: any) => {
    if (event.data === 1) {
      setIsPlaying(true);
      setDuration(event.target.getDuration());
    } else if (event.data === 2) {
      setIsPlaying(false);
    } else if (event.data === 0) {
      playNext();
    }
  };

  const toggleLike = async () => {
    if (!currentTrack) return;
    const currentlyLiked = currentTrack.isLiked;
    
    updateCurrentTrack({ isLiked: !currentlyLiked });
    
    try {
      if (currentlyLiked) {
        await fetch(`/api/library?id=${currentTrack.id}`, { method: 'DELETE' });
      } else {
        await fetch('/api/library', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(currentTrack)
        });
      }
    } catch (e) {
      updateCurrentTrack({ isLiked: currentlyLiked });
      alert('Failed to update library status');
    }
  };

  const handleBulkRemoveFromQueue = () => {
    // Find all indices that match the selected track IDs, from back to front to avoid shifting issues
    const indicesToRemove: number[] = [];
    queue.forEach((t, i) => {
      if (selectedTrackIds.has(t.id)) indicesToRemove.push(i);
    });
    
    // Sort descending
    indicesToRemove.sort((a, b) => b - a).forEach(index => {
      removeFromQueue(index);
    });
    clearSelection();
  };

  const handleBulkDownload = () => {
    const selectedTracks = queue.filter(t => selectedTrackIds.has(t.id));
    if (selectedTracks.length > 0) {
      downloadTracks(selectedTracks);
    }
    clearSelection();
  };

  return (
    <div className="h-24 bg-[var(--player-bg)] border-t border-[var(--border-color)] px-4 flex items-center justify-between z-50 relative select-none">
      {/* Hidden YouTube Player */}
      {currentTrack && !currentTrack.isOffline && (
        <div className="hidden">
          <YouTube
            videoId={currentTrack.id}
            opts={{
              height: "0",
              width: "0",
              playerVars: {
                autoplay: isPlaying ? 1 : 0,
                controls: 0,
                disablekb: 1,
              },
            }}
            onReady={onReady}
            onStateChange={onStateChange}
          />
        </div>
      )}

      {/* Hidden Native Audio Player */}
      {currentTrack && !!currentTrack.isOffline && (
        <audio
          ref={nativePlayerRef}
          src={`/api/audio/${currentTrack.id}`}
          autoPlay={isPlaying}
          onLoadedMetadata={() => {
            if (nativePlayerRef.current) {
              setDuration(nativePlayerRef.current.duration);
              nativePlayerRef.current.volume = volume / 100;
              if (progress > 0 && !isPlaying) {
                nativePlayerRef.current.currentTime = progress;
              }
            }
          }}
          onCanPlay={() => {
            if (isPlaying && nativePlayerRef.current) {
              const playPromise = nativePlayerRef.current.play();
              if (playPromise !== undefined) {
                playPromise.catch(e => console.log("Playback error:", e));
              }
            }
          }}
          onEnded={() => playNext()}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onError={(e) => {
            console.error("Native audio playback failed, falling back to streaming:", e);
            if (currentTrack) {
              updateCurrentTrack({ isOffline: false, local_path: undefined });
              removeDownload(currentTrack).catch(console.error);
              setIsPlaying(true); // Ensure it tries to play after fallback
            }
          }}
          className="hidden"
        />
      )}

      {/* Track Info */}
      <div className="flex items-center w-[30%] gap-4 group">
        {currentTrack ? (
          <>
            <div className="w-14 h-14 bg-[var(--card-hover)] rounded overflow-hidden relative shadow-md">
              {currentTrack.thumbnail && (
                <img
                  src={currentTrack.thumbnail}
                  alt={currentTrack.title}
                  className="object-cover w-full h-full"
                />
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-white truncate max-w-[200px]">
                {currentTrack.title}
              </span>
              <span className="text-xs text-[var(--text-muted)] truncate max-w-[200px] flex items-center gap-2">
                {currentTrack.artist}
                {!!currentTrack.isOffline && (
                  <span className="text-[10px] bg-[var(--brand-gold)] text-black px-1.5 py-0.5 rounded-full font-bold">
                    OFFLINE
                  </span>
                )}
              </span>
            </div>
            <button 
              onClick={toggleLike}
              className={`ml-2 transition-colors ${currentTrack.isLiked ? 'text-[var(--brand-gold)]' : 'text-[var(--text-muted)] hover:text-white'}`}
              title={currentTrack.isLiked ? "Remove from Liked Songs" : "Save to Liked Songs"}
            >
              <Heart className={`w-5 h-5 ${currentTrack.isLiked ? 'fill-current' : ''}`} />
            </button>
          </>
        ) : (
          <div className="text-sm text-[var(--text-muted)]">No track playing</div>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center max-w-[40%] w-full gap-2">
        <div className="flex items-center gap-6">
          <button 
            onClick={playPrevious}
            disabled={!currentTrack}
            className="text-[var(--text-muted)] hover:text-white transition-colors disabled:opacity-50"
            title="Previous"
          >
            <SkipBack className="w-5 h-5 fill-current" />
          </button>
          
          <button
            onClick={togglePlayPause}
            disabled={!currentTrack}
            className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center disabled:opacity-50 press-scale"
          >
            {isPlaying ? (
              <span className="font-bold text-lg">⏸</span>
            ) : (
              <span className="font-bold text-lg pl-1">▶</span>
            )}
          </button>
          
          <button 
            onClick={playNext}
            disabled={!currentTrack}
            className="text-[var(--text-muted)] hover:text-white transition-colors disabled:opacity-50"
            title="Next"
          >
            <SkipForward className="w-5 h-5 fill-current" />
          </button>
        </div>
        
        <div className="flex items-center w-full gap-2 text-xs text-[var(--text-muted)]">
          <span className="min-w-[35px] text-right">{formatTime(progress)}</span>
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={progress ?? 0}
            onChange={handleSeek}
            disabled={!currentTrack}
            className="flex-1 custom-slider"
            style={{ "--slider-percent": `${duration > 0 ? (progress / duration) * 100 : 0}%` } as React.CSSProperties}
          />
          <span className="min-w-[35px]">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls / Volume */}
      <div className="flex items-center justify-end w-[30%] gap-4">
        <button
          onClick={handleContextMenu}
          className="text-[var(--text-muted)] hover:text-white transition-colors no-drag"
          title="More options"
        >
          <MoreHorizontal className="w-5 h-5" />
        </button>
        <button
          onClick={() => setShowQueuePanel(!showQueuePanel)}
          className={`hover:text-white transition-colors ${showQueuePanel ? "text-[var(--brand-gold)]" : "text-[var(--text-muted)]"}`}
          title="Queue"
        >
          <ListMusic className="w-5 h-5" />
        </button>
        <button
          onClick={toggleLyrics}
          className={`hover:text-white transition-colors ${showLyrics ? "text-[var(--brand-gold)]" : "text-[var(--text-muted)]"}`}
          title="Lyrics"
        >
          <Quote className="w-5 h-5" />
        </button>
        <Volume2 className="w-5 h-5 text-[var(--text-muted)]" />
        <input
          type="range"
          min={0}
          max={100}
          value={volume ?? 100}
          onChange={handleVolume}
          className="w-24 custom-slider"
          style={{ "--slider-percent": `${volume}%` } as React.CSSProperties}
        />
      </div>

      {/* Context Menu */}
      {contextMenu && currentTrack && (
        <TrackContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          track={currentTrack}
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
        />
      )}

      {/* Queue Panel Overlay */}
      {showQueuePanel && (
        <div className="fixed bottom-24 right-0 w-80 max-h-[60vh] bg-[var(--card-bg)] border-t border-l border-[var(--border-color)] shadow-2xl rounded-tl-xl flex flex-col z-[90] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)] bg-[var(--player-bg)] shrink-0 z-10">
            <h3 className="font-semibold text-white">Queue</h3>
            <div className="flex items-center gap-2">
              {selectedTrackIds.size > 0 && (
                <>
                  <button onClick={handleBulkDownload} className="text-[var(--text-muted)] hover:text-white transition-colors p-1" title="Download Selected">
                    <Download className="w-4 h-4" />
                  </button>
                  <button onClick={handleBulkRemoveFromQueue} className="text-[var(--text-muted)] hover:text-red-400 transition-colors p-1" title="Remove Selected from Queue">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="w-px h-4 bg-white/10 mx-1"></div>
                </>
              )}
              <button onClick={() => setShowQueuePanel(false)} className="text-[var(--text-muted)] hover:text-white transition-colors p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div className="overflow-y-auto flex-1 p-2 custom-scrollbar relative">
            {currentTrack && (
              <div className="mb-4">
                <div className="text-xs font-bold text-[var(--brand-gold)] px-2 mb-2 uppercase tracking-wider">Now Playing</div>
                <div className="flex items-center gap-3 p-2 rounded-md bg-[var(--card-hover)]">
                  <div className="w-10 h-10 rounded bg-[var(--border-color)] overflow-hidden shrink-0 relative flex items-center justify-center">
                    {currentTrack.thumbnail ? (
                      <img src={currentTrack.thumbnail} alt="" className="object-cover w-full h-full" />
                    ) : (
                      <Disc className="w-5 h-5 text-[var(--text-muted)]" />
                    )}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--brand-gold)] animate-pulse" />
                    </div>
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-sm font-medium text-[var(--brand-gold)] truncate">{currentTrack.title}</span>
                    <span className="text-xs text-[var(--text-muted)] truncate">{currentTrack.artist}</span>
                  </div>
                </div>
              </div>
            )}
            
            {queue.length > 0 ? (
              <div>
                <div className="flex items-center justify-between px-2 mb-2">
                  <div className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Next In Queue</div>
                  <button onClick={clearQueue} className="text-xs text-[var(--text-muted)] hover:text-white transition-colors uppercase tracking-wider font-bold">Clear</button>
                </div>
                <div className="flex flex-col gap-1 pb-16">
                  {queue.map((track, i) => {
                    const isSelected = selectedTrackIds.has(track.id);
                    const isSelectionActive = selectedTrackIds.size > 0;
                    return (
                      <div 
                        key={`${track.id}-${i}`} 
                        className={`flex items-center gap-3 p-2 rounded-md transition-colors cursor-pointer group ${
                          isSelected ? "bg-[var(--brand-gold)]/20 border border-[var(--brand-gold)]/50" : "hover:bg-[var(--card-hover)] border border-transparent"
                        }`}
                        onClick={withSelectionGuard(track.id, () => playFromQueue(i))}
                        onMouseDown={(e) => handleMouseDown(e, track.id)}
                        onMouseEnter={() => handleMouseEnter(track.id)}
                      >
                        <div className="w-10 h-10 rounded bg-[var(--border-color)] overflow-hidden shrink-0 relative flex items-center justify-center pointer-events-none">
                          {track.thumbnail ? (
                            <img src={track.thumbnail} alt="" className="object-cover w-full h-full" />
                          ) : (
                            <Disc className="w-5 h-5 text-[var(--text-muted)]" />
                          )}
                          {!isSelectionActive && (
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                              <Play className="w-4 h-4 text-white fill-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col flex-1 min-w-0 pointer-events-none">
                          <span className="text-sm font-medium text-white truncate">{track.title}</span>
                          <span className="text-xs text-[var(--text-muted)] truncate">{track.artist}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-32 text-[var(--text-muted)]">
                <ListMusic className="w-8 h-8 mb-2 opacity-50" />
                <span className="text-sm">Your queue is empty</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
