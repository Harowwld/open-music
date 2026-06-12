"use client";

import { Play, Music, Heart, Disc } from "lucide-react";
import Link from "next/link";
import { usePlayer, Track } from "@/context/PlayerContext";
import { useEffect, useState } from "react";
import AlbumContextMenu from "@/components/AlbumContextMenu";

export default function Home() {
  const { history, currentTrack, playTrack } = usePlayer();
  const [recommendations, setRecommendations] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [songCount, setSongCount] = useState<number | null>(null);
  const [albums, setAlbums] = useState<any[]>([]);
  const [albumContextMenu, setAlbumContextMenu] = useState<{ x: number, y: number, album: any } | null>(null);

  useEffect(() => {
    const handleClickOutside = () => setAlbumContextMenu(null);
    document.addEventListener("click", handleClickOutside);
    window.addEventListener("scroll", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
      window.removeEventListener("scroll", handleClickOutside);
    };
  }, []);

  const handleContextMenu = (e: React.MouseEvent, album: any) => {
    e.preventDefault();
    const menuWidth = 200;
    const menuHeight = 220;
    let x = e.pageX;
    let y = e.pageY;

    if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth - 10;
    if (y + menuHeight > window.innerHeight) y = window.innerHeight - menuHeight - 10;

    setAlbumContextMenu({ x, y, album });
  };

  const handleDeleteAlbum = (albumId: string) => {
    setAlbums(prev => prev.filter(a => a.id !== albumId));
  };

  useEffect(() => {
    const fetchLibrary = async () => {
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
        console.error("Failed to fetch library:", err);
      }
    };
    fetchLibrary();
  }, []);

  // Derive recent unique tracks from history + currentTrack
  const recentTracks = (() => {
    const allTracks = currentTrack ? [...history, currentTrack] : [...history];
    // Reverse to get most recent first
    const reversed = [...allTracks].reverse();
    // Filter out duplicates
    const unique: Track[] = [];
    const seen = new Set<string>();
    for (const track of reversed) {
      if (!seen.has(track.id)) {
        seen.add(track.id);
        unique.push(track);
      }
    }
    return unique.slice(0, 6);
  })();

  const mostRecentTrack = recentTracks.length > 0 ? recentTracks[0] : null;

  useEffect(() => {
    const fetchRecommendations = async () => {
      setIsLoading(true);
      try {
        const url = mostRecentTrack 
          ? `/api/recommendations?videoId=${mostRecentTrack.id}`
          : `/api/recommendations`;
        
        const res = await fetch(url);
        const data = await res.json();
        if (data.results) {
          setRecommendations(data.results);
        }
      } catch (err) {
        console.error("Failed to fetch recommendations:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecommendations();
  }, [mostRecentTrack?.id]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="flex flex-col min-h-full pb-8">
      {/* Draggable Header Space */}
      <div className="h-12 w-full drag-region shrink-0" />

      <div className="px-8 no-drag">
        {/* Recent Grid */}
        {recentTracks.length > 0 && (
          <>
            <h1 className="text-3xl font-bold text-white mb-6">{getGreeting()}</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
            {recentTracks.map((item, index) => (
              <div
                key={index}
                onClick={() => playTrack(item)}
                className="flex items-center gap-4 bg-white/5 hover:bg-white/10 transition-colors duration-200 rounded overflow-hidden group cursor-pointer press-scale"
              >
                <div className="w-16 h-16 shrink-0 relative bg-[var(--card-hover)] flex items-center justify-center">
                  {item.thumbnail ? (
                    <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <Music className="w-6 h-6 text-[var(--text-muted)]" />
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-8 h-8 rounded-full bg-[var(--brand-gold)] flex items-center justify-center text-black shadow-lg">
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col truncate pr-4">
                  <span className="font-semibold text-white truncate">{item.title}</span>
                  <span className="text-sm text-[var(--text-muted)] truncate">{item.artist}</span>
                </div>
              </div>
            ))}
            </div>
          </>
        )}

        {/* Your Library Section */}
        <h2 className="text-2xl font-bold text-white mb-6 w-max">
          Your Library
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 mb-10">
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
          
          {albums.slice(0, 4).map(album => (
            <Link key={album.id} href={`/library/album/${album.id}`} className="group" onContextMenu={(e) => handleContextMenu(e, album)}>
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

        {/* Recommended Section */}
        <h2 className="text-2xl font-bold text-white mb-6 hover-color w-max cursor-pointer">
          {mostRecentTrack ? `More like ${mostRecentTrack.title}` : "More like the songs you play"}
        </h2>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-8 h-8 border-4 border-[var(--brand-gold)] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
            {recommendations.map((track, index) => (
              <div
                key={index}
                onClick={() => playTrack(track)}
                className="bg-[var(--card-bg)] hover:bg-[var(--card-hover)] p-4 rounded-lg transition-colors duration-200 cursor-pointer group press-scale flex flex-col gap-4"
              >
                <div className="w-full aspect-square rounded-md bg-gradient-to-br from-neutral-800 to-neutral-900 shadow-lg relative overflow-hidden">
                  {track.thumbnail ? (
                    <img src={track.thumbnail} alt={track.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music className="w-12 h-12 text-neutral-600" />
                    </div>
                  )}
                  {/* Play Button Overlay */}
                  <div className="absolute bottom-2 right-2 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-200 ease-out z-10">
                    <button className="w-12 h-12 rounded-full bg-[var(--brand-gold)] text-black flex items-center justify-center shadow-xl hover:scale-105 transition-transform">
                      <Play className="w-6 h-6 fill-current ml-1" />
                    </button>
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-white truncate">{track.title}</span>
                  <span className="text-sm text-[var(--text-muted)] mt-1 truncate">
                    {track.artist}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {albumContextMenu && (
        <AlbumContextMenu
          x={albumContextMenu.x}
          y={albumContextMenu.y}
          album={albumContextMenu.album}
          onClose={() => setAlbumContextMenu(null)}
          onDeleteAlbum={handleDeleteAlbum}
        />
      )}
    </div>
  );
}
