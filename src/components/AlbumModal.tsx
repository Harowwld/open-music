"use client";

import { useState, useEffect } from "react";
import { usePlayer } from "@/context/PlayerContext";
import { Plus, X, Disc } from "lucide-react";

export default function AlbumModal() {
  const { albumModalTracks, closeAlbumModal } = usePlayer();
  const [albums, setAlbums] = useState<any[]>([]);
  const [newAlbumTitle, setNewAlbumTitle] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (albumModalTracks && albumModalTracks.length > 0) {
      fetch('/api/albums')
        .then(res => res.json())
        .then(data => setAlbums(data.albums || []));
    }
  }, [albumModalTracks]);

  if (!albumModalTracks || albumModalTracks.length === 0) return null;

  const handleCreate = async () => {
    if (!newAlbumTitle.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/albums', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newAlbumTitle, cover_image: albumModalTracks[0].thumbnail })
      });
      const album = await res.json();
      if (album.id) {
        await handleAddToAlbum(album.id);
      }
    } catch (e) {
      alert('Failed to create album');
    }
    setLoading(false);
  };

  const handleAddToAlbum = async (album_id: string) => {
    setLoading(true);
    try {
      for (const track of albumModalTracks) {
        await fetch('/api/albums/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ album_id, track })
        });
      }
      closeAlbumModal();
    } catch (e) {
      alert('Failed to add to album');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={closeAlbumModal}>
      <div className="bg-[var(--card-bg)] border border-[var(--border-color)] p-6 rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Add to Album</h2>
          <button onClick={closeAlbumModal} className="text-[var(--text-muted)] hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="mb-6 flex flex-col gap-2 bg-[var(--card-hover)] p-3 rounded-lg max-h-40 overflow-y-auto">
          {albumModalTracks.map((track) => (
            <div key={track.id} className="flex items-center gap-3">
              <div className="w-10 h-10 flex-shrink-0 rounded bg-gray-800 overflow-hidden">
                {track.thumbnail && <img src={track.thumbnail} alt="Cover" className="w-full h-full object-cover" />}
              </div>
              <div className="truncate flex-1">
                <p className="font-semibold text-white truncate text-sm">{track.title}</p>
                <p className="text-xs text-[var(--text-muted)] truncate">{track.artist}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="max-h-60 overflow-y-auto mb-6 flex flex-col gap-2 pr-2">
          {albums.map(album => (
            <button
              key={album.id}
              onClick={() => handleAddToAlbum(album.id)}
              className="flex items-center gap-4 p-3 rounded-lg hover:bg-[var(--card-hover)] transition-colors text-left group"
            >
              <div className="w-10 h-10 rounded bg-gray-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {album.cover_image ? <img src={album.cover_image} alt="Album cover" className="w-full h-full object-cover" /> : <Disc className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />}
              </div>
              <span className="font-medium text-white truncate flex-1">{album.title}</span>
            </button>
          ))}
          {albums.length === 0 && (
            <p className="text-center text-[var(--text-muted)] py-4 text-sm">No existing albums.</p>
          )}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="New Album Name"
            value={newAlbumTitle ?? ""}
            onChange={e => setNewAlbumTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            className="flex-1 bg-[var(--background)] border border-[var(--border-color)] rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-[var(--brand-gold)]"
          />
          <button
            onClick={handleCreate}
            disabled={loading || !newAlbumTitle.trim()}
            className="bg-[var(--brand-gold)] text-black px-4 py-2 rounded-lg font-bold hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Create
          </button>
        </div>
      </div>
    </div>
  );
}
