// HomeoVet Electron — app desktop
// Carrega o build do frontend (dist/) ou o dev server (vite).
const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

const DEV_URL = process.env.HOMEOVET_DEV_URL || 'http://localhost:5173';
const DIST_INDEX = path.join(__dirname, '..', 'dist', 'index.html');

function criarJanela() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    title: '🐾 HomeoVet — Homeopatia Veterinária',
    icon: path.join(__dirname, '..', 'frontend', 'public', 'favicon.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Links externos abrem no navegador padrão
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  const dev = process.env.NODE_ENV === 'development';
  if (dev) {
    win.loadURL(DEV_URL);
    win.webContents.openDevTools();
  } else {
    win.loadFile(DIST_INDEX);
  }
}

app.whenReady().then(() => {
  criarJanela();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) criarJanela();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
