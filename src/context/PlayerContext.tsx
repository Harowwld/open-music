"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect, useRef } from "react";

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
  playTrack: (track: Track) => void;
  togglePlayPause: () => void;
  toggleLyrics: () => void;
  setVolume: (volume: number) => void;
  seekTo: (time: number) => void;
  ytPlayer: any | null;
  setYtPlayer: (player: any) => void;
  nativePlayerRef: React.RefObject<HTMLAudioElement | null>;
  setIsPlaying: (playing: boolean) => void;
  setProgress: (progress: number) => void;
  setDuration: (duration: number) => void;
  updateCurrentTrack: (updates: Partial<Track>) => void;
  albumModalTrack: Track | null;
  openAlbumModal: (track: Track) => void;
  closeAlbumModal: () => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export const PlayerProvider = ({ children }: { children: ReactNode }) => {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(100); // YT volume is 0-100
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showLyrics, setShowLyrics] = useState(false);
  const [albumModalTrack, setAlbumModalTrack] = useState<Track | null>(null);
  
  const openAlbumModal = (track: Track) => setAlbumModalTrack(track);
  const closeAlbumModal = () => setAlbumModalTrack(null);
  
  const [ytPlayer, setYtPlayer] = useState<any | null>(null);
  const nativePlayerRef = useRef<HTMLAudioElement | null>(null);

  const playTrack = (track: Track) => {
    setCurrentTrack(track);
    setIsPlaying(true);
    setProgress(0);
    if (track.duration) {
      setDuration(track.duration);
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
        nativePlayerRef.current.play();
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

  // Sync progress for YT Player (Native player handles its own via onTimeUpdate in component)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (!currentTrack?.isOffline && isPlaying && ytPlayer && ytPlayer.getCurrentTime) {
      interval = setInterval(async () => {
        try {
          const currentTime = await ytPlayer.getCurrentTime();
          setProgress(currentTime);
        } catch (e) {
          // ignore
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, ytPlayer, currentTrack?.isOffline]);

  return (
    <PlayerContext.Provider
      value={{
        currentTrack,
        isPlaying,
        volume,
        progress,
        duration,
        showLyrics,
        playTrack,
        togglePlayPause,
        toggleLyrics,
        setVolume,
        seekTo,
        ytPlayer,
        setYtPlayer,
        nativePlayerRef,
        setIsPlaying,
        setProgress,
        setDuration,
        updateCurrentTrack,
        albumModalTrack,
        openAlbumModal,
        closeAlbumModal,
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
