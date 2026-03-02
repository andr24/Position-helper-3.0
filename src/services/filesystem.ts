import { initDB, exportDB, getDB } from './database';

let rootHandle: FileSystemDirectoryHandle | null = null;
let dbFileHandle: FileSystemFileHandle | null = null;

export async function connectFolder(): Promise<boolean> {
  try {
    // @ts-ignore - File System Access API
    rootHandle = await window.showDirectoryPicker();
    if (!rootHandle) return false;

    // Ensure subdirectories exist
    await rootHandle.getDirectoryHandle('Positions', { create: true });
    await rootHandle.getDirectoryHandle('Archive', { create: true });

    // Try to load DB
    try {
      dbFileHandle = await rootHandle.getFileHandle('kiosk.db', { create: true });
      const file = await dbFileHandle.getFile();
      if (file.size > 0) {
        const buffer = await file.arrayBuffer();
        await initDB(new Uint8Array(buffer));
      } else {
        await initDB();
        await saveDB();
      }
    } catch (e) {
      console.error("Error loading DB:", e);
      await initDB(); // Fallback to memory
    }

    return true;
  } catch (e) {
    console.error("Folder connection failed:", e);
    return false;
  }
}

export async function saveDB() {
  if (!dbFileHandle) return;
  const data = exportDB();
  // @ts-ignore
  const writable = await dbFileHandle.createWritable();
  await writable.write(data);
  await writable.close();
}

export async function savePositionFile(posId: string, filename: string, content: any) {
  if (!rootHandle) return;
  
  try {
    const posDir = await rootHandle.getDirectoryHandle('Positions');
    const targetDir = await posDir.getDirectoryHandle(posId, { create: true });
    const fileHandle = await targetDir.getFileHandle(filename, { create: true });
    // @ts-ignore
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(content, null, 2));
    await writable.close();
  } catch (e) {
    console.error("Failed to save position file:", e);
  }
}

export async function archivePositionFile(posId: string, filename: string) {
  if (!rootHandle) return;

  try {
    const posDir = await rootHandle.getDirectoryHandle('Positions');
    const targetDir = await posDir.getDirectoryHandle(posId);
    const fileHandle = await targetDir.getFileHandle(filename);
    const file = await fileHandle.getFile();
    const content = await file.text();

    const archiveDir = await rootHandle.getDirectoryHandle('Archive');
    const archiveFile = await archiveDir.getFileHandle(filename, { create: true });
    
    // @ts-ignore
    const writable = await archiveFile.createWritable();
    await writable.write(content);
    await writable.close();

    // Delete original
    await targetDir.removeEntry(filename);
  } catch (e) {
    console.error("Failed to archive file:", e);
  }
}

export function isConnected() {
  return !!rootHandle;
}
