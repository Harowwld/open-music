import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const tracks = db.prepare(`
      SELECT 
        t.*, 
        COALESCE(t.album, (SELECT a.title FROM albums a JOIN album_tracks at ON a.id = at.album_id WHERE at.track_id = t.id LIMIT 1)) as album
      FROM tracks t 
      WHERE t.isOffline = 1 
      ORDER BY t.saved_at DESC
    `).all();
    return NextResponse.json({ tracks });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
