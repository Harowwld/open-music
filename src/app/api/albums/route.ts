import { NextResponse } from 'next/server';
import db from '@/lib/db';
import crypto from 'crypto';

export async function GET() {
  try {
    const albums = db.prepare('SELECT * FROM albums ORDER BY created_at DESC').all();
    return NextResponse.json({ albums });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch albums' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { title, cover_image } = await req.json();
    const id = crypto.randomUUID();
    db.prepare('INSERT INTO albums (id, title, cover_image) VALUES (?, ?, ?)')
      .run(id, title, cover_image || null);
    
    return NextResponse.json({ id, title, cover_image });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create album' }, { status: 500 });
  }
}
