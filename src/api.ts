import { Position, ColumnRule, StoreResponse, PickResponse } from './types';
import { getDB } from './services/database';
import { saveDB, savePositionFile, archivePositionFile, isConnected } from './services/filesystem';

// Helper to simulate network delay for better UX
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function checkConnection() {
  if (!isConnected()) throw new Error("Storage folder not connected");
}

export async function getPositions(): Promise<Position[]> {
  checkConnection();
  const db = getDB();
  const res = db.exec("SELECT * FROM positions");
  if (res.length === 0) return [];
  
  const columns = res[0].columns;
  return res[0].values.map(row => {
    const obj: any = {};
    columns.forEach((col, i) => obj[col] = row[i]);
    return obj;
  });
}

export async function getRules(): Promise<ColumnRule[]> {
  checkConnection();
  const db = getDB();
  const res = db.exec("SELECT * FROM column_rules ORDER BY col_id");
  if (res.length === 0) return [];
  
  const columns = res[0].columns;
  return res[0].values.map(row => {
    const obj: any = {};
    columns.forEach((col, i) => obj[col] = row[i]);
    return obj;
  });
}

export async function saveRules(rules: ColumnRule[]): Promise<{ success: boolean }> {
  checkConnection();
  const db = getDB();
  
  db.run("BEGIN TRANSACTION");
  const stmt = db.prepare(`
    UPDATE column_rules 
    SET enabled=?, priority=?, capacity=?, allow_ns=?, allow_sub=?, allow_otc=?, allow_exera2=?, allow_exera3=?
    WHERE col_id=?
  `);
  
  for (const r of rules) {
    stmt.run([
      r.enabled ? 1 : 0, r.priority, r.capacity, 
      r.allow_ns ? 1 : 0, r.allow_sub ? 1 : 0, 
      r.allow_otc ? 1 : 0, r.allow_exera2 ? 1 : 0, r.allow_exera3 ? 1 : 0,
      r.col_id
    ]);
  }
  stmt.free();
  db.run("COMMIT");
  
  await saveDB();
  return { success: true };
}

export async function verifyPin(pin: string): Promise<{ success: boolean }> {
  checkConnection();
  const db = getDB();
  const res = db.exec("SELECT value FROM settings WHERE key = 'admin_pin'");
  if (res.length > 0 && res[0].values[0][0] === pin) {
    return { success: true };
  }
  return { success: false };
}

export async function changePin(newPin: string): Promise<{ success: boolean }> {
  checkConnection();
  const db = getDB();
  db.run("UPDATE settings SET value = ? WHERE key = 'admin_pin'", [newPin]);
  await saveDB();
  return { success: true };
}

export async function getItem(notificationId: string): Promise<{ success: boolean; item?: Position; message?: string }> {
  checkConnection();
  const db = getDB();
  const stmt = db.prepare("SELECT * FROM positions WHERE notification_id = ?");
  const row = stmt.get([notificationId]);
  stmt.free();
  
  if (row) {
    // Convert row array to object (sql.js returns object if using getAsObject, but get returns array? No, prepare->get returns array usually, let's check docs. 
    // Actually sql.js statement.get() returns an array of values. We need to map it.)
    // Wait, better to use getAsObject for single row if possible, but prepare is better.
    // Let's manually map it for safety.
    // Actually, let's use exec for safety as I did above, or just know the column order.
    // To be safe, let's use exec with limit 1.
    const res = db.exec("SELECT * FROM positions WHERE notification_id = ?", [notificationId]);
    if (res.length > 0) {
      const columns = res[0].columns;
      const values = res[0].values[0];
      const obj: any = {};
      columns.forEach((col, i) => obj[col] = values[i]);
      return { success: true, item: obj };
    }
  }
  
  return { success: false, message: 'Item not found' };
}

export async function storeItem(data: {
  notificationId: string;
  partGroup: string;
  notifType: string;
  userName: string;
}): Promise<StoreResponse> {
  checkConnection();
  await delay(500); // Fake delay for UX
  const db = getDB();
  
  // 1. Check existing
  const existing = db.exec("SELECT id FROM positions WHERE notification_id = ?", [data.notificationId]);
  if (existing.length > 0) {
    return { success: true, position: existing[0].values[0][0] as string, message: 'Already stored' };
  }

  // 2. Find free slot
  // Get columns
  const colRes = db.exec("SELECT * FROM column_rules WHERE enabled = 1 ORDER BY priority ASC");
  if (colRes.length === 0) return { success: false, message: 'No enabled columns' };
  
  const colCols = colRes[0].columns;
  const columns = colRes[0].values.map(row => {
    const obj: any = {};
    colCols.forEach((col, i) => obj[col] = row[i]);
    return obj;
  });

  let selectedPos: any = null;

  for (const col of columns) {
    if (data.partGroup === 'NS' && !col.allow_ns) continue;
    if (data.partGroup === 'SUB' && !col.allow_sub) continue;
    if (data.notifType === 'OTC' && !col.allow_otc) continue;
    if (data.notifType === 'EXERA2' && !col.allow_exera2) continue;
    if (data.notifType === 'EXERA3' && !col.allow_exera3) continue;

    const freeRes = db.exec(
      "SELECT * FROM positions WHERE col_id = ? AND status = 'free' AND row_idx <= ? ORDER BY row_idx ASC LIMIT 1",
      [col.col_id, col.capacity]
    );

    if (freeRes.length > 0) {
      const fCols = freeRes[0].columns;
      const fVals = freeRes[0].values[0];
      selectedPos = {};
      fCols.forEach((c, i) => selectedPos[c] = fVals[i]);
      break;
    }
  }

  if (!selectedPos) {
    return { success: false, message: 'No suitable free positions available.' };
  }

  // 3. Occupy
  const now = new Date().toISOString();
  db.run(
    "UPDATE positions SET status='occupied', notification_id=?, part_group=?, notif_type=?, user_name=?, timestamp=? WHERE id=?",
    [data.notificationId, data.partGroup, data.notifType, data.userName, now, selectedPos.id]
  );

  // 4. Save File
  await savePositionFile(selectedPos.id, `${data.notificationId}.json`, {
    ...data,
    position: selectedPos.id,
    timestamp: now
  });

  // 5. Log
  db.run("INSERT INTO logs (action, details) VALUES (?, ?)", ['STORE', `Stored ${data.notificationId} at ${selectedPos.id}`]);

  await saveDB();
  return { success: true, position: selectedPos.id };
}

export async function pickItem(notificationId: string): Promise<PickResponse> {
  checkConnection();
  await delay(500);
  const db = getDB();

  const itemRes = await getItem(notificationId);
  if (!itemRes.success || !itemRes.item) {
    return { success: false, message: 'Notification not found.' };
  }
  const pos = itemRes.item;

  // 1. Clear
  db.run(
    "UPDATE positions SET status='free', notification_id=NULL, part_group=NULL, notif_type=NULL, user_name=NULL, timestamp=NULL WHERE id=?",
    [pos.id]
  );

  // 2. Archive
  await archivePositionFile(pos.id, `${notificationId}.json`);

  // 3. Log
  db.run("INSERT INTO logs (action, details) VALUES (?, ?)", ['PICK', `Picked ${notificationId} from ${pos.id}`]);

  await saveDB();
  return { success: true, position: pos.id };
}
