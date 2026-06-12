import Database from 'better-sqlite3';
import path from 'path';
import os from 'os';
import fs from 'fs';

// Determine database path. Use Application Support on Mac to ensure it persists across builds.
const appDataPath = process.platform === 'darwin' 
  ? path.join(os.homedir(), 'Library', 'Application Support', 'Open Music')
  : path.join(os.homedir(), '.open_music');

if (!fs.existsSync(appDataPath)) {
  fs.mkdirSync(appDataPath, { recursive: true });
}

const dbPath = path.join(appDataPath, 'library.db');

const db = new Database(dbPath);

// Initialize table
db.exec(`
  CREATE TABLE IF NOT EXISTS tracks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    album TEXT,
    thumbnail TEXT,
    duration INTEGER,
    saved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    local_path TEXT,
    isOffline INTEGER DEFAULT 0,
    isLiked INTEGER DEFAULT 0
  )
`);

// Add columns if they don't exist (for existing databases)
const columnsInfo = db.pragma('table_info(tracks)') as any[];
const hasLocalPath = columnsInfo.some((c) => c.name === 'local_path');
if (!hasLocalPath) {
  try {
    db.exec('ALTER TABLE tracks ADD COLUMN local_path TEXT');
  } catch (e: any) {
    if (!e.message.includes('duplicate column name')) throw e;
  }
}
const hasIsOffline = columnsInfo.some((c) => c.name === 'isOffline');
if (!hasIsOffline) {
  try {
    db.exec('ALTER TABLE tracks ADD COLUMN isOffline INTEGER DEFAULT 0');
  } catch (e: any) {
    if (!e.message.includes('duplicate column name')) throw e;
  }
}
const hasIsLiked = columnsInfo.some((c) => c.name === 'isLiked');
if (!hasIsLiked) {
  try {
    db.exec('ALTER TABLE tracks ADD COLUMN isLiked INTEGER DEFAULT 0');
  } catch (e: any) {
    if (!e.message.includes('duplicate column name')) throw e;
  }
}

// Albums table
db.exec(`
  CREATE TABLE IF NOT EXISTS albums (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    cover_image TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Album Tracks relationship table
db.exec(`
  CREATE TABLE IF NOT EXISTS album_tracks (
    album_id TEXT NOT NULL,
    track_id TEXT NOT NULL,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (album_id, track_id),
    FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE,
    FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
  )
`);

export default db;
