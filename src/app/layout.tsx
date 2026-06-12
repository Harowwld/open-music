import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { PlayerProvider } from "@/context/PlayerContext";
import GlobalPlayer from "@/components/GlobalPlayer";
import Sidebar from "@/components/Sidebar";
import LyricsOverlay from "@/components/LyricsOverlay";
import AlbumModal from "@/components/AlbumModal";

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
  modal,
}: Readonly<{
  children: React.ReactNode;
  modal: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased dark`}>
      <body className="h-full flex flex-col bg-[var(--background)] text-[var(--foreground)]">
        <PlayerProvider>
          <div className="flex flex-1 overflow-hidden">
            <Sidebar />
            <div className="flex-1 m-2 ml-0 relative rounded-lg overflow-hidden bg-[var(--background)]">
              <main className="absolute inset-0 overflow-y-auto bg-gradient-to-b from-[var(--card-hover)] to-[var(--background)]">
                {children}
              </main>
              <LyricsOverlay />
            </div>
          </div>
          <GlobalPlayer />
          <AlbumModal />
        </PlayerProvider>
      </body>
    </html>
  );
}
