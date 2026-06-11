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
      ? path.join(os.homedir(), 'Library', 'Application Support', 'Aura Music')
      : path.join(os.homedir(), '.aura_music');
    
    const offlineDir = path.join(appDataPath, 'offline_audio');
    
    if (!fs.existsSync(offlineDir)) {
      fs.mkdirSync(offlineDir, { recursive: true });
    }

    const localPath = path.join(offlineDir, `${track.id}.webm`);

    // Download directly using youtube-dl-exec (yt-dlp wrapper)
    await youtubedl(`https://www.youtube.com/watch?v=${track.id}`, {
      extractAudio: true,
      audioFormat: 'opus',
      ffmpegLocation: ffmpeg as string,
      output: localPath,
      noWarnings: true,
      noCheckCertificates: true,
      preferFreeFormats: true,
      addHeader: [
        'referer:youtube.com',
        'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      ]
    });

    // Save track details in the DB with local_path and isOffline
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO tracks (id, title, artist, album, thumbnail, duration, local_path, isOffline)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
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

    return NextResponse.json({ success: true, message: 'Track downloaded successfully', local_path: localPath });
  } catch (error: any) {
    console.error('Download error:', error);
    return NextResponse.json({ error: 'Failed to download track: ' + error.message }, { status: 500 });
  }
}
