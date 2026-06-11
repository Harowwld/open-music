import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const tracks = db.prepare('SELECT * FROM tracks WHERE isLiked = 1 ORDER BY saved_at DESC').all();
    return NextResponse.json({ tracks });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const track = await request.json();
    
    const insert = db.prepare(`
      INSERT INTO tracks (id, title, artist, album, thumbnail, duration, isLiked)
      VALUES (@id, @title, @artist, @album, @thumbnail, @duration, 1)
      ON CONFLICT(id) DO UPDATE SET
        title=excluded.title,
        artist=excluded.artist,
        thumbnail=excluded.thumbnail,
        isLiked=1
    `);
    
    insert.run({
      id: track.id,
      title: track.title,
      artist: track.artist || 'Unknown',
      album: track.album || null,
      thumbnail: track.thumbnail || null,
      duration: track.duration || 0
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Library POST Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing track id' }, { status: 400 });
    }

    db.prepare('UPDATE tracks SET isLiked = 0 WHERE id = ?').run(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
