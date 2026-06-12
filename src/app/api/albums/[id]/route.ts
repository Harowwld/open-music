import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: albumId } = await params;
    const album = db.prepare('SELECT * FROM albums WHERE id = ?').get(albumId);
    if (!album) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const tracks = db.prepare(`
      SELECT tracks.* FROM tracks
      JOIN album_tracks ON tracks.id = album_tracks.track_id
      WHERE album_tracks.album_id = ?
      ORDER BY album_tracks.added_at DESC
    `).all(albumId);

    return NextResponse.json({ album, tracks });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch album' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const url = new URL(req.url);
    const trackId = url.searchParams.get('trackId');
    const { id: albumId } = await params;
    
    if (trackId) {
      db.prepare('DELETE FROM album_tracks WHERE album_id = ? AND track_id = ?').run(albumId, trackId);
    } else {
      db.prepare('DELETE FROM albums WHERE id = ?').run(albumId);
    }
    
    // Clean up orphaned tracks
    db.prepare('DELETE FROM tracks WHERE isOffline = 0 AND isLiked = 0 AND id NOT IN (SELECT track_id FROM album_tracks)').run();
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
