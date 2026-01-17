import electron from 'electron';
const { app, BrowserWindow } = electron;
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const createWindow = () => {
  // Create the browser window.
  const win = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // For simpler communication in MVP
    },
  });

  // Determine what to load based on whether the app is packaged
  if (app.isPackaged) {
    // In production, load the local index.html file
    // Assumes 'dist' and 'electron' are siblings in the package
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  } else {
    // In development, load the Vite local server
    win.loadURL('http://localhost:5173');
    // Open DevTools in dev mode
    win.webContents.openDevTools();
  }
};

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});