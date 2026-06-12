import React from "react";
import { Play, ListPlus, Heart, Disc, Download, Trash2 } from "lucide-react";
import { Track } from "@/context/PlayerContext";

interface TrackContextMenuProps {
  x: number;
  y: number;
  track: Track;
  onClose: () => void;
  onPlay: (track: Track) => void;
  onAddToQueue: (track: Track) => void;
  onToggleLike: (track: Track) => void;
  onAddToAlbum: (track: Track) => void;
  onDownload: (track: Track) => void;
  
  // Specific Actions
  onRemoveFromAlbum?: (track: Track) => void;
  onRemoveDownload?: (track: Track) => void;
}

export default function TrackContextMenu({
  x,
  y,
  track,
  onClose,
  onPlay,
  onAddToQueue,
  onToggleLike,
  onAddToAlbum,
  onDownload,
  onRemoveFromAlbum,
  onRemoveDownload
}: TrackContextMenuProps) {
  return (
    <div 
      className="fixed z-[100] bg-[var(--card-bg)] border border-[var(--border-color)] shadow-xl rounded-lg py-2 w-48 text-sm glass no-drag"
      style={{ top: y, left: x }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="px-4 py-2 text-[var(--text-muted)] border-b border-[var(--border-color)] mb-1 truncate font-semibold text-xs">
        {track.title}
      </div>
      <button 
        className="w-full text-left px-4 py-2 hover:bg-[var(--card-hover)] hover:text-white transition-colors flex items-center gap-3"
        onClick={() => {
          onPlay(track);
          onClose();
        }}
      >
        <Play className="w-4 h-4 fill-current" /> Play
      </button>
      <button 
        className="w-full text-left px-4 py-2 hover:bg-[var(--card-hover)] hover:text-white transition-colors flex items-center gap-3"
        onClick={() => {
          onAddToQueue(track);
          onClose();
        }}
      >
        <ListPlus className="w-4 h-4" /> Add to Queue
      </button>
      <button 
        className="w-full text-left px-4 py-2 hover:bg-[var(--card-hover)] hover:text-white transition-colors flex items-center gap-3"
        onClick={() => {
          onToggleLike(track);
          onClose();
        }}
      >
        <Heart className={`w-4 h-4 ${track.isLiked ? 'fill-current text-[var(--brand-gold)]' : ''}`} /> 
        {track.isLiked ? "Unlike" : "Like"}
      </button>
      <button 
        className="w-full text-left px-4 py-2 hover:bg-[var(--card-hover)] hover:text-white transition-colors flex items-center gap-3"
        onClick={() => {
          onAddToAlbum(track);
          onClose();
        }}
      >
        <Disc className="w-4 h-4" /> Add to Album
      </button>
      <button 
        className="w-full text-left px-4 py-2 hover:bg-[var(--card-hover)] hover:text-white transition-colors flex items-center gap-3"
        onClick={() => {
          onDownload(track);
          onClose();
        }}
      >
        <Download className="w-4 h-4" /> Download
      </button>

      {onRemoveFromAlbum && (
        <button 
          className="w-full text-left px-4 py-2 hover:bg-red-500/20 text-red-400 transition-colors flex items-center gap-3"
          onClick={() => {
            onRemoveFromAlbum(track);
            onClose();
          }}
        >
          <Trash2 className="w-4 h-4" /> Remove from Album
        </button>
      )}

      {onRemoveDownload && (
        <button 
          className="w-full text-left px-4 py-2 hover:bg-red-500/20 text-red-400 transition-colors flex items-center gap-3"
          onClick={() => {
            onRemoveDownload(track);
            onClose();
          }}
        >
          <Trash2 className="w-4 h-4" /> Remove Download
        </button>
      )}
    </div>
  );
}
