const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let nextProcess;

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
    const serverPath = path.join(__dirname, '.next', 'standalone', 'server.js');
    nextProcess = spawn(process.execPath, [serverPath], {
      env: {
        ...process.env,
        PORT: 3000,
        NODE_ENV: 'production',
        HOSTNAME: 'localhost'
      }
    });

    nextProcess.stdout.on('data', (data) => {
      console.log(`Next.js: ${data}`);
      // Load window once Next.js is ready
      if (data.toString().includes('Listening on port 3000') && !mainWindow) {
        createWindow();
      }
    });

    nextProcess.stderr.on('data', (data) => {
      console.error(`Next.js Error: ${data}`);
    });
  } else {
    createWindow();
  }

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
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
