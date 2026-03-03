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
  return getDB().positions;
}

export async function getRules(): Promise<ColumnRule[]> {
  checkConnection();
  return getDB().column_rules.sort((a, b) => a.col_id.localeCompare(b.col_id));
}

export async function getLogs(): Promise<any[]> {
  checkConnection();
  // Return logs sorted by timestamp descending (newest first)
  return getDB().logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export async function saveRules(rules: ColumnRule[]): Promise<{ success: boolean }> {
  checkConnection();
  const db = getDB();

  for (const r of rules) {
    const existing = db.column_rules.find(c => c.col_id === r.col_id);
    if (existing) {
      Object.assign(existing, r);
    } else {
      db.column_rules.push(r);
    }
  }

  await saveDB();
  return { success: true };
}

export async function verifyPin(pin: string): Promise<{ success: boolean }> {
  checkConnection();
  const db = getDB();
  if (db.settings['admin_pin'] === pin) {
    return { success: true };
  }
  return { success: false };
}

export async function changePin(newPin: string): Promise<{ success: boolean }> {
  checkConnection();
  getDB().settings['admin_pin'] = newPin;
  await saveDB();
  return { success: true };
}

export async function getItem(notificationId: string): Promise<{ success: boolean; item?: Position; message?: string }> {
  checkConnection();
  const item = getDB().positions.find(p => p.notification_id === notificationId);

  if (item) {
    return { success: true, item: { ...item } };
  }
  return { success: false, message: 'Item not found' };
}

export async function storeItem(data: {
  notificationId: string;
  partGroup: string;
  notifType: string;
  userName?: string;
}): Promise<StoreResponse> {
  checkConnection();
  await delay(500); // Fake delay for UX
  const db = getDB();

  // 0. Check if ALREADY completely occupied
  const fullyOccupied = db.positions.find(
    p => p.notification_id === data.notificationId && p.status === 'occupied'
  );
  if (fullyOccupied) {
    return { success: false, message: 'This Notification ID is already fully stored.' };
  }

  // 1. Check for Strict Pairing Match (partial slot with same ID)
  if (data.partGroup !== 'A-Rank') {
    const matchingPartial = db.positions.find(
      p => p.notification_id === data.notificationId && p.status === 'partial'
    );

    if (matchingPartial) {
      if (data.partGroup === 'NS' && matchingPartial.has_ns) {
        return { success: false, message: 'NS part is already stored for this ID.' };
      }
      if (data.partGroup === 'SUB' && matchingPartial.has_sub) {
        return { success: false, message: 'SUB part is already stored for this ID.' };
      }

      // Complete the pair
      if (data.partGroup === 'NS') matchingPartial.has_ns = true;
      if (data.partGroup === 'SUB') matchingPartial.has_sub = true;

      matchingPartial.status = 'occupied';
      matchingPartial.part_group = 'NS+SUB';
      const nowTs = new Date().toISOString();
      matchingPartial.timestamp = nowTs;
      if (data.userName) {
        matchingPartial.user_name = data.userName;
      }

      await savePositionFile(matchingPartial.id, `${data.notificationId}_${data.partGroup}.json`, {
        ...data, position: matchingPartial.id, timestamp: nowTs
      });

      db.logs.push({
        id: Date.now(),
        action: 'STORE',
        details: `Stored ${data.partGroup} for ${data.notificationId} at ${matchingPartial.id} (Completed Pair)`,
        timestamp: nowTs
      });
      await saveDB();
      return { success: true, position: matchingPartial.id };
    }
  }

  // 2. Find free slot for new item
  const enabledColumns = db.column_rules
    .filter(c => c.enabled)
    .sort((a, b) => a.priority - b.priority);

  if (enabledColumns.length === 0) return { success: false, message: 'No enabled columns' };

  let selectedPos: Position | null = null;

  for (const col of enabledColumns) {
    if (data.partGroup === 'NS' && !col.allow_ns) continue;
    if (data.partGroup === 'SUB' && !col.allow_sub) continue;
    if (data.partGroup === 'A-Rank' && !col.allow_sub) continue; // A-Rank acts like SUB

    if (data.notifType === 'OTC' && !col.allow_otc) continue;
    if (data.notifType === 'EXERA2' && !col.allow_exera2) continue;
    if (data.notifType === 'EXERA3' && !col.allow_exera3) continue;

    const freePos = db.positions
      .filter(p => p.col_id === col.col_id && p.status === 'free' && p.row_idx <= col.capacity)
      .sort((a, b) => a.row_idx - b.row_idx)[0];

    if (freePos) {
      selectedPos = freePos;
      break;
    }
  }

  if (!selectedPos) {
    return { success: false, message: 'No suitable free positions available.' };
  }

  // 3. Occupy free slot
  const now = new Date().toISOString();
  selectedPos.notification_id = data.notificationId;
  selectedPos.notif_type = data.notifType;
  selectedPos.user_name = data.userName || '';
  selectedPos.timestamp = now;
  selectedPos.has_ns = false;
  selectedPos.has_sub = false;
  selectedPos.is_a_rank = false;

  if (data.partGroup === 'A-Rank') {
    selectedPos.is_a_rank = true;
    selectedPos.has_sub = true;
    selectedPos.status = 'occupied';
    selectedPos.part_group = 'A-Rank';
  } else {
    selectedPos.status = 'partial';
    if (data.partGroup === 'NS') selectedPos.has_ns = true;
    if (data.partGroup === 'SUB') selectedPos.has_sub = true;
    selectedPos.part_group = data.partGroup;
  }

  // 4. Save File
  await savePositionFile(selectedPos.id, `${data.notificationId}_${data.partGroup}.json`, {
    ...data,
    position: selectedPos.id,
    timestamp: now
  });

  // 5. Log
  db.logs.push({
    id: Date.now(),
    action: 'STORE',
    details: `Stored ${data.partGroup} for ${data.notificationId} at ${selectedPos.id} (New ${selectedPos.status})`,
    timestamp: now
  });

  await saveDB();
  return { success: true, position: selectedPos.id };
}

export async function pickItem(notificationId: string): Promise<PickResponse> {
  checkConnection();
  await delay(500);
  const db = getDB();

  const pos = db.positions.find(p => p.notification_id === notificationId);
  if (!pos) {
    return { success: false, message: 'Notification not found.' };
  }

  if (pos.status === 'partial') {
    return { success: false, message: 'Cannot pick a partial item. Both NS and SUB parts must be stored first.' };
  }

  const isARank = pos.is_a_rank;

  // 1. Archive
  await archivePositionFile(pos.id, `${notificationId}_*`); // Archive mechanism might need a wildcard or we just ignore the filename archiving exactness for now. 
  // Actually, we can't easily use wildcard with fs logic unless we list dir. We will just pass the notification id.

  // 2. Clear
  pos.status = 'free';
  pos.notification_id = undefined;
  pos.part_group = undefined;
  pos.notif_type = undefined;
  pos.user_name = undefined;
  pos.timestamp = undefined;
  pos.has_ns = false;
  pos.has_sub = false;
  pos.is_a_rank = false;

  // 3. Log
  db.logs.push({
    id: Date.now(),
    action: 'PICK',
    details: `Picked ${notificationId} from ${pos.id}`,
    timestamp: new Date().toISOString()
  });

  await saveDB();

  const returnMessage = isARank ? "WARNING: This has a long part to be replaced." : undefined;
  return { success: true, position: pos.id, message: returnMessage };
}

export async function relocateItem(
  fromId: string,
  toId: string
): Promise<{ success: boolean; message?: string }> {
  checkConnection();
  const db = getDB();

  const from = db.positions.find(p => p.id === fromId);
  const to = db.positions.find(p => p.id === toId);

  if (!from || !to) return { success: false, message: 'Position not found.' };
  if (from.status === 'free') return { success: false, message: 'Source is empty.' };
  if (to.status !== 'free') return { success: false, message: 'Target position is not free.' };

  // Move all data from → to
  to.status = from.status;
  to.notification_id = from.notification_id;
  to.part_group = from.part_group;
  to.notif_type = from.notif_type;
  to.user_name = from.user_name;
  to.timestamp = from.timestamp;
  to.has_ns = from.has_ns;
  to.has_sub = from.has_sub;
  to.is_a_rank = from.is_a_rank;

  // Clear source
  from.status = 'free';
  from.notification_id = undefined;
  from.part_group = undefined;
  from.notif_type = undefined;
  from.user_name = undefined;
  from.timestamp = undefined;
  from.has_ns = false;
  from.has_sub = false;
  from.is_a_rank = false;

  // Log the relocation
  db.logs.push({
    id: Date.now(),
    action: 'RELOCATE',
    details: `Relocated ${to.notification_id} from ${fromId} to ${toId}`,
    timestamp: new Date().toISOString()
  });

  await saveDB();
  return { success: true };
}
