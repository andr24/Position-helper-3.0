import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = !app.isPackaged;

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "Kiosk Inventory System",
    webPreferences: {
      nodeIntegration: true, // Enable direct access to FS
      contextIsolation: false, // Required for easy window.fs access in this context
      sandbox: false,
      webSecurity: false
    },
  });

  // We hide the menu bar for a kiosk feel
  mainWindow.setMenuBarVisibility(false);

  // Handle Directory Picker Natively
  ipcMain.handle('select-directory', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'createDirectory']
    });
    if (canceled) return null;
    return filePaths[0]; // Returns the full string path
  });

  // Handle Excel Save/Open native dialogs
  ipcMain.handle('save-excel-dialog', async () => {
    return await dialog.showSaveDialog(mainWindow, {
      title: 'Export Database to Excel',
      defaultPath: 'kiosk_inventory_export.xlsx',
      filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
    });
  });

  ipcMain.handle('open-excel-dialog', async () => {
    return await dialog.showOpenDialog(mainWindow, {
      title: 'Import Database from Excel',
      properties: ['openFile'],
      filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
    });
  });

  if (isDev) {
    // In development mode, load the Vite dev server
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load the built static files
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Grant FileSystem Access API Permissions gracefully
  mainWindow.webContents.session.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {
    if (permission === 'fileSystem') {
      return true; // Allow all FileSystem Access API requests
    }
    return false;
  });

  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback, details) => {
    if (permission === 'fileSystem') {
      callback(true); // Approve requests implicitly without prompting
    } else {
      callback(false);
    }
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
