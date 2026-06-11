"use client";

import { useEffect, useState } from "react";
import { usePlayer } from "@/context/PlayerContext";
import { Loader2 } from "lucide-react";

export default function LyricsOverlay() {
  const { currentTrack, showLyrics } = usePlayer();
  const [lyrics, setLyrics] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!showLyrics || !currentTrack) return;

    const fetchLyrics = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/lyrics?videoId=${currentTrack.id}`);
        if (!res.ok) throw new Error("Failed to fetch lyrics");
        const data = await res.json();
        
        if (data.lyrics && data.lyrics.length > 0) {
          setLyrics(data.lyrics);
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
  }, [currentTrack, showLyrics]);

  if (!showLyrics || !currentTrack) return null;

  return (
    <div className="absolute inset-0 z-40 bg-[var(--background)] flex flex-col overflow-hidden animate-in fade-in duration-300">
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
      <div className="relative z-10 flex-1 overflow-y-auto pt-16 pb-32 px-12 md:px-24 hide-scrollbar">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="w-12 h-12 text-[var(--brand-gold)] animate-spin" />
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center text-center">
             <p className="text-2xl text-[var(--text-muted)] font-medium">{error}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6 max-w-3xl">
            {lyrics.map((line, index) => (
              <p 
                key={index} 
                className="text-3xl md:text-5xl font-bold text-white opacity-80 hover:opacity-100 transition-opacity leading-tight cursor-default"
              >
                {line}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
