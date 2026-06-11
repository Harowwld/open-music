import { NextResponse } from 'next/server';
import YTMusic from 'ytmusic-api';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('videoId');

  if (!videoId) {
    return NextResponse.json({ error: 'Missing query parameter "videoId"' }, { status: 400 });
  }

  try {
    const ytmusic = new YTMusic();
    await ytmusic.initialize();
    const lyrics = await ytmusic.getLyrics(videoId);

    return NextResponse.json({ lyrics });
  } catch (error: any) {
    console.error('Lyrics API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
