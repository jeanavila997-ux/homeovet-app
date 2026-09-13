// HomeoVet Electron — app desktop
// Carrega o build do frontend (dist/) ou o dev server (vite).
const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

const fs = require('fs');

const DEV_URL = process.env.HOMEOVET_DEV_URL || 'http://localhost:5173';

function obterCaminhoIndex() {
  const caminhos = [
    path.join(__dirname, 'dist', 'index.html'),
    path.join(__dirname, '..', 'dist', 'index.html'),
    path.join(app.getAppPath(), 'dist', 'index.html'),
    path.join(app.getAppPath(), 'index.html')
  ];

  for (const c of caminhos) {
    if (fs.existsSync(c)) return c;
  }
  return path.join(__dirname, '..', 'dist', 'index.html');
}

function criarJanela() {
  const winOptions = {
    width: 1280,
    height: 860,
    title: '🐾 HomeoVet — Homeopatia Veterinária',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false
    }
  };

  const iconPath = path.join(__dirname, '..', 'frontend', 'public', 'favicon.png');
  if (fs.existsSync(iconPath)) {
    winOptions.icon = iconPath;
  }

  const win = new BrowserWindow(winOptions);

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
    win.loadFile(obterCaminhoIndex());
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
