import { NextResponse } from 'next/server';
import path from 'path';
import os from 'os';
import fs from 'fs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('videoId');
  const title = searchParams.get('title');
  const artist = searchParams.get('artist');

  if (!videoId) {
    return NextResponse.json({ error: 'Missing query parameter "videoId"' }, { status: 400 });
  }

  try {
    // 0. Check for downloaded offline lyrics first
    const appDataPath = process.platform === 'darwin' 
      ? path.join(os.homedir(), 'Library', 'Application Support', 'Open Music')
      : path.join(os.homedir(), '.open_music');
    const offlineDir = path.join(appDataPath, 'offline_audio');
    const lyricsPath = path.join(offlineDir, `${videoId}.json`);

    if (fs.existsSync(lyricsPath)) {
      const fileData = fs.readFileSync(lyricsPath, 'utf-8');
      const lyricsData = JSON.parse(fileData);
      // Only return cached offline lyrics if they actually exist.
      // If they are null (e.g. failed during download), fall through to try live fetch again.
      if (lyricsData.syncedLyrics || lyricsData.plainLyrics) {
        return NextResponse.json(lyricsData);
      }
    }

    // 1. Try fetching from LRCLIB for synced lyrics
    if (title && artist) {
      try {
        // Strip out anything from "(feat." or "feat." onwards, handling truncated YTMusic titles
        const cleanTitle = title.replace(/\s*\(?feat\..*/i, '').replace(/\s*\[.*?\]/g, '');
        // Extract just the primary artist before any commas or ampersands
        const cleanArtist = artist.split(/[,&]|\band\b/i)[0].trim();
        
        const query = `${cleanTitle} ${cleanArtist}`;
        const lrclibUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`;
        const lrclibRes = await fetch(lrclibUrl, {
          headers: { 'User-Agent': 'AuraMusic/1.0.0 (https://github.com/aura-music)' }
        });
        if (lrclibRes.ok) {
          const data = await lrclibRes.json();
          if (data && data.length > 0) {
            const syncedMatch = data.find((d: any) => d.syncedLyrics);
            const bestMatch = syncedMatch || data[0];
            
            const responseData = { 
              syncedLyrics: bestMatch.syncedLyrics || null,
              plainLyrics: bestMatch.plainLyrics || null,
              source: 'lrclib' 
            };
            
            // Self-healing: if the lyrics file exists but was empty/failed previously, update it now
            if (fs.existsSync(lyricsPath) && (responseData.syncedLyrics || responseData.plainLyrics)) {
              try {
                fs.writeFileSync(lyricsPath, JSON.stringify(responseData));
              } catch (e) {
                console.error('Failed to self-heal offline lyrics cache:', e);
              }
            }

            if (responseData.syncedLyrics || responseData.plainLyrics) {
               return NextResponse.json(responseData);
            }
          }
        }
      } catch (e) {
        console.error('LRCLIB fetch error:', e);
      }
    }

    return NextResponse.json({ plainLyrics: null, syncedLyrics: null, source: 'lrclib' });
  } catch (error: any) {
    console.error('Lyrics API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
