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

/** Advisory file lock for multi-kiosk shared folders */
function acquireLock(): boolean {
  if (!basePath) return false;
  try {
    const fs = getFs();
    const path = getPath();
    const lockPath = path.join(basePath, 'kiosk_db.lock');

    // If lock exists and is less than 10s old, another kiosk is writing
    if (fs.existsSync(lockPath)) {
      const stat = fs.statSync(lockPath);
      const age = Date.now() - stat.mtimeMs;
      if (age < 10000) return false; // Lock is fresh, wait
      // Stale lock (>10s), safe to override
    }

    // Write our lock with hostname + timestamp
    const hostname = typeof window !== 'undefined' ? window.location.hostname : 'unknown';
    fs.writeFileSync(lockPath, `${hostname}|${Date.now()}`, 'utf8');
    return true;
  } catch {
    return false;
  }
}

function releaseLock() {
  if (!basePath) return;
  try {
    const fs = getFs();
    const path = getPath();
    const lockPath = path.join(basePath, 'kiosk_db.lock');
    if (fs.existsSync(lockPath)) fs.unlinkSync(lockPath);
  } catch { /* ignore */ }
}

/** Reload DB from disk (picks up changes from other kiosks) */
export async function reloadFromDisk() {
  if (!basePath) return;
  try {
    const fs = getFs();
    const path = getPath();
    const dbPath = path.join(basePath, 'kiosk_db.json');
    if (fs.existsSync(dbPath)) {
      const data = fs.readFileSync(dbPath, 'utf8');
      await initDB(data);
    }
  } catch (e) {
    console.error('Reload from disk failed:', e);
  }
}

export async function saveDB() {
  if (!basePath) return;

  // Retry lock up to 3 times
  let locked = false;
  for (let i = 0; i < 3; i++) {
    locked = acquireLock();
    if (locked) break;
    await new Promise(r => setTimeout(r, 500));
  }

  try {
    // Reload latest before saving (merge-safe: our in-memory state wins)
    const fs = getFs();
    const path = getPath();
    const data = exportDB();
    const dbPath = path.join(basePath, 'kiosk_db.json');
    fs.writeFileSync(dbPath, data, 'utf8');
  } catch (e) {
    console.error("Failed to save DB:", e);
  } finally {
    releaseLock();
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

/** Save a timestamped backup of kiosk_db.json, keeping only the last 5 */
export function autoBackup() {
  if (!basePath) return;
  try {
    const fs = getFs();
    const path = getPath();
    const backupDir = path.join(basePath, 'Backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

    // Write new backup
    const data = exportDB();
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    fs.writeFileSync(path.join(backupDir, `backup_${stamp}.json`), data, 'utf8');

    // Keep only last 5
    const files = fs.readdirSync(backupDir)
      .filter((f: string) => f.startsWith('backup_') && f.endsWith('.json'))
      .sort()
      .reverse();
    for (const old of files.slice(5)) {
      fs.unlinkSync(path.join(backupDir, old));
    }
    console.log('[Backup] Saved successfully');
  } catch (e) {
    console.error('[Backup] Failed:', e);
  }
}
