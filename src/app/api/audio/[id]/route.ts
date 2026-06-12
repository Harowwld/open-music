import { NextResponse } from 'next/server';
import db from '@/lib/db';
import fs from 'fs';
import path from 'path';

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;

  if (!id) {
    return new NextResponse('Track ID is required', { status: 400 });
  }

  try {
    const track: any = db.prepare('SELECT * FROM tracks WHERE id = ?').get(id);

    if (!track || !track.local_path || track.isOffline !== 1) {
      return new NextResponse('Track not found or not offline', { status: 404 });
    }

    let filePath = track.local_path;

    if (!fs.existsSync(filePath)) {
      const dir = path.dirname(filePath);
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        const actualFile = files.find(f => f.startsWith(id + '.') && !f.endsWith('.json'));
        if (actualFile) {
          filePath = path.join(dir, actualFile);
        } else {
          return new NextResponse('File not found on disk', { status: 404 });
        }
      } else {
        return new NextResponse('File not found on disk', { status: 404 });
      }
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeType = ext === '.opus' ? 'audio/ogg' : ext === '.m4a' ? 'audio/mp4' : ext === '.mp3' ? 'audio/mpeg' : 'audio/webm';

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;

    // Get the range header
    const range = req.headers.get('range');

    if (range) {
      // Parse the Range header (e.g., "bytes=0-1000")
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      // Handle invalid ranges
      if (start >= fileSize || end >= fileSize) {
        return new NextResponse(null, {
          status: 416,
          headers: {
            'Content-Range': `bytes */${fileSize}`,
          },
        });
      }

      const chunksize = (end - start) + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });

      // @ts-ignore
      return new NextResponse(fileStream, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize.toString(),
          'Content-Type': mimeType,
        },
      });
    } else {
      const fileStream = fs.createReadStream(filePath);

      // @ts-ignore
      return new NextResponse(fileStream, {
        status: 200,
        headers: {
          'Content-Length': fileSize.toString(),
          'Content-Type': mimeType,
        },
      });
    }
  } catch (error: any) {
    console.error('Audio stream error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
