"use client";

import { useState, useEffect } from "react";
import { usePlayer } from "@/context/PlayerContext";
import YouTube from "react-youtube";
import { Quote, Volume2, MoreHorizontal, ListPlus, Library, Download, Heart, Disc } from "lucide-react";

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
  } = usePlayer();

  const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null);

  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    document.addEventListener("click", handleClickOutside);
    window.addEventListener("scroll", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
      window.removeEventListener("scroll", handleClickOutside);
    };
  }, []);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const menuWidth = 200;
    const menuHeight = 130;
    let x = e.pageX;
    // Push the menu up so it doesn't overflow the screen (since player is at the bottom)
    let y = e.pageY - menuHeight;

    if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth - 10;
    if (y < 0) y = 10; // Fallback if it goes above screen

    setContextMenu({ x, y });
  };

  const formatTime = (time: number) => {
    if (isNaN(time) || time === 0) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
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
  };

  const onStateChange = (event: any) => {
    // PlayerState.PLAYING = 1
    // PlayerState.PAUSED = 2
    // PlayerState.ENDED = 0
    if (event.data === 1) {
      setIsPlaying(true);
      setDuration(event.target.getDuration());
    } else if (event.data === 2 || event.data === 0) {
      setIsPlaying(false);
    }
  };

  const toggleLike = async () => {
    if (!currentTrack) return;
    const currentlyLiked = currentTrack.isLiked;
    
    // Optimistic UI update
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
      // Revert if failed
      updateCurrentTrack({ isLiked: currentlyLiked });
      alert('Failed to update library status');
    }
  };

  return (
    <div className="h-24 bg-[var(--player-bg)] border-t border-[var(--border-color)] px-4 flex items-center justify-between z-50 relative">
      {/* Hidden YouTube Player */}
      {currentTrack && !currentTrack.isOffline && (
        <div className="hidden">
          <YouTube
            videoId={currentTrack.id}
            opts={{
              height: "0",
              width: "0",
              playerVars: {
                autoplay: 1,
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
          autoPlay
          onTimeUpdate={() => {
            if (nativePlayerRef.current) {
              setProgress(nativePlayerRef.current.currentTime);
            }
          }}
          onLoadedMetadata={() => {
            if (nativePlayerRef.current) {
              setDuration(nativePlayerRef.current.duration);
              nativePlayerRef.current.volume = volume / 100;
            }
          }}
          onEnded={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
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
        </div>
        
        <div className="flex items-center w-full gap-2 text-xs text-[var(--text-muted)]">
          <span className="min-w-[35px] text-right">{formatTime(progress)}</span>
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={progress}
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
          className="text-[var(--text-muted)] hover:text-white transition-colors"
          title="More options"
        >
          <MoreHorizontal className="w-5 h-5" />
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
          value={volume}
          onChange={handleVolume}
          className="w-24 custom-slider"
          style={{ "--slider-percent": `${volume}%` } as React.CSSProperties}
        />
      </div>

      {/* Context Menu */}
      {contextMenu && currentTrack && (
        <div 
          className="fixed z-[100] bg-[var(--card-bg)] border border-[var(--border-color)] shadow-xl rounded-lg py-2 w-48 text-sm glass no-drag"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div className="px-4 py-2 text-[var(--text-muted)] border-b border-[var(--border-color)] mb-1 truncate font-semibold text-xs">
            {currentTrack.title}
          </div>
          <button 
            className="w-full text-left px-4 py-2 hover:bg-[var(--card-hover)] hover:text-white transition-colors flex items-center gap-3"
            onClick={() => {
              alert(`Added ${currentTrack.title} to Queue (Stub)`);
              setContextMenu(null);
            }}
          >
            <ListPlus className="w-4 h-4" /> Add to Queue
          </button>
          <button 
            className="w-full text-left px-4 py-2 hover:bg-[var(--card-hover)] hover:text-white transition-colors flex items-center gap-3"
            onClick={async () => {
              setContextMenu(null);
              toggleLike();
            }}
          >
            <Heart className={`w-4 h-4 ${currentTrack.isLiked ? 'fill-current text-[var(--brand-gold)]' : ''}`} /> 
            {currentTrack.isLiked ? "Remove from Liked Songs" : "Save to Liked Songs"}
          </button>
          <button 
            className="w-full text-left px-4 py-2 hover:bg-[var(--card-hover)] hover:text-white transition-colors flex items-center gap-3"
            onClick={() => {
              setContextMenu(null);
              openAlbumModal(currentTrack);
            }}
          >
            <Disc className="w-4 h-4" /> Add to Album
          </button>
          <button 
            className="w-full text-left px-4 py-2 hover:bg-[var(--card-hover)] hover:text-white transition-colors flex items-center gap-3"
            onClick={async () => {
              setContextMenu(null);
              try {
                const res = await fetch('/api/download', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(currentTrack)
                });
                if (res.ok) {
                  alert(`Downloaded ${currentTrack.title} for offline playback!`);
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
