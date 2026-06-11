"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";

export default function LibraryIndex() {
  const [songCount, setSongCount] = useState<number | null>(null);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await fetch(`/api/library`);
        if (res.ok) {
          const data = await res.json();
          setSongCount(data.tracks?.length || 0);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchCount();
  }, []);

  return (
    <div className="p-8 pb-32">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-white">Your Library</h1>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          <Link href="/library/liked" className="group">
            <div className="bg-[var(--card-bg)] p-4 rounded-xl hover:bg-[var(--card-hover)] transition-all duration-300 cursor-pointer h-full flex flex-col hover:shadow-xl hover:-translate-y-1">
              <div className="relative w-full aspect-square rounded-md overflow-hidden mb-4 shadow-lg bg-gradient-to-br from-indigo-600 via-purple-500 to-pink-400 flex items-center justify-center">
                <Heart className="w-16 h-16 text-white drop-shadow-md fill-white transition-transform duration-300 group-hover:scale-110" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
              </div>
              <h3 className="font-bold text-white text-lg mb-1 truncate">Liked Songs</h3>
              <p className="text-sm text-[var(--text-muted)]">
                {songCount !== null ? `${songCount} ${songCount === 1 ? 'song' : 'songs'}` : 'Playlist'}
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
