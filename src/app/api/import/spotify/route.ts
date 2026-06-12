import { NextResponse } from 'next/server';
import db from '@/lib/db';
import crypto from 'crypto';
import { createJob, updateJob } from '@/lib/importJobs';
import YTMusic from 'ytmusic-api';

const spotifyUrlInfo = require('spotify-url-info');
const { getData, getTracks } = spotifyUrlInfo(fetch);

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (!url || (!url.includes('spotify.com/album') && !url.includes('spotify.com/playlist'))) {
      return NextResponse.json({ error: 'Invalid Spotify URL. Must be an album or playlist.' }, { status: 400 });
    }

    // 1. Fetch metadata
    const data = await getData(url);
    if (!data) {
      return NextResponse.json({ error: 'Could not fetch data from Spotify' }, { status: 400 });
    }

    const title = data.name;
    const cover_image = data.coverArt?.sources?.[0]?.url || data.images?.[0]?.url || null;

    // 2. Fetch tracks
    const tracks = await getTracks(url);
    if (!tracks || tracks.length === 0) {
      return NextResponse.json({ error: 'No tracks found' }, { status: 400 });
    }

    // 3. Create album in DB
    const albumId = crypto.randomUUID();
    db.prepare('INSERT INTO albums (id, title, cover_image) VALUES (?, ?, ?)').run(albumId, title, cover_image);

    // 4. Create import job
    const jobId = createJob(albumId, tracks.length);

    // 5. Start background processing
    processBackgroundJob(jobId, albumId, tracks);

    return NextResponse.json({ jobId, albumId, title, cover_image });
  } catch (error: any) {
    console.error('Spotify Import Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to import from Spotify' }, { status: 500 });
  }
}

async function processBackgroundJob(jobId: string, albumId: string, spotifyTracks: any[]) {
  try {
    const ytmusic = new YTMusic();
    await ytmusic.initialize();

    let completed = 0;
    let failed = 0;
    const CONCURRENCY = 20;

    for (let i = 0; i < spotifyTracks.length; i += CONCURRENCY) {
      const batch = spotifyTracks.slice(i, i + CONCURRENCY);
      
      await Promise.all(batch.map(async (track: any) => {
        const trackName = track.name;
        // spotify-url-info might return track.artist as a string, or artists array
        const artistName = track.artist || track.artists?.[0]?.name || 'Unknown Artist';
        const query = artistName === 'Unknown Artist' ? trackName : `${trackName} ${artistName}`;
        
        try {
          const results = await ytmusic.searchSongs(query);
          if (results && results.length > 0) {
            let bestMatch = results[0]; // Fallback to first match
            
            // Try to find an exact or partial artist match to improve accuracy
            const targetArtist = artistName.toLowerCase();
            if (artistName !== 'Unknown Artist') {
              let candidates = [];
              for (const res of results) {
                const ytArtist = res.artist?.name?.toLowerCase() || '';
                if (ytArtist.includes(targetArtist) || targetArtist.includes(ytArtist)) {
                  candidates.push(res);
                }
              }
              if (candidates.length > 0) {
                bestMatch = candidates[0];
              }
            }
            
            const trackId = bestMatch.videoId;
            const thumbnail = bestMatch.thumbnails?.[1]?.url || bestMatch.thumbnails?.[0]?.url || null;
            const duration = bestMatch.duration || 0;
            const finalArtist = bestMatch.artist?.name || artistName;

            // Insert into tracks table
            const existingTrack: any = db.prepare('SELECT id, artist FROM tracks WHERE id = ?').get(trackId);
            if (!existingTrack) {
              db.prepare(`
                INSERT INTO tracks (id, title, artist, album, thumbnail, duration)
                VALUES (?, ?, ?, ?, ?, ?)
              `).run(trackId, bestMatch.name, finalArtist, track.album?.name || null, thumbnail, duration);
            } else if (existingTrack.artist === 'Unknown Artist' && finalArtist !== 'Unknown Artist') {
              // Update the track if it was previously saved with Unknown Artist
              db.prepare('UPDATE tracks SET artist = ? WHERE id = ?').run(finalArtist, trackId);
            }

            // Link track to our album
            try {
              db.prepare('INSERT INTO album_tracks (album_id, track_id) VALUES (?, ?)').run(albumId, trackId);
            } catch (e: any) {
               // Ignore duplicate insert errors
            }
            completed++;
          } else {
            failed++;
          }
        } catch (err) {
          console.error(`Error processing track ${trackName}:`, err);
          failed++;
        }

        updateJob(jobId, { 
          completedTracks: completed, 
          failedTracks: failed,
          currentTrack: `Batch processing (${completed + failed}/${spotifyTracks.length})` 
        });
      }));
      
      // Delay to avoid strict rate limiting between batches
      if (i + CONCURRENCY < spotifyTracks.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    updateJob(jobId, { status: 'completed' });
  } catch (err: any) {
    console.error('Background job failed:', err);
    updateJob(jobId, { status: 'failed', error: err.message });
  }
}
