const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let nextProcess;
let isNextReady = false;

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

  const url = app.isPackaged 
    ? 'http://localhost:3000' 
    : 'http://localhost:3000';
    
  mainWindow.loadURL(url);

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  if (process.platform === 'darwin' && !app.isPackaged) {
    app.dock.setIcon(path.join(__dirname, 'build', 'icon.png'));
  }

  if (app.isPackaged) {
    // Start standalone Next.js server in production
    const serverPath = path.join(process.resourcesPath, 'app.asar.unpacked', '.next', 'standalone', 'server.js');
    
    nextProcess = spawn(process.execPath, [serverPath], {
      env: {
        ...process.env,
        PORT: '3000',
        NODE_ENV: 'production',
        HOSTNAME: 'localhost',
        ELECTRON_RUN_AS_NODE: '1',
        ELECTRON_NO_ATTACH_CONSOLE: '1'
      },
      detached: false,
      stdio: ['ignore', 'pipe', 'pipe']
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
