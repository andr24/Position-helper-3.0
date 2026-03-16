import express from 'express';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Ensure data directories exist
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

// Initialize Database
const db = new Database(path.join(DATA_DIR, 'kiosk.db'));

// Schema Setup
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS column_rules (
    col_id TEXT PRIMARY KEY,
    enabled INTEGER DEFAULT 1,
    priority INTEGER DEFAULT 0,
    capacity INTEGER DEFAULT 8,
    allow_ns INTEGER DEFAULT 1,
    allow_sub INTEGER DEFAULT 1,
    allow_otc INTEGER DEFAULT 1,
    allow_exera2 INTEGER DEFAULT 1,
    allow_exera3 INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS positions (
    id TEXT PRIMARY KEY,
    col_id TEXT,
    row_idx INTEGER,
    status TEXT DEFAULT 'free',
    has_ns INTEGER DEFAULT 0,
    has_sub INTEGER DEFAULT 0,
    is_a_rank INTEGER DEFAULT 0,
    notification_id TEXT,
    part_group TEXT,
    notif_type TEXT,
    user_name TEXT,
    timestamp DATETIME
  );

  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT,
    details TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// --- MIGRATIONS FOR OLDER DATABASES ---
try {
  db.prepare('SELECT has_ns FROM positions LIMIT 1').get();
} catch (e) {
  console.log("Migrating database: adding missing columns to positions table...");
  try { db.exec("ALTER TABLE positions ADD COLUMN has_ns INTEGER DEFAULT 0;"); } catch (err) {}
  try { db.exec("ALTER TABLE positions ADD COLUMN has_sub INTEGER DEFAULT 0;"); } catch (err) {}
  try { db.exec("ALTER TABLE positions ADD COLUMN is_a_rank INTEGER DEFAULT 0;"); } catch (err) {}
  try { db.exec("ALTER TABLE positions ADD COLUMN notif_type TEXT;"); } catch (err) {}
  try { db.exec("ALTER TABLE positions ADD COLUMN user_name TEXT;"); } catch (err) {}
  try { db.exec("ALTER TABLE positions ADD COLUMN timestamp DATETIME;"); } catch (err) {}
}

try {
  db.prepare('SELECT allow_ns FROM column_rules LIMIT 1').get();
} catch (e) {
  console.log("Migrating database: adding missing columns to column_rules table...");
  try { db.exec("ALTER TABLE column_rules ADD COLUMN capacity INTEGER DEFAULT 8;"); } catch (err) {}
  try { db.exec("ALTER TABLE column_rules ADD COLUMN allow_ns INTEGER DEFAULT 1;"); } catch (err) {}
  try { db.exec("ALTER TABLE column_rules ADD COLUMN allow_sub INTEGER DEFAULT 1;"); } catch (err) {}
  try { db.exec("ALTER TABLE column_rules ADD COLUMN allow_otc INTEGER DEFAULT 1;"); } catch (err) {}
  try { db.exec("ALTER TABLE column_rules ADD COLUMN allow_exera2 INTEGER DEFAULT 1;"); } catch (err) {}
  try { db.exec("ALTER TABLE column_rules ADD COLUMN allow_exera3 INTEGER DEFAULT 1;"); } catch (err) {}
}
// --------------------------------------

// Seed Settings if empty
const checkSettings = db.prepare('SELECT count(*) as count FROM settings').get() as { count: number };
if (checkSettings.count === 0) {
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('admin_pin', '0000');
}

// Seed Columns A-Z if empty
const checkCols = db.prepare('SELECT count(*) as count FROM column_rules').get() as { count: number };
if (checkCols.count === 0) {
  const insertCol = db.prepare(`INSERT INTO column_rules (col_id, priority, capacity) VALUES (?, ?, ?)`);
  const insertPos = db.prepare(`INSERT INTO positions (id, col_id, row_idx) VALUES (?, ?, ?)`);

  const transaction = db.transaction(() => {
    for (let i = 0; i < 26; i++) {
      const colChar = String.fromCharCode(65 + i);
      insertCol.run(colChar, i + 1, 8);
      for (let r = 1; r <= 8; r++) {
        insertPos.run(`${colChar}-${r}`, colChar, r);
      }
    }
  });
  transaction();
}

// --- BACKUP SYSTEM ---
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR);

function runBackup() {
  try {
    const dbPath = path.join(DATA_DIR, 'kiosk.db');
    if (!fs.existsSync(dbPath)) return;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(BACKUP_DIR, `kiosk_backup_${timestamp}.db`);

    // Copy the database file
    fs.copyFileSync(dbPath, backupPath);
    console.log(`[Backup] Created: ${backupPath}`);

    // Manage old backups (keep max 5)
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('kiosk_backup_') && f.endsWith('.db'))
      .map(f => ({ name: f, time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime() }))
      .sort((a, b) => b.time - a.time); // Sort newest first

    if (files.length > 5) {
      const toDelete = files.slice(5);
      for (const file of toDelete) {
        fs.unlinkSync(path.join(BACKUP_DIR, file.name));
        console.log(`[Backup] Deleted old backup: ${file.name}`);
      }
    }
  } catch (err) {
    console.error('[Backup] Failed:', err);
  }
}

// Run backup every 5 minutes
setInterval(runBackup, 5 * 60 * 1000);
// Run initial backup on startup
runBackup();
// ---------------------

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '50mb' }));

  // --- API Routes ---

  app.get('/api/positions', (req, res) => {
    const positions = db.prepare('SELECT * FROM positions').all();
    // Convert SQLite integers back to booleans for the frontend
    const formatted = positions.map((p: any) => ({
      ...p,
      has_ns: p.has_ns === 1,
      has_sub: p.has_sub === 1,
      is_a_rank: p.is_a_rank === 1
    }));
    res.json(formatted);
  });

  app.get('/api/admin/rules', (req, res) => {
    const rules = db.prepare('SELECT * FROM column_rules ORDER BY col_id').all();
    res.json(rules);
  });

  app.get('/api/logs', (req, res) => {
    const logs = db.prepare('SELECT * FROM logs ORDER BY timestamp DESC').all();
    res.json(logs);
  });

  app.post('/api/admin/rules', (req, res) => {
    const { rules } = req.body;
    const update = db.prepare(`
      UPDATE column_rules 
      SET enabled=?, priority=?, capacity=?, allow_ns=?, allow_sub=?, allow_otc=?, allow_exera2=?, allow_exera3=?
      WHERE col_id=?
    `);
    const transaction = db.transaction((rulesList) => {
      for (const r of rulesList) {
        update.run(
          r.enabled ? 1 : 0, r.priority, r.capacity, 
          r.allow_ns ? 1 : 0, r.allow_sub ? 1 : 0, 
          r.allow_otc ? 1 : 0, r.allow_exera2 ? 1 : 0, r.allow_exera3 ? 1 : 0,
          r.col_id
        );
      }
    });
    transaction(rules);
    res.json({ success: true });
  });

  app.post('/api/admin/login', (req, res) => {
    const { pin } = req.body;
    const stored = db.prepare("SELECT value FROM settings WHERE key = 'admin_pin'").get() as { value: string };
    if (stored && stored.value === pin) {
      res.json({ success: true });
    } else {
      res.status(401).json({ success: false, message: 'Invalid PIN' });
    }
  });

  app.post('/api/admin/pin', (req, res) => {
    const { newPin } = req.body;
    db.prepare("UPDATE settings SET value = ? WHERE key = 'admin_pin'").run(newPin);
    res.json({ success: true });
  });

  app.post('/api/admin/swap', (req, res) => {
    const { pin, fromId, toId } = req.body;
    const stored = db.prepare("SELECT value FROM settings WHERE key = 'admin_pin'").get() as { value: string };
    if (!stored || stored.value !== pin) {
      return res.status(401).json({ success: false, message: 'Invalid PIN' });
    }
    
    try {
      const transaction = db.transaction(() => {
        const fromPos = db.prepare('SELECT * FROM positions WHERE id = ?').get(fromId) as any;
        const toPos = db.prepare('SELECT * FROM positions WHERE id = ?').get(toId) as any;
        if (!fromPos || !toPos) throw new Error('Position not found');

        const update = db.prepare(`
          UPDATE positions 
          SET status=?, notification_id=?, part_group=?, notif_type=?, user_name=?, has_ns=?, has_sub=?, is_a_rank=?, timestamp=?
          WHERE id=?
        `);

        update.run(toPos.status, toPos.notification_id, toPos.part_group, toPos.notif_type, toPos.user_name, toPos.has_ns, toPos.has_sub, toPos.is_a_rank, toPos.timestamp, fromPos.id);
        update.run(fromPos.status, fromPos.notification_id, fromPos.part_group, fromPos.notif_type, fromPos.user_name, fromPos.has_ns, fromPos.has_sub, fromPos.is_a_rank, fromPos.timestamp, toPos.id);

        db.prepare('INSERT INTO logs (action, details) VALUES (?, ?)').run('ADMIN_MOVE', `Swapped/Moved position ${fromId} with ${toId}`);
      });
      transaction();
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.post('/api/admin/position', (req, res) => {
    const { pin, position } = req.body;
    const stored = db.prepare("SELECT value FROM settings WHERE key = 'admin_pin'").get() as { value: string };
    if (!stored || stored.value !== pin) {
      return res.status(401).json({ success: false, message: 'Invalid PIN' });
    }
    
    try {
      db.prepare(`
        UPDATE positions 
        SET status=?, notification_id=?, part_group=?, notif_type=?, user_name=?, has_ns=?, has_sub=?, is_a_rank=?
        WHERE id=?
      `).run(
        position.status, position.notification_id || null, position.part_group || null, 
        position.notif_type || null, position.user_name || null, 
        position.has_ns ? 1 : 0, position.has_sub ? 1 : 0, position.is_a_rank ? 1 : 0, 
        position.id
      );
      db.prepare('INSERT INTO logs (action, details) VALUES (?, ?)').run('ADMIN_EDIT', `Manually edited position ${position.id}`);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.post('/api/admin/import', (req, res) => {
    const { positions, rules } = req.body;
    try {
      const transaction = db.transaction(() => {
        db.prepare('DELETE FROM positions').run();
        const insertPos = db.prepare(`
          INSERT INTO positions (id, col_id, row_idx, status, has_ns, has_sub, is_a_rank, notification_id, part_group, notif_type, user_name, timestamp) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const p of positions) {
          insertPos.run(
            p.id, p.col_id, p.row_idx, p.status, 
            p.has_ns ? 1 : 0, p.has_sub ? 1 : 0, p.is_a_rank ? 1 : 0, 
            p.notification_id, p.part_group, p.notif_type, p.user_name, p.timestamp
          );
        }

        if (rules && rules.length > 0) {
          const updateRule = db.prepare(`
            UPDATE column_rules SET enabled=?, priority=?, capacity=?, allow_ns=?, allow_sub=?, allow_otc=?, allow_exera2=?, allow_exera3=? WHERE col_id=?
          `);
          for (const r of rules) {
            updateRule.run(
              r.enabled ? 1 : 0, r.priority, r.capacity, 
              r.allow_ns ? 1 : 0, r.allow_sub ? 1 : 0, 
              r.allow_otc ? 1 : 0, r.allow_exera2 ? 1 : 0, r.allow_exera3 ? 1 : 0,
              r.col_id
            );
          }
        }
        db.prepare('INSERT INTO logs (action, details) VALUES (?, ?)').run('IMPORT_EXCEL', 'Imported DB from Excel');
      });
      transaction();
      res.json({ success: true, message: 'Import successful' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.get('/api/item/:id', (req, res) => {
    const { id } = req.params;
    const pos = db.prepare('SELECT * FROM positions WHERE notification_id = ?').get(id) as any;
    if (pos) {
      pos.has_ns = pos.has_ns === 1;
      pos.has_sub = pos.has_sub === 1;
      pos.is_a_rank = pos.is_a_rank === 1;
      res.json({ success: true, item: pos });
    } else {
      res.status(404).json({ success: false, message: 'Item not found' });
    }
  });

  app.post('/api/store', (req, res) => {
    const { notificationId, partGroup, notifType, userName } = req.body;
    const now = new Date().toISOString();

    const transaction = db.transaction(() => {
      // 0. Check if already completely occupied
      const fullyOccupied = db.prepare("SELECT * FROM positions WHERE notification_id = ? AND status = 'occupied'").get(notificationId) as any;
      if (fullyOccupied) {
        return { success: false, message: 'This Notification ID is already fully stored.' };
      }

      // 1. Check for Strict Pairing Match (partial slot with same ID)
      if (partGroup !== 'A-Rank') {
        const matchingPartial = db.prepare("SELECT * FROM positions WHERE notification_id = ? AND status = 'partial'").get(notificationId) as any;
        
        if (matchingPartial) {
          if (partGroup === 'NS' && matchingPartial.has_ns) return { success: false, message: 'NS part is already stored for this ID.' };
          if (partGroup === 'SUB' && matchingPartial.has_sub) return { success: false, message: 'SUB part is already stored for this ID.' };

          const hasNs = partGroup === 'NS' ? 1 : matchingPartial.has_ns;
          const hasSub = partGroup === 'SUB' ? 1 : matchingPartial.has_sub;

          db.prepare(`
            UPDATE positions 
            SET status='occupied', part_group='NS+SUB', has_ns=?, has_sub=?, timestamp=?, user_name=COALESCE(?, user_name)
            WHERE id=?
          `).run(hasNs, hasSub, now, userName || null, matchingPartial.id);

          db.prepare('INSERT INTO logs (action, details) VALUES (?, ?)').run('STORE', `Stored ${partGroup} for ${notificationId} at ${matchingPartial.id} (Completed Pair)`);
          
          return { success: true, position: matchingPartial.id };
        }
      }

      // 2. Find free slot based on rules
      const columns = db.prepare('SELECT * FROM column_rules WHERE enabled = 1 ORDER BY priority ASC').all() as any[];
      let selectedPos = null;

      for (const col of columns) {
        if (partGroup === 'NS' && !col.allow_ns) continue;
        if ((partGroup === 'SUB' || partGroup === 'A-Rank') && !col.allow_sub) continue;
        if (notifType === 'OTC' && !col.allow_otc) continue;
        if (notifType === 'EXERA2' && !col.allow_exera2) continue;
        if (notifType === 'EXERA3' && !col.allow_exera3) continue;

        const freeSlot = db.prepare(`
          SELECT * FROM positions 
          WHERE col_id = ? AND status = 'free' AND row_idx <= ?
          ORDER BY row_idx ASC LIMIT 1
        `).get(col.col_id, col.capacity) as any;

        if (freeSlot) {
          selectedPos = freeSlot;
          break;
        }
      }

      if (!selectedPos) {
        return { success: false, message: 'No suitable free positions available.' };
      }

      // 3. Occupy slot
      const isARank = partGroup === 'A-Rank' ? 1 : 0;
      const status = partGroup === 'A-Rank' ? 'occupied' : 'partial';
      const hasNs = partGroup === 'NS' ? 1 : 0;
      const hasSub = (partGroup === 'SUB' || partGroup === 'A-Rank') ? 1 : 0;

      db.prepare(`
        UPDATE positions 
        SET status=?, notification_id=?, part_group=?, notif_type=?, user_name=?, timestamp=?, has_ns=?, has_sub=?, is_a_rank=?
        WHERE id=?
      `).run(status, notificationId, partGroup, notifType, userName || '', now, hasNs, hasSub, isARank, selectedPos.id);

      db.prepare('INSERT INTO logs (action, details) VALUES (?, ?)').run('STORE', `Stored ${partGroup} for ${notificationId} at ${selectedPos.id} (New ${status})`);

      return { success: true, position: selectedPos.id };
    });

    const result = transaction();
    if (!result.success) res.status(400).json(result);
    else res.json(result);
  });

  app.post('/api/pick', (req, res) => {
    const { notificationId, userName } = req.body;

    const transaction = db.transaction(() => {
      const pos = db.prepare('SELECT * FROM positions WHERE notification_id = ?').get(notificationId) as any;
      if (!pos) return { success: false, message: 'Notification not found.' };
      if (pos.status === 'partial') return { success: false, message: 'Cannot pick a partial item. Both NS and SUB parts must be stored first.' };

      db.prepare(`
        UPDATE positions 
        SET status='free', notification_id=NULL, part_group=NULL, notif_type=NULL, user_name=NULL, timestamp=NULL, has_ns=0, has_sub=0, is_a_rank=0
        WHERE id=?
      `).run(pos.id);

      db.prepare('INSERT INTO logs (action, details) VALUES (?, ?)').run('PICK', `Picked ${notificationId} from ${pos.id} by ${userName || 'Unknown'}`);

      return { 
        success: true, 
        position: pos.id, 
        message: pos.is_a_rank === 1 ? "WARNING: This has a long part to be replaced." : undefined 
      };
    });

    const result = transaction();
    if (!result.success) res.status(400).json(result);
    else res.json(result);
  });

  // Vite middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
