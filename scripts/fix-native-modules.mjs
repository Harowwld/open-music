/**
 * fix-native-modules.mjs
 *
 * After `next build`, the standalone output contains better-sqlite3 compiled
 * against the system Node.js ABI (e.g. 141 for Node 25). Electron 31 runs on
 * ABI 125. This script downloads the correct prebuilt binary from the
 * better-sqlite3 GitHub releases and drops it into .next/standalone so that
 * electron-builder packages the right binary.
 *
 * Run automatically by the `build:mac` npm script.
 */

import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { pipeline } from 'stream/promises';
import { extract } from 'tar';
import { execFileSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ── Configuration ────────────────────────────────────────────────────────────
const ELECTRON_VERSION = '31.7.7';
const ELECTRON_ABI     = '125';          // node_modules/.bin/electron --abi
const SQLITE_VERSION   = '12.10.0';      // must match package.json
const PLATFORM         = process.platform === 'darwin' ? 'darwin' : process.platform === 'win32' ? 'win32' : 'linux';
const ARCH             = process.arch;   // arm64 or x64

const TARBALL_NAME = `better-sqlite3-v${SQLITE_VERSION}-electron-v${ELECTRON_ABI}-${PLATFORM}-${ARCH}.tar.gz`;
const DOWNLOAD_URL = `https://github.com/WiseLibs/better-sqlite3/releases/download/v${SQLITE_VERSION}/${TARBALL_NAME}`;

// Where next build puts the standalone copy (pnpm virtual store symlink)
const STANDALONE_SQLITE_DIR = path.join(ROOT, '.next', 'standalone', 'node_modules', 'better-sqlite3');
const RELEASE_DIR = path.join(STANDALONE_SQLITE_DIR, 'build', 'Release');
const TARGET_NODE = path.join(RELEASE_DIR, 'better_sqlite3.node');

// ── Helpers ──────────────────────────────────────────────────────────────────
function log(msg) { console.log(`[fix-native-modules] ${msg}`); }

async function download(url) {
  log(`Downloading ${url} …`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res; // a Response whose body is a ReadableStream
}

// ── Main ─────────────────────────────────────────────────────────────────────
if (!existsSync(STANDALONE_SQLITE_DIR)) {
  console.error(`[fix-native-modules] ERROR: ${STANDALONE_SQLITE_DIR} not found.`);
  console.error('Run `pnpm run build` first to generate the Next.js standalone output.');
  process.exit(1);
}

mkdirSync(RELEASE_DIR, { recursive: true });

log(`Target: ${TARGET_NODE}`);
log(`Electron ${ELECTRON_VERSION} → ABI ${ELECTRON_ABI} | platform=${PLATFORM} arch=${ARCH}`);

const response = await download(DOWNLOAD_URL);

// The tarball contains build/Release/better_sqlite3.node — extract to a temp
// location then move the .node file into place.
const tmpDir = path.join(ROOT, '.next', 'standalone', '.sqlite3-tmp');
mkdirSync(tmpDir, { recursive: true });

await pipeline(
  response.body,
  extract({ cwd: tmpDir, strip: 0 })
);

const extracted = path.join(tmpDir, 'build', 'Release', 'better_sqlite3.node');
if (!existsSync(extracted)) {
  console.error(`[fix-native-modules] ERROR: expected ${extracted} after extraction.`);
  process.exit(1);
}

// Move into place (overwrite the wrong ABI binary)
execFileSync('cp', [extracted, TARGET_NODE]);
execFileSync('rm', ['-rf', tmpDir]);

log(`✓ Replaced better_sqlite3.node with Electron ABI ${ELECTRON_ABI} build.`);

// ── Python Bundling & yt-dlp Fix ─────────────────────────────────────────────
// The compiled PyInstaller yt-dlp binary is extremely slow due to unpacking overhead.
// We instead download a portable micro-Python runtime and standard yt-dlp zipapp.
if (PLATFORM === 'darwin') {
  // 1. Download portable python runtime
  const PYTHON_URL = ARCH === 'arm64'
    ? 'https://github.com/indygreg/python-build-standalone/releases/download/20240415/cpython-3.10.14+20240415-aarch64-apple-darwin-install_only.tar.gz'
    : 'https://github.com/indygreg/python-build-standalone/releases/download/20240415/cpython-3.10.14+20240415-x86_64-apple-darwin-install_only.tar.gz';
  
  const pythonTargetDir = path.join(ROOT, '.next', 'standalone', 'python');
  if (!existsSync(pythonTargetDir)) {
    log(`Downloading portable python runtime for ${ARCH}...`);
    const pythonRes = await download(PYTHON_URL);
    mkdirSync(pythonTargetDir, { recursive: true });
    
    await pipeline(
      pythonRes.body,
      extract({ cwd: pythonTargetDir, strip: 1 }) // removes the top-level "python" folder inside tarball
    );
    log(`✓ Bundled portable python runtime.`);
  }

  // 2. Download standard yt-dlp zipapp
  const YTDLP_URL = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';
  const ytdlpTarget = path.join(ROOT, '.next', 'standalone', 'node_modules', 'youtube-dl-exec', 'bin', 'yt-dlp');
  
  if (existsSync(ytdlpTarget)) {
    log(`Downloading standard yt-dlp zipapp...`);
    const ytdlpRes = await download(YTDLP_URL);
    const destStream = createWriteStream(ytdlpTarget);
    await pipeline(ytdlpRes.body, destStream);
    
    // Ensure it is executable
    import('fs').then(fs => {
      fs.chmodSync(ytdlpTarget, 0o755);
      log(`✓ Replaced yt-dlp with the standard python zipapp.`);
    });
  }
}
