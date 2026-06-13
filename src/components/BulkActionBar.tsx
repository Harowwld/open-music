import { X } from 'lucide-react';
import { useEffect } from 'react';

interface BulkActionBarProps {
  selectedCount: number;
  onClear: () => void;
  children: React.ReactNode;
}

export default function BulkActionBar({ selectedCount, onClear, children }: BulkActionBarProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClear();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClear]);

  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10 fade-in duration-300 pointer-events-auto">
      <div className="bg-[#1e1e1e]/95 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50 rounded-full px-6 py-3 flex items-center gap-6">
        <div className="flex items-center gap-3">
          <span className="bg-[var(--brand-gold)] text-black w-6 h-6 rounded-full flex items-center justify-center font-bold text-sm shadow-md shadow-[var(--brand-gold)]/20">
            {selectedCount}
          </span>
          <span className="text-white font-medium tracking-wide">Selected</span>
        </div>
        
        <div className="w-px h-6 bg-white/10"></div>
        
        <div className="flex items-center gap-3">
          {children}
        </div>
        
        <div className="w-px h-6 bg-white/10"></div>
        
        <button 
          onClick={onClear}
          className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-[var(--text-muted)] hover:text-white"
          title="Clear selection (Esc)"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
