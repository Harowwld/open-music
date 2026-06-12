"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Heart, Disc, Music } from "lucide-react";
import SpotifyImportModal from "@/components/SpotifyImportModal";

export default function LibraryIndex() {
  const [songCount, setSongCount] = useState<number | null>(null);
  const [albums, setAlbums] = useState<any[]>([]);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const fetchData = async () => {
    try {
      const [libRes, albRes] = await Promise.all([
        fetch(`/api/library`),
        fetch(`/api/albums`)
      ]);
      if (libRes.ok) {
        const libData = await libRes.json();
        setSongCount(libData.tracks?.length || 0);
      }
      if (albRes.ok) {
        const albData = await albRes.json();
        setAlbums(albData.albums || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="p-8 pb-32">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-end mb-8">
          <h1 className="text-4xl font-bold text-white">Your Library</h1>
        </div>

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
          
          <div onClick={() => setIsImportModalOpen(true)} className="group cursor-pointer">
            <div className="bg-[var(--card-bg)] p-4 rounded-xl hover:bg-[var(--card-hover)] transition-all duration-300 h-full flex flex-col hover:shadow-xl hover:-translate-y-1">
              <div className="relative w-full aspect-square rounded-md overflow-hidden mb-4 shadow-lg bg-gradient-to-br from-gray-800 to-gray-900 flex flex-col items-center justify-center gap-2 border border-dashed border-gray-600 group-hover:border-[#1DB954] transition-colors">
                <Music className="w-10 h-10 text-gray-400 group-hover:text-[#1DB954] transition-colors duration-300" />
                <span className="text-sm font-semibold text-gray-400 group-hover:text-[#1DB954] transition-colors">Import Album</span>
              </div>
              <h3 className="font-bold text-white text-lg mb-1 truncate">Spotify</h3>
              <p className="text-sm text-[var(--text-muted)]">Import tool</p>
            </div>
          </div>
          
          {albums.map(album => (
            <Link key={album.id} href={`/library/album/${album.id}`} className="group">
              <div className="bg-[var(--card-bg)] p-4 rounded-xl hover:bg-[var(--card-hover)] transition-all duration-300 cursor-pointer h-full flex flex-col hover:shadow-xl hover:-translate-y-1">
                <div className="relative w-full aspect-square rounded-md overflow-hidden mb-4 shadow-lg bg-gray-800 flex items-center justify-center">
                  {album.cover_image ? (
                    <img src={album.cover_image} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                  ) : (
                    <Disc className="w-16 h-16 text-gray-500 transition-transform duration-300 group-hover:scale-110" />
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                </div>
                <h3 className="font-bold text-white text-lg mb-1 truncate">{album.title}</h3>
                <p className="text-sm text-[var(--text-muted)]">Playlist</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
      <SpotifyImportModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
        onSuccess={fetchData} 
      />
    </div>
  );
}
