import { initDB, exportDB } from './database';

export let basePath: string | null = null;
let dbInitialized = false;

// Helpers to use node fs in browser context
function getFs() {
  // @ts-ignore
  return window.require('fs');
}

function getPath() {
  // @ts-ignore
  return window.require('path');
}

export async function autoConnect(): Promise<boolean> {
  try {
    const savedPath = localStorage.getItem('kiosk_base_path');
    if (!savedPath) return false;

    basePath = savedPath;
    const fs = getFs();
    const path = getPath();

    const dbPath = path.join(basePath, 'kiosk_db.json');

    // Ensure subdirectories exist
    const posDir = path.join(basePath, 'Positions');
    const archDir = path.join(basePath, 'Archive');
    if (!fs.existsSync(posDir)) fs.mkdirSync(posDir, { recursive: true });
    if (!fs.existsSync(archDir)) fs.mkdirSync(archDir, { recursive: true });

    if (fs.existsSync(dbPath)) {
      const data = fs.readFileSync(dbPath, 'utf8');
      await initDB(data);
    } else {
      await initDB();
      await saveDB();
    }

    dbInitialized = true;
    return true;
  } catch (e) {
    console.error("Auto-connect failed:", e);
    return false;
  }
}

export async function connectFolder(): Promise<boolean> {
  try {
    // @ts-ignore
    if (typeof window !== 'undefined' && window.require) {
      // @ts-ignore
      const { ipcRenderer } = window.require('electron');
      const selectedPath = await ipcRenderer.invoke('select-directory');
      if (!selectedPath) return false;

      localStorage.setItem('kiosk_base_path', selectedPath);
      return await autoConnect();
    } else {
      alert("Error: Native folder selection is not available. Are you running in Electron?");
      return false;
    }
  } catch (e) {
    console.error("Folder connection failed:", e);
    return false;
  }
}

export async function saveDB() {
  if (!basePath) return;
  try {
    const fs = getFs();
    const path = getPath();
    const data = exportDB();
    const dbPath = path.join(basePath, 'kiosk_db.json');
    fs.writeFileSync(dbPath, data, 'utf8');
  } catch (e) {
    console.error("Failed to save DB:", e);
  }
}

export async function savePositionFile(posId: string, filename: string, content: any) {
  if (!basePath) return;
  try {
    const fs = getFs();
    const path = getPath();
    const posDir = path.join(basePath, 'Positions', posId);
    if (!fs.existsSync(posDir)) fs.mkdirSync(posDir, { recursive: true });

    const filePath = path.join(posDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf8');
  } catch (e) {
    console.error("Failed to save position file:", e);
  }
}

export async function archivePositionFile(posId: string, filePrefix: string) {
  if (!basePath) return;
  try {
    const fs = getFs();
    const path = getPath();
    const posDir = path.join(basePath, 'Positions', posId);
    const archiveDir = path.join(basePath, 'Archive');

    if (fs.existsSync(posDir)) {
      const files = fs.readdirSync(posDir);
      for (const file of files) {
        if (file.startsWith(filePrefix)) {
          fs.renameSync(
            path.join(posDir, file),
            path.join(archiveDir, file)
          );
        }
      }
    }
  } catch (e) {
    console.error("Failed to archive file:", e);
  }
}

export function isConnected() {
  return dbInitialized;
}
