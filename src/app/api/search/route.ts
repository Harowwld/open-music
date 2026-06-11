import { NextResponse } from 'next/server';
import YTMusic from 'ytmusic-api';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  if (!q) {
    return NextResponse.json({ error: 'Missing query parameter "q"' }, { status: 400 });
  }

  try {
    const ytmusic = new YTMusic();
    await ytmusic.initialize();
    const results = await ytmusic.searchSongs(q);
    
    // Map the results to our Track interface format
    const formattedResults = results.map((track: any) => ({
      id: track.videoId,
      title: track.name,
      artist: track.artist?.name || 'Unknown Artist',
      album: track.album?.name,
      thumbnail: track.thumbnails?.[1]?.url || track.thumbnails?.[0]?.url,
      duration: track.duration
    }));

    return NextResponse.json({ results: formattedResults });
  } catch (error: any) {
    console.error('Search API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
