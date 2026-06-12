import { NextResponse } from 'next/server';
import YTMusic from 'ytmusic-api';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('videoId');

  try {
    const ytmusic = new YTMusic();
    await ytmusic.initialize();

    if (videoId) {
      const upNexts = await ytmusic.getUpNexts(videoId);
      
      const formattedResults = upNexts.map((track: any) => {
        let artistName = 'Unknown Artist';
        if (typeof track.artists === 'string') {
          artistName = track.artists;
        } else if (Array.isArray(track.artists)) {
          artistName = track.artists[0]?.name || 'Unknown Artist';
        } else if (track.artists?.name) {
          artistName = track.artists.name;
        }

        let thumbUrl = '';
        if (typeof track.thumbnail === 'string') {
          thumbUrl = track.thumbnail;
        } else if (Array.isArray(track.thumbnails)) {
          thumbUrl = track.thumbnails[1]?.url || track.thumbnails[0]?.url || '';
        }

        return {
          id: track.videoId,
          title: track.title,
          artist: artistName,
          thumbnail: thumbUrl,
          duration: track.duration,
        };
      });

      return NextResponse.json({ results: formattedResults });
    } else {
      // Fallback: fetch home sections or default suggestions
      const homeSections = await ytmusic.getHomeSections();
      
      // Flatten tracks from home sections for generic recommendations
      const genericResults: any[] = [];
      homeSections.forEach(section => {
        section.contents.forEach((item: any) => {
          if (item.type === 'SONG' || item.type === 'VIDEO') {
            genericResults.push({
              id: item.videoId,
              title: item.name || item.title,
              artist: item.artist?.name || item.artists?.[0]?.name || 'Unknown Artist',
              album: item.album?.name,
              thumbnail: item.thumbnails?.[1]?.url || item.thumbnails?.[0]?.url,
              duration: item.duration
            });
          }
        });
      });
      
      // Return a unique subset of generic recommendations
      const uniqueResults = Array.from(new Map(genericResults.map(item => [item.id, item])).values());
      return NextResponse.json({ results: uniqueResults.slice(0, 12) });
    }
  } catch (error: any) {
    console.error('Recommendations API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
