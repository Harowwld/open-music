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
  removeFromQueue: (index: number) => void;
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
  deleteProgress: { total: number; current: number } | null;
  downloadTracks: (tracks: Track[]) => Promise<void>;
  downloadingTrackIds: Set<string>;
  downloadedTrackIds: Set<string>;
  deletingTrackIds: Set<string>;
  downloadTrack: (track: Track) => Promise<void>;
  removeDownload: (track: Track) => Promise<void>;
  removeDownloads: (tracks: Track[]) => Promise<void>;
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
  const [deleteProgress, setDeleteProgress] = useState<{ total: number; current: number } | null>(null);
  
  const [downloadingTrackIds, setDownloadingTrackIds] = useState<Set<string>>(new Set());
  const [downloadedTrackIds, setDownloadedTrackIds] = useState<Set<string>>(new Set());
  const [deletingTrackIds, setDeletingTrackIds] = useState<Set<string>>(new Set());

  const downloadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const deleteTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const downloadQueueRef = useRef<Track[]>([]);
  const activeDownloadWorkersRef = useRef<number>(0);

  useEffect(() => {
    fetch('/api/downloaded')
      .then(res => res.json())
      .then(data => {
        if (data.tracks) {
          setDownloadedTrackIds(new Set(data.tracks.map((t: Track) => t.id)));
        }
      })
      .catch(err => console.error(err));
  }, []);

  const updateTrackState = (trackId: string, updates: Partial<Track>) => {
    setCurrentTrack(prev => (prev?.id === trackId ? { ...prev, ...updates } : prev));
    setQueue(prev => prev.map(t => (t.id === trackId ? { ...t, ...updates } : t)));
    setHistory(prev => prev.map(t => (t.id === trackId ? { ...t, ...updates } : t)));
  };
  
  const openAlbumModal = (trackOrTracks: Track | Track[]) => {
    setAlbumModalTracks(Array.isArray(trackOrTracks) ? trackOrTracks : [trackOrTracks]);
  };
  const closeAlbumModal = () => setAlbumModalTracks(null);
  
  const downloadTrack = async (track: Track) => {
    setDownloadingTrackIds(prev => {
      const next = new Set(prev);
      next.add(track.id);
      return next;
    });
    try {
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(track)
      });
      if (res.ok) {
        const data = await res.json();
        setDownloadedTrackIds(prev => {
          const next = new Set(prev);
          next.add(track.id);
          return next;
        });
        updateTrackState(track.id, { isOffline: true, local_path: data.local_path });
      }
    } catch (e) {
      console.error("Failed to download", track.title);
    } finally {
      setDownloadingTrackIds(prev => {
        const next = new Set(prev);
        next.delete(track.id);
        return next;
      });
    }
  };

  const removeDownload = async (track: Track) => {
    setDeletingTrackIds(prev => {
      const next = new Set(prev);
      next.add(track.id);
      return next;
    });
    try {
      const res = await fetch(`/api/download?id=${track.id}`, { method: 'DELETE' });
      if (res.ok) {
        setDownloadedTrackIds(prev => {
          const next = new Set(prev);
          next.delete(track.id);
          return next;
        });
        updateTrackState(track.id, { isOffline: false, local_path: undefined });
      }
    } catch (e) {
      console.error("Failed to remove download", track.title);
    } finally {
      setDeletingTrackIds(prev => {
        const next = new Set(prev);
        next.delete(track.id);
        return next;
      });
    }
  };

  const removeDownloads = async (tracksToRemove: Track[]) => {
    const offlineTracks = tracksToRemove.filter(t => downloadedTrackIds.has(t.id) && !deletingTrackIds.has(t.id));
    if (offlineTracks.length === 0) return;

    if (deleteTimeoutRef.current) {
      clearTimeout(deleteTimeoutRef.current);
      deleteTimeoutRef.current = null;
    }
    
    setDeleteProgress(prev => {
      if (prev) return { total: prev.total + offlineTracks.length, current: prev.current };
      return { total: offlineTracks.length, current: 0 };
    });
    
    for (const track of offlineTracks) {
      await removeDownload(track);
      setDeleteProgress(prev => {
        if (!prev) return null;
        const nextCurrent = prev.current + 1;
        if (nextCurrent >= prev.total) {
          if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current);
          deleteTimeoutRef.current = setTimeout(() => {
            setDeleteProgress(null);
          }, 2000);
        }
        return { total: prev.total, current: nextCurrent };
      });
    }
  };

  const processDownloadQueue = () => {
    // Chrome limits connections per origin to 6. Using 10 blocks all navigation.
    // Setting to 3 leaves 3 connections open for Next.js routing & images.
    const concurrencyLimit = 3;
    while (activeDownloadWorkersRef.current < concurrencyLimit && downloadQueueRef.current.length > 0) {
      const track = downloadQueueRef.current.shift();
      if (!track) break;
      
      activeDownloadWorkersRef.current++;
      
      (async () => {
        try {
          const res = await fetch('/api/download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(track)
          });
          if (res.ok) {
             const data = await res.json();
             setDownloadedTrackIds(prev => {
               const next = new Set(prev);
               next.add(track.id);
               return next;
             });
             updateTrackState(track.id, { isOffline: true, local_path: data.local_path });
          }
        } catch (e) {
          console.error("Failed to download", track.title);
        } finally {
          setDownloadingTrackIds(prev => {
            const next = new Set(prev);
            next.delete(track.id);
            return next;
          });
          setDownloadProgress(prev => {
            if (!prev) return null;
            const nextCurrent = prev.current + 1;
            if (nextCurrent >= prev.total) {
              if (downloadTimeoutRef.current) clearTimeout(downloadTimeoutRef.current);
              downloadTimeoutRef.current = setTimeout(() => {
                setDownloadProgress(null);
              }, 2000);
            }
            return { total: prev.total, current: nextCurrent };
          });
          
          activeDownloadWorkersRef.current--;
          processDownloadQueue();
        }
      })();
    }
  };

  const downloadTracks = async (tracksToDownload: Track[]) => {
    // Prevent adding duplicates to the queue if they're already in it
    const uniqueTracks = tracksToDownload.filter(t => 
      !downloadedTrackIds.has(t.id) && 
      !downloadingTrackIds.has(t.id) &&
      !downloadQueueRef.current.some(qt => qt.id === t.id)
    );
    if (uniqueTracks.length === 0) return;

    if (downloadTimeoutRef.current) {
      clearTimeout(downloadTimeoutRef.current);
      downloadTimeoutRef.current = null;
    }

    setDownloadProgress(prev => {
      if (prev) return { total: prev.total + uniqueTracks.length, current: prev.current };
      return { total: uniqueTracks.length, current: 0 };
    });
    
    setDownloadingTrackIds(prev => {
      const next = new Set(prev);
      uniqueTracks.forEach(t => next.add(t.id));
      return next;
    });
    
    downloadQueueRef.current.push(...uniqueTracks);
    processDownloadQueue();
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
      let d: any = track.duration;
      if (typeof d === 'string' && d.includes(':')) {
        const parts = d.split(':').map(Number);
        if (parts.length === 2) d = parts[0] * 60 + parts[1];
        else if (parts.length === 3) d = parts[0] * 3600 + parts[1] * 60 + parts[2];
      }
      setDuration(Number(d) || 0);
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
      if (nextTrack.duration) {
        let d: any = nextTrack.duration;
        if (typeof d === 'string' && d.includes(':')) {
          const parts = d.split(':').map(Number);
          if (parts.length === 2) d = parts[0] * 60 + parts[1];
          else if (parts.length === 3) d = parts[0] * 3600 + parts[1] * 60 + parts[2];
        }
        setDuration(Number(d) || 0);
      }
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
    if (track.duration) {
      let d: any = track.duration;
      if (typeof d === 'string' && d.includes(':')) {
        const parts = d.split(':').map(Number);
        if (parts.length === 2) d = parts[0] * 60 + parts[1];
        else if (parts.length === 3) d = parts[0] * 3600 + parts[1] * 60 + parts[2];
      }
      setDuration(Number(d) || 0);
    }
  };

  const clearQueue = () => {
    setQueue([]);
  };

  const removeFromQueue = (index: number) => {
    setQueue(prev => {
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });
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
      if (prevTrack.duration) {
        let d: any = prevTrack.duration;
        if (typeof d === 'string' && d.includes(':')) {
          const parts = d.split(':').map(Number);
          if (parts.length === 2) d = parts[0] * 60 + parts[1];
          else if (parts.length === 3) d = parts[0] * 3600 + parts[1] * 60 + parts[2];
        }
        setDuration(Number(d) || 0);
      }
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
        removeFromQueue,
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
        deleteProgress,
        downloadTracks,
        downloadingTrackIds,
        downloadedTrackIds,
        deletingTrackIds,
        downloadTrack,
        removeDownload,
        removeDownloads,
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
