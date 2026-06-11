import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const tracks = db.prepare('SELECT * FROM tracks WHERE isOffline = 1 ORDER BY saved_at DESC').all();
    return NextResponse.json({ tracks });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
