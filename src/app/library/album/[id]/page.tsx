"use client";

import { useState, useEffect, use } from "react";
import { usePlayer, Track } from "@/context/PlayerContext";
import { Play, Trash2, Heart, Disc } from "lucide-react";

export default function AlbumViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [album, setAlbum] = useState<any>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { playTrack, currentTrack, isPlaying } = usePlayer();

  useEffect(() => {
    fetch(`/api/albums/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.album) {
          setAlbum(data.album);
          setTracks(data.tracks || []);
        }
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  const removeTrack = async (track: Track) => {
    try {
      await fetch(`/api/albums/${id}?trackId=${track.id}`, { method: "DELETE" });
      setTracks(tracks.filter(t => t.id !== track.id));
    } catch (e) {
      alert("Failed to remove track");
    }
  };

  const deleteAlbum = async () => {
    if (!confirm("Are you sure you want to delete this album?")) return;
    try {
      await fetch(`/api/albums/${id}`, { method: "DELETE" });
      window.location.href = "/library";
    } catch (e) {
      alert("Failed to delete album");
    }
  };

  if (isLoading) return <div className="p-8 flex justify-center"><span className="animate-spin text-3xl">💿</span></div>;
  if (!album) return <div className="p-8 text-center text-red-500">Album not found</div>;

  return (
    <div className="p-8 pb-32">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-end gap-6 mb-8 bg-gradient-to-t from-black/40 to-transparent p-6 -mx-8 -mt-8 pt-20">
          <div className="w-48 h-48 rounded-lg shadow-2xl overflow-hidden bg-gray-800 flex items-center justify-center flex-shrink-0">
            {album.cover_image ? (
              <img src={album.cover_image} alt={album.title} className="w-full h-full object-cover" />
            ) : (
              <Disc className="w-20 h-20 text-gray-500" />
            )}
          </div>
          <div className="flex flex-col gap-2 flex-1 pb-2">
            <span className="text-sm font-bold uppercase tracking-widest text-gray-300">Playlist</span>
            <h1 className="text-5xl font-extrabold text-white truncate">{album.title}</h1>
            <p className="text-[var(--text-muted)] mt-2">{tracks.length} {tracks.length === 1 ? 'song' : 'songs'}</p>
          </div>
          <button onClick={deleteAlbum} className="text-sm text-red-400 hover:text-red-300 transition-colors pb-4 flex items-center gap-2">
            <Trash2 className="w-4 h-4" /> Delete Album
          </button>
        </div>

        {tracks.length === 0 && (
          <div className="text-center py-20 text-[var(--text-muted)]">
            <p>No songs in this album yet.</p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {tracks.map((track) => {
            const isCurrentlyPlaying = currentTrack?.id === track.id;
            return (
              <div
                key={track.id}
                onClick={() => playTrack(track)}
                className={`flex items-center justify-between p-3 rounded-md cursor-pointer hover:bg-[var(--card-hover)] transition-colors group ${
                  isCurrentlyPlaying ? "bg-[var(--card-hover)]" : ""
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="relative w-12 h-12 rounded overflow-hidden shadow-md flex-shrink-0">
                    {track.thumbnail ? <img src={track.thumbnail} alt={track.title} className="object-cover w-full h-full" /> : <div className="w-full h-full bg-gray-800" />}
                    <div className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center">
                      <span className="text-white text-xl">{isCurrentlyPlaying && isPlaying ? "⏸" : "▶"}</span>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className={`font-semibold ${isCurrentlyPlaying ? "text-[var(--brand-gold)]" : "text-white"}`}>{track.title}</span>
                    <span className="text-sm text-[var(--text-muted)]">{track.artist}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={(e) => { e.stopPropagation(); removeTrack(track); }}
                    className="text-[var(--text-muted)] hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    title="Remove from Album"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
