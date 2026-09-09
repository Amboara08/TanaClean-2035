const { app, BrowserWindow, nativeImage } = require('electron');
const path = require('path');
const http = require('http');

const PORT     = 3132;   
const WEB_PORT = 3131;   
let mainWindow;

// ── Nom de l'application ─────────────────────────────────────────────────────
app.setName('TanaClean 2035');

// ── Icône ────────────────────────────────────────────────────────────────────
const ICON_PATH = path.join(__dirname, '..', 'build', 'icon.png');
const appIcon   = nativeImage.createFromPath(ICON_PATH);

function startServer() {
  process.env.ELECTRON_APP = '1';  // mode desktop — admin uniquement
  process.env.PORT         = String(PORT);
  require('../src/server');
}

function waitForServer(resolve, attempts = 0) {
  if (attempts > 40) {
    console.error('[electron] Le serveur Express ne répond pas — abandon.');
    app.quit();
    return;
  }
  http.get(`http://localhost:${PORT}/`, () => resolve())
      .on('error', () => setTimeout(() => waitForServer(resolve, attempts + 1), 300));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width:     1280,
    height:    820,
    minWidth:  960,
    minHeight: 640,
    icon:      appIcon,
    title:     'TanaClean 2035',
    // Barre de titre native avec le nom et l'icône
    titleBarStyle:        'hiddenInset',
    trafficLightPosition: { x: 14, y: 14 },
    webPreferences: {
      nodeIntegration:  false,
      contextIsolation: true,
    },
  });

  // Empêche la barre de titre de changer quand la page change
  mainWindow.on('page-title-updated', e => e.preventDefault());

  mainWindow.loadURL(`http://localhost:${PORT}`);

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── Démarrage ─────────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  // Icône dans le Dock (macOS)
  if (process.platform === 'darwin' && !appIcon.isEmpty()) {
    app.dock.setIcon(appIcon);
  }

  startServer();
  new Promise(resolve => waitForServer(resolve)).then(createWindow);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (!mainWindow) createWindow();
});
