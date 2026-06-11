import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { album_id, track } = await req.json();
    
    // Ensure track exists in tracks table
    const existingTrack = db.prepare('SELECT id FROM tracks WHERE id = ?').get(track.id);
    if (!existingTrack) {
      db.prepare(`
        INSERT INTO tracks (id, title, artist, album, thumbnail, duration)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(track.id, track.title, track.artist, track.album, track.thumbnail, track.duration);
    }

    db.prepare('INSERT OR IGNORE INTO album_tracks (album_id, track_id) VALUES (?, ?)')
      .run(album_id, track.id);
      
    // Optionally update album cover_image if it doesn't have one
    const album = db.prepare('SELECT cover_image FROM albums WHERE id = ?').get(album_id) as any;
    if (album && !album.cover_image && track.thumbnail) {
      db.prepare('UPDATE albums SET cover_image = ? WHERE id = ?').run(track.thumbnail, album_id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add track' }, { status: 500 });
  }
}
