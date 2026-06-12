"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect, useRef, useCallback } from "react";

export interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string;
  thumbnail?: string;
  duration?: number;
  isOffline?: boolean;
  local_path?: string;
  isLiked?: boolean;
}

interface PlayerContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  volume: number;
  progress: number;
  duration: number;
  showLyrics: boolean;
  queue: Track[];
  history: Track[];
  playTrack: (track: Track) => void;
  togglePlayPause: () => void;
  toggleLyrics: () => void;
  closeLyrics: () => void;
  setVolume: (volume: number) => void;
  seekTo: (time: number) => void;
  addToQueue: (track: Track) => void;
  addMultipleToQueue: (tracks: Track[]) => void;
  playNext: () => void;
  playPrevious: () => void;
  playFromQueue: (index: number) => void;
  clearQueue: () => void;
  ytPlayer: any | null;
  setYtPlayer: (player: any) => void;
  nativePlayerRef: React.RefObject<HTMLAudioElement | null>;
  setIsPlaying: (playing: boolean) => void;
  setProgress: (progress: number) => void;
  setDuration: (duration: number) => void;
  updateCurrentTrack: (updates: Partial<Track>) => void;
  albumModalTracks: Track[] | null;
  openAlbumModal: (trackOrTracks: Track | Track[]) => void;
  closeAlbumModal: () => void;
  downloadProgress: { total: number; current: number } | null;
  downloadTracks: (tracks: Track[]) => Promise<void>;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export const PlayerProvider = ({ children }: { children: ReactNode }) => {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(100); // YT volume is 0-100
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showLyrics, setShowLyrics] = useState(false);
  const [queue, setQueue] = useState<Track[]>([]);
  const [history, setHistory] = useState<Track[]>([]);
  const [albumModalTracks, setAlbumModalTracks] = useState<Track[] | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<{ total: number; current: number } | null>(null);
  
  const openAlbumModal = (trackOrTracks: Track | Track[]) => {
    setAlbumModalTracks(Array.isArray(trackOrTracks) ? trackOrTracks : [trackOrTracks]);
  };
  const closeAlbumModal = () => setAlbumModalTracks(null);
  
  const downloadTracks = async (tracksToDownload: Track[]) => {
    if (tracksToDownload.length === 0) return;
    setDownloadProgress({ total: tracksToDownload.length, current: 0 });
    
    let downloadedCount = 0;
    const concurrencyLimit = 5;
    const queueToDownload = [...tracksToDownload];
    
    const worker = async () => {
      while (queueToDownload.length > 0) {
        const track = queueToDownload.shift();
        if (!track) break;
        try {
          await fetch('/api/download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(track)
          });
        } catch (e) {
          console.error("Failed to download", track.title);
        } finally {
          downloadedCount++;
          setDownloadProgress({ total: tracksToDownload.length, current: downloadedCount });
        }
      }
    };
    
    const workers = [];
    for (let i = 0; i < Math.min(concurrencyLimit, tracksToDownload.length); i++) {
      workers.push(worker());
    }
    
    await Promise.all(workers);
    
    setTimeout(() => {
      setDownloadProgress(null);
    }, 2000);
  };
  
  const [ytPlayer, setYtPlayer] = useState<any | null>(null);
  const nativePlayerRef = useRef<HTMLAudioElement | null>(null);

  const [hasHydrated, setHasHydrated] = useState(false);
  const lastSavedProgress = useRef<number>(0);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("music_scraper_state");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.currentTrack) setCurrentTrack(parsed.currentTrack);
        if (parsed.queue) setQueue(parsed.queue);
        if (parsed.history) setHistory(parsed.history);
        if (parsed.progress) {
          setProgress(parsed.progress);
          lastSavedProgress.current = parsed.progress;
        }
        if (parsed.duration) setDuration(parsed.duration);
        if (parsed.volume) setVolumeState(parsed.volume);
      }
    } catch (e) {
      console.error("Failed to load state from localStorage", e);
    }
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;
    
    // Throttle progress saving to every 5 seconds or when paused
    const shouldSaveProgress = Math.abs(progress - lastSavedProgress.current) > 5 || !isPlaying;
    
    if (shouldSaveProgress) {
      try {
        localStorage.setItem("music_scraper_state", JSON.stringify({
          currentTrack,
          queue,
          history,
          progress,
          duration,
          volume
        }));
        lastSavedProgress.current = progress;
      } catch (e) {
        // ignore
      }
    }
  }, [progress, isPlaying, hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;
    
    // Save immediately on major state changes
    try {
      localStorage.setItem("music_scraper_state", JSON.stringify({
        currentTrack,
        queue,
        history,
        progress: lastSavedProgress.current,
        duration,
        volume
      }));
    } catch (e) {
      // ignore
    }
  }, [currentTrack, queue, history, duration, volume, hasHydrated]);

  const playTrack = (track: Track) => {
    if (currentTrack && currentTrack.id !== track.id) {
      setHistory(prev => [...prev, currentTrack]);
    }
    setCurrentTrack(track);
    setIsPlaying(true);
    setProgress(0);
    if (track.duration) {
      setDuration(track.duration);
    }
  };

  const addToQueue = (track: Track) => {
    setQueue(prev => [...prev, track]);
  };

  const addMultipleToQueue = (newTracks: Track[]) => {
    setQueue(prev => [...prev, ...newTracks]);
  };


  const playNext = () => {
    if (queue.length > 0) {
      const nextTrack = queue[0];
      setQueue(prev => prev.slice(1));
      if (currentTrack) {
        setHistory(prev => [...prev, currentTrack]);
      }
      setCurrentTrack(nextTrack);
      setIsPlaying(true);
      setProgress(0);
      if (nextTrack.duration) setDuration(nextTrack.duration);
    } else {
      setIsPlaying(false);
      setProgress(0);
    }
  };

  const playFromQueue = (index: number) => {
    if (index < 0 || index >= queue.length) return;
    const track = queue[index];
    setQueue(prev => prev.filter((_, i) => i !== index));
    if (currentTrack) {
      setHistory(prev => [...prev, currentTrack]);
    }
    setCurrentTrack(track);
    setIsPlaying(true);
    setProgress(0);
    if (track.duration) setDuration(track.duration);
  };

  const clearQueue = () => {
    setQueue([]);
  };

  const playPrevious = () => {
    if (progress > 3) {
      seekTo(0);
    } else if (history.length > 0) {
      const prevTrack = history[history.length - 1];
      setHistory(prev => prev.slice(0, -1));
      if (currentTrack) {
        setQueue(prev => [currentTrack, ...prev]);
      }
      setCurrentTrack(prevTrack);
      setIsPlaying(true);
      setProgress(0);
      if (prevTrack.duration) setDuration(prevTrack.duration);
    } else {
      seekTo(0);
    }
  };

  const updateCurrentTrack = (updates: Partial<Track>) => {
    if (currentTrack) {
      setCurrentTrack({ ...currentTrack, ...updates });
    }
  };

  const togglePlayPause = () => {
    if (currentTrack?.isOffline && nativePlayerRef.current) {
      if (isPlaying) {
        nativePlayerRef.current.pause();
        setIsPlaying(false);
      } else {
        const playPromise = nativePlayerRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(e => console.log("Playback error:", e));
        }
        setIsPlaying(true);
      }
    } else if (ytPlayer) {
      if (isPlaying) {
        ytPlayer.pauseVideo();
      } else {
        ytPlayer.playVideo();
      }
    }
  };

  const toggleLyrics = () => {
    setShowLyrics(prev => !prev);
  };

  const closeLyrics = useCallback(() => {
    setShowLyrics(false);
  }, []);

  const setVolume = (newVolume: number) => {
    if (currentTrack?.isOffline && nativePlayerRef.current) {
      nativePlayerRef.current.volume = newVolume / 100;
    } else if (ytPlayer && ytPlayer.setVolume) {
      ytPlayer.setVolume(newVolume);
    }
    setVolumeState(newVolume);
  };

  const seekTo = (time: number) => {
    if (currentTrack?.isOffline && nativePlayerRef.current) {
      nativePlayerRef.current.currentTime = time;
      setProgress(time);
    } else if (ytPlayer && ytPlayer.seekTo) {
      ytPlayer.seekTo(time, true);
      setProgress(time);
    }
  };

  // Sync progress for both YT Player and Native Audio Player
  useEffect(() => {
    let animationFrameId: number;
    let isActive = true;

    const updateProgress = async () => {
      if (!isActive) return;
      try {
        if (currentTrack?.isOffline && nativePlayerRef.current) {
          setProgress(nativePlayerRef.current.currentTime);
        } else if (!currentTrack?.isOffline && ytPlayer && ytPlayer.getCurrentTime) {
          const currentTime = await ytPlayer.getCurrentTime();
          setProgress(currentTime);
        }
      } catch (e) {
        // ignore
      }
      if (isActive) {
        animationFrameId = requestAnimationFrame(updateProgress);
      }
    };

    if (isPlaying) {
      animationFrameId = requestAnimationFrame(updateProgress);
    }

    return () => {
      isActive = false;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isPlaying, ytPlayer, currentTrack?.isOffline, nativePlayerRef]);

  return (
    <PlayerContext.Provider
      value={{
        currentTrack,
        isPlaying,
        volume,
        progress,
        duration,
        showLyrics,
        queue,
        history,
        playTrack,
        togglePlayPause,
        toggleLyrics,
        closeLyrics,
        setVolume,
        seekTo,
        addToQueue,
        addMultipleToQueue,
        playNext,
        playPrevious,
        playFromQueue,
        clearQueue,
        ytPlayer,
        setYtPlayer,
        nativePlayerRef,
        setIsPlaying,
        setProgress,
        setDuration,
        updateCurrentTrack,
        albumModalTracks,
        openAlbumModal,
        closeAlbumModal,
        downloadProgress,
        downloadTracks,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (context === undefined) {
    throw new Error("usePlayer must be used within a PlayerProvider");
  }
  return context;
};
