import { NextResponse } from 'next/server';
import db from '@/lib/db';
import youtubedl from 'youtube-dl-exec';
import path from 'path';
import os from 'os';
import fs from 'fs';
import ffmpeg from 'ffmpeg-static';

export async function POST(req: Request) {
  try {
    const track = await req.json();

    if (!track || !track.id) {
      return NextResponse.json({ error: 'Missing track details' }, { status: 400 });
    }

    const appDataPath = process.platform === 'darwin' 
      ? path.join(os.homedir(), 'Library', 'Application Support', 'Open Music')
      : path.join(os.homedir(), '.open_music');
    
    const offlineDir = path.join(appDataPath, 'offline_audio');
    
    if (!fs.existsSync(offlineDir)) {
      fs.mkdirSync(offlineDir, { recursive: true });
    }

    const localPath = path.join(offlineDir, `${track.id}.webm`);

    // Bypass youtubedl wrapper because tinyspawn fails on paths with spaces (e.g. "Open Music.app")
    const { execFile } = require('child_process');
    const { promisify } = require('util');
    const execFileAsync = promisify(execFile);
    
    // @ts-ignore
    await execFileAsync(youtubedl.constants.YOUTUBE_DL_PATH, [
      `https://www.youtube.com/watch?v=${track.id}`,
      '--extract-audio',
      '--audio-format', 'opus',
      '--ffmpeg-location', ffmpeg as string,
      '--output', localPath,
      '--no-warnings',
      '--no-check-certificates',
      '--prefer-free-formats',
      '--add-header', 'referer:youtube.com',
      '--add-header', 'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ]);

    // Save track details in the DB with local_path and isOffline
    const stmt = db.prepare(`
      INSERT INTO tracks (id, title, artist, album, thumbnail, duration, local_path, isOffline)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title=excluded.title,
        artist=excluded.artist,
        album=excluded.album,
        thumbnail=excluded.thumbnail,
        duration=excluded.duration,
        local_path=excluded.local_path,
        isOffline=excluded.isOffline
    `);

    stmt.run(
      track.id,
      track.title,
      track.artist,
      track.album || null,
      track.thumbnail || null,
      track.duration || 0,
      localPath,
      1
    );

    // Fetch and save lyrics for offline use
    let lyricsData: { syncedLyrics: string | null, plainLyrics: string | null, source: string | null } = { syncedLyrics: null, plainLyrics: null, source: null };
    if (track.title && track.artist) {
      try {
        // Strip out anything from "(feat." or "feat." onwards, handling truncated YTMusic titles
        const cleanTitle = track.title.replace(/\s*\(?feat\..*/i, '').replace(/\s*\[.*?\]/g, '');
        // Extract just the primary artist before any commas or ampersands
        const cleanArtist = track.artist.split(/[,&]|\band\b/i)[0].trim();
        const query = `${cleanTitle} ${cleanArtist}`;
        const lrclibUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`;
        let foundLyrics = false;
        console.log(`Starting strict LRCLIB fetch loop for: ${query}`);
        
        while (!foundLyrics) {
          try {
            const lrclibRes = await fetch(lrclibUrl, {
              headers: { 'User-Agent': 'AuraMusic/1.0.0 (https://github.com/aura-music)' }
            });
            if (lrclibRes.ok) {
              const data = await lrclibRes.json();
              if (data && data.length > 0) {
                const syncedMatch = data.find((d: any) => d.syncedLyrics);
                const bestMatch = syncedMatch || data[0];
                if (bestMatch.syncedLyrics || bestMatch.plainLyrics) {
                  lyricsData.syncedLyrics = bestMatch.syncedLyrics || null;
                  lyricsData.plainLyrics = bestMatch.plainLyrics || null;
                  lyricsData.source = 'lrclib';
                  foundLyrics = true;
                  console.log(`Successfully found lyrics for: ${query}`);
                  break;
                }
              }
            }
          } catch (e) {
            console.error('LRCLIB loop fetch error, will retry...', e);
          }
          
          if (!foundLyrics) {
            console.log(`No lyrics found yet for ${query}, retrying in 2s...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      } catch (e) {
        console.error('LRCLIB download fetch error:', e);
      }
    }


    fs.writeFileSync(path.join(offlineDir, `${track.id}.json`), JSON.stringify(lyricsData));

    return NextResponse.json({ success: true, message: 'Track downloaded successfully', local_path: localPath });
  } catch (error: any) {
    console.error('Download error:', error);
    return NextResponse.json({ error: 'Failed to download track: ' + error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing track id' }, { status: 400 });
    }

    const track = db.prepare('SELECT local_path FROM tracks WHERE id = ?').get(id) as any;
    if (track && track.local_path) {
      const dir = path.dirname(track.local_path);
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        const actualFiles = files.filter(f => f.startsWith(id + '.'));
        for (const f of actualFiles) {
          fs.unlinkSync(path.join(dir, f));
        }
      }
    }

    db.prepare('UPDATE tracks SET isOffline = 0, local_path = NULL WHERE id = ?').run(id);

    // Clean up orphaned tracks
    db.prepare('DELETE FROM tracks WHERE isOffline = 0 AND isLiked = 0 AND id NOT IN (SELECT track_id FROM album_tracks)').run();

    return NextResponse.json({ success: true, message: 'Track deleted' });
  } catch (error: any) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: 'Failed to delete track: ' + error.message }, { status: 500 });
  }
}
