"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Library } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";

export default function Sidebar() {
  const pathname = usePathname();
  const { downloadProgress, closeLyrics } = usePlayer();

  useEffect(() => {
    closeLyrics();
  }, [pathname, closeLyrics]);

  const links = [
    { href: "/", label: "Home", icon: Home },
    { href: "/search", label: "Search", icon: Search },
    { href: "/library", label: "Your Library", icon: Library },
  ];

  return (
    <nav className="w-64 bg-[var(--sidebar-bg)] h-full flex flex-col pt-12 p-6 gap-6 drag-region">
      <div className="flex items-center gap-2 mb-4 no-drag cursor-default">
        <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden">
          <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-white">Open Music</h1>
      </div>

      <div className="flex flex-col gap-4 no-drag">
        {links.map((link) => {
          const isActive = pathname === link.href;
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-4 text-sm font-semibold press-scale transition-colors duration-150 ease-out ${
                isActive ? "text-white" : "text-[var(--text-muted)] hover:text-white"
              }`}
            >
              <Icon className="w-6 h-6" />
              {link.label}
            </Link>
          );
        })}
      </div>

      <div className="flex-1" />

      {downloadProgress && (
        <div className="no-drag bg-[var(--card-bg)] p-4 rounded-xl border border-[var(--border-color)] shadow-lg mt-auto mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-white">Downloading...</span>
            <span className="text-xs font-mono text-[var(--brand-gold)]">{downloadProgress.current}/{downloadProgress.total}</span>
          </div>
          <div className="w-full bg-black/40 rounded-full h-2 overflow-hidden border border-white/5">
            <div 
              className="bg-gradient-to-r from-[var(--brand-gold)] to-[#ffe0b2] h-2 rounded-full transition-all duration-300 relative"
              style={{ width: `${Math.max(5, (downloadProgress.current / downloadProgress.total) * 100)}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
