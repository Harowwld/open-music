"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Library, Download } from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Home", icon: Home },
    { href: "/search", label: "Search", icon: Search },
    { href: "/library", label: "Your Library", icon: Library },
    { href: "/downloaded", label: "Downloaded Music", icon: Download },
  ];

  return (
    <nav className="w-64 bg-[var(--sidebar-bg)] h-full flex flex-col pt-12 p-6 gap-6 drag-region">
      <div className="flex items-center gap-2 mb-4 no-drag cursor-default">
        <div className="w-8 h-8 rounded-full bg-[var(--brand-gold)] flex items-center justify-center font-bold text-black">
          A
        </div>
        <h1 className="text-xl font-bold tracking-tight text-white">Aura Music</h1>
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

    </nav>
  );
}
