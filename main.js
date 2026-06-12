const { app, BrowserWindow, utilityProcess } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');

let mainWindow;
let nextProcess;
let isNextReady = false;

// One-time migration: copy data from old 'Aura Music' folder to 'Open Music'
function migrateAppData() {
  if (process.platform !== 'darwin') return;
  const oldPath = path.join(os.homedir(), 'Library', 'Application Support', 'Aura Music');
  const newPath = path.join(os.homedir(), 'Library', 'Application Support', 'Open Music');
  if (fs.existsSync(oldPath) && !fs.existsSync(newPath)) {
    try {
      fs.cpSync(oldPath, newPath, { recursive: true });
      console.log('Migrated app data from Aura Music → Open Music');
    } catch (e) {
      console.error('Migration failed:', e);
    }
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#121212',
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadURL('http://localhost:3000');

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  migrateAppData();

  if (process.platform === 'darwin' && !app.isPackaged) {
    app.dock.setIcon(path.join(__dirname, 'build', 'icon.png'));
  }

  if (app.isPackaged) {
    // Use utilityProcess.fork() — Electron's built-in headless Node runner.
    // Unlike spawn(process.execPath), it never creates a Dock entry because
    // the OS tracks it as a private utility subprocess, not a new app launch.
    let serverPath = path.join(process.resourcesPath, 'app.asar.unpacked', '.next', 'standalone', 'server.js');
    if (!fs.existsSync(serverPath)) {
      serverPath = path.join(process.resourcesPath, 'app', '.next', 'standalone', 'server.js');
    }

    nextProcess = utilityProcess.fork(serverPath, [], {
      env: {
        ...process.env,
        PORT: '3000',
        NODE_ENV: 'production',
        HOSTNAME: 'localhost',
      },
      stdio: 'pipe',
    });

    nextProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('Next.js:', output);
      if ((output.includes('Ready in') || output.includes('localhost:3000') || output.includes('ready')) && !mainWindow) {
        isNextReady = true;
        createWindow();
      }
    });

    nextProcess.stderr.on('data', (data) => {
      console.error('Next.js error:', data.toString());
    });
  } else {
    createWindow();
  }

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      if (app.isPackaged && !isNextReady) {
        // Wait for Next.js to be ready
      } else {
        createWindow();
      }
    }
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('quit', () => {
  if (nextProcess) {
    nextProcess.kill();
  }
});
