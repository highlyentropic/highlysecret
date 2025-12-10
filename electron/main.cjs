const { app, BrowserWindow } = require('electron');
const path = require('path');

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

  // Load the Vite local server
  win.loadURL('http://localhost:5173');

  // Optional: Open the DevTools (F12) automatically so we can debug
  win.webContents.openDevTools();
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