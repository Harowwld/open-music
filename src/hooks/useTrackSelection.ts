import { useState, useEffect, useCallback } from 'react';
import { Track } from '@/context/PlayerContext';

export function useTrackSelection(tracks: Track[]) {
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'select' | 'deselect' | null>(null);
  const [dragStartId, setDragStartId] = useState<string | null>(null);

  useEffect(() => {
    const handleMouseUp = () => {
      setIsDragging(false);
      setDragStartId(null);
      setDragMode(null);
    };

    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedTrackIds(new Set());
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent, trackId: string) => {
    // If right click, don't start selection
    if (e.button === 2) return;

    if (e.shiftKey || e.metaKey || e.ctrlKey || selectedTrackIds.size > 0) {
      // Toggle mode
      e.stopPropagation();
      e.preventDefault();
      const next = new Set(selectedTrackIds);
      const willSelect = !next.has(trackId);
      
      if (willSelect) {
        next.add(trackId);
      } else {
        next.delete(trackId);
      }
      
      setSelectedTrackIds(next);
      setIsDragging(true);
      setDragMode(willSelect ? 'select' : 'deselect');
    } else {
      // Start drag monitoring
      setIsDragging(true);
      setDragStartId(trackId);
    }
  }, [selectedTrackIds]);

  const handleMouseEnter = useCallback((trackId: string) => {
    if (!isDragging) return;

    setSelectedTrackIds(prev => {
      const next = new Set(prev);
      
      // If we are dragging from 0 selections
      if (dragStartId) {
        next.add(dragStartId);
        next.add(trackId);
        setDragStartId(null);
        setDragMode('select');
      } else if (dragMode === 'select') {
        next.add(trackId);
      } else if (dragMode === 'deselect') {
        next.delete(trackId);
      }
      
      return next;
    });
  }, [isDragging, dragStartId, dragMode]);

  const toggleSelection = useCallback((trackId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedTrackIds(prev => {
      const next = new Set(prev);
      if (next.has(trackId)) next.delete(trackId);
      else next.add(trackId);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedTrackIds(new Set(tracks.map(t => t.id)));
  }, [tracks]);

  // Returns a click handler that only executes if we aren't selecting
  const withSelectionGuard = useCallback((trackId: string, callback: () => void) => {
    return (e: React.MouseEvent) => {
      // If right click, just let it pass to context menu
      if (e.button === 2) return;
      
      if (selectedTrackIds.size > 0) {
        toggleSelection(trackId, e);
      } else {
        callback();
      }
    };
  }, [selectedTrackIds.size, toggleSelection]);

  return {
    selectedTrackIds,
    setSelectedTrackIds,
    handleMouseDown,
    handleMouseEnter,
    clearSelection,
    selectAll,
    toggleSelection,
    withSelectionGuard
  };
}
