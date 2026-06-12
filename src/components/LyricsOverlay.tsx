"use client";

import { useEffect, useState, useRef } from "react";
import { usePlayer } from "@/context/PlayerContext";
import { Loader2, Music } from "lucide-react";

interface LyricLine {
  time: number | null;
  text: string;
}

export default function LyricsOverlay() {
  const { currentTrack, progress, showLyrics } = usePlayer();
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!currentTrack) return;

    const fetchLyrics = async () => {
      setLoading(true);
      setError(null);
      try {
        const artist = currentTrack.artist || '';
        const params = new URLSearchParams({
          videoId: currentTrack.id,
          title: currentTrack.title || '',
          artist: artist
        });
        
        const res = await fetch(`/api/lyrics?${params}`);
        if (!res.ok) throw new Error("Failed to fetch lyrics");
        const data = await res.json();
        
        let parsedLyrics: LyricLine[] = [];
        
        if (data.syncedLyrics) {
          const lines = data.syncedLyrics.split('\n');
          const timeReg = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;
          for (const line of lines) {
            const match = timeReg.exec(line);
            if (match) {
              const min = parseInt(match[1]);
              const sec = parseInt(match[2]);
              const ms = parseInt(match[3]);
              const time = min * 60 + sec + (ms / (match[3].length === 2 ? 100 : 1000));
              const text = line.replace(timeReg, '').trim();
              if (text) parsedLyrics.push({ time, text });
            }
          }
        } else if (data.plainLyrics) {
          parsedLyrics = data.plainLyrics.split('\n').map((l: string) => ({ time: null, text: l }));
        } else if (data.lyrics) { // Fallback for old API if any
          const raw = Array.isArray(data.lyrics) ? data.lyrics.join('\n') : data.lyrics;
          parsedLyrics = raw.split('\n').map((l: string) => ({ time: null, text: l }));
        }
        
        if (parsedLyrics.length > 0) {
          setLyrics(parsedLyrics);
        } else {
          setError("No lyrics found for this track.");
        }
      } catch (err: any) {
        setError(err.message || "Could not load lyrics.");
      } finally {
        setLoading(false);
      }
    };

    fetchLyrics();
  }, [currentTrack]);

  // Auto-scroll logic
  const activeIndex = lyrics.reduce((acc, curr, index) => {
    if (curr.time !== null && progress >= curr.time) {
      return index;
    }
    return acc;
  }, -1);

  useEffect(() => {
    if (activeLineRef.current && scrollRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeIndex]);

  if (!currentTrack || !showLyrics) return null;

  return (
    <div className="absolute inset-0 z-50 bg-[var(--background)] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-500 rounded-lg">
      {/* Blurred Background Image */}
      {currentTrack.thumbnail && (
        <div 
          className="absolute inset-0 opacity-20 bg-cover bg-center blur-3xl scale-110 pointer-events-none transition-all duration-1000"
          style={{ backgroundImage: `url(${currentTrack.thumbnail})` }}
        />
      )}

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-[var(--background)] pointer-events-none" />

      {/* Content */}
      <div ref={scrollRef} className="relative z-10 flex-1 overflow-y-auto pt-32 pb-64 px-12 md:px-24 hide-scrollbar scroll-smooth">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="w-12 h-12 text-[var(--brand-gold)] animate-spin" />
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center text-center">
             <p className="text-2xl text-[var(--text-muted)] font-medium">{error}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6 max-w-3xl mx-auto pb-[30vh]">
            {lyrics.map((line, index) => {
              const isActive = index === activeIndex;
              const isPast = activeIndex !== -1 && index < activeIndex;
              const hasTimestamps = lyrics.some(l => l.time !== null);
              
              // If there are no timestamps, we just display all text as white
              let opacityClass = "opacity-80";
              if (hasTimestamps) {
                if (isActive) opacityClass = "opacity-100";
                else if (isPast) opacityClass = "opacity-40";
                else opacityClass = "opacity-40 hover:opacity-80";
              }

              return (
                <p 
                  key={index} 
                  ref={isActive ? activeLineRef : null}
                  className={`text-3xl md:text-5xl font-bold text-white transition-all duration-500 leading-tight cursor-default ${opacityClass} ${isActive ? 'scale-105 origin-left shadow-black drop-shadow-xl' : ''}`}
                >
                  {line.text || "♪"}
                </p>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
