import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { PlayerProvider } from "@/context/PlayerContext";
import GlobalPlayer from "@/components/GlobalPlayer";
import Sidebar from "@/components/Sidebar";
import LyricsOverlay from "@/components/LyricsOverlay";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Aura Music Scraper",
  description: "An open-source music scraper application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased dark`}>
      <body className="h-full flex flex-col bg-[var(--background)] text-[var(--foreground)]">
        <PlayerProvider>
          <div className="flex flex-1 overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto bg-gradient-to-b from-[var(--card-hover)] to-[var(--background)] rounded-lg m-2 ml-0 relative">
              {children}
              <LyricsOverlay />
            </main>
          </div>
          <GlobalPlayer />
        </PlayerProvider>
      </body>
    </html>
  );
}
