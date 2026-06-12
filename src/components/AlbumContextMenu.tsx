import React, { useState } from "react";
import { Play, ListPlus, Download, Trash2, CloudOff, Loader2 } from "lucide-react";
import { usePlayer, Track } from "@/context/PlayerContext";

interface Album {
  id: string;
  title: string;
  cover_image?: string;
}

interface AlbumContextMenuProps {
  x: number;
  y: number;
  album: Album;
  onClose: () => void;
  onDeleteAlbum: (albumId: string) => void;
}

export default function AlbumContextMenu({
  x,
  y,
  album,
  onClose,
  onDeleteAlbum
}: AlbumContextMenuProps) {
  const { playTrack, addMultipleToQueue, downloadTracks, removeDownloads } = usePlayer();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const fetchTracks = async (): Promise<Track[]> => {
    try {
      const res = await fetch(`/api/albums/${album.id}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.tracks || [];
    } catch (e) {
      console.error(e);
      return [];
    }
  };

  const handlePlay = async () => {
    setLoadingAction('play');
    const tracks = await fetchTracks();
    if (tracks.length > 0) {
      playTrack(tracks[0]);
      addMultipleToQueue(tracks.slice(1));
    }
    onClose();
  };

  const handleQueue = async () => {
    setLoadingAction('queue');
    const tracks = await fetchTracks();
    if (tracks.length > 0) {
      addMultipleToQueue(tracks);
    }
    onClose();
  };

  const handleDownload = async () => {
    setLoadingAction('download');
    const tracks = await fetchTracks();
    if (tracks.length > 0) {
      downloadTracks(tracks);
    }
    onClose();
  };

  const handleRemoveDownload = async () => {
    setLoadingAction('remove-download');
    const tracks = await fetchTracks();
    if (tracks.length > 0) {
      await removeDownloads(tracks);
    }
    onClose();
  };

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this album?")) {
      setLoadingAction('delete');
      try {
        await fetch(`/api/albums/${album.id}`, { method: 'DELETE' });
        onDeleteAlbum(album.id);
      } catch (e) {
        console.error(e);
      }
    }
    onClose();
  };

  return (
    <div 
      className="fixed z-[100] bg-[var(--card-bg)] border border-[var(--border-color)] shadow-xl rounded-lg py-2 w-48 text-sm no-drag"
      style={{ top: y, left: x }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="px-4 py-2 text-[var(--text-muted)] border-b border-[var(--border-color)] mb-1 truncate font-semibold text-xs">
        {album.title}
      </div>
      
      <button 
        disabled={loadingAction !== null}
        className="w-full text-left px-4 py-2 hover:bg-[var(--card-hover)] hover:text-white transition-colors flex items-center gap-3 disabled:opacity-50"
        onClick={handlePlay}
      >
        {loadingAction === 'play' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />} 
        Play
      </button>
      
      <button 
        disabled={loadingAction !== null}
        className="w-full text-left px-4 py-2 hover:bg-[var(--card-hover)] hover:text-white transition-colors flex items-center gap-3 disabled:opacity-50"
        onClick={handleQueue}
      >
        {loadingAction === 'queue' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ListPlus className="w-4 h-4" />} 
        Add to Queue
      </button>
      
      <button 
        disabled={loadingAction !== null}
        className="w-full text-left px-4 py-2 hover:bg-[var(--card-hover)] hover:text-white transition-colors flex items-center gap-3 disabled:opacity-50"
        onClick={handleDownload}
      >
        {loadingAction === 'download' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} 
        Download
      </button>

      <button 
        disabled={loadingAction !== null}
        className="w-full text-left px-4 py-2 hover:bg-red-500/20 text-red-400 transition-colors flex items-center gap-3 disabled:opacity-50"
        onClick={handleRemoveDownload}
      >
        {loadingAction === 'remove-download' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudOff className="w-4 h-4" />} 
        Remove Downloads
      </button>

      <button 
        disabled={loadingAction !== null}
        className="w-full text-left px-4 py-2 hover:bg-red-500/20 text-red-400 transition-colors flex items-center gap-3 disabled:opacity-50"
        onClick={handleDelete}
      >
        {loadingAction === 'delete' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} 
        Delete Album
      </button>
    </div>
  );
}
