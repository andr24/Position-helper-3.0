import express from 'express';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Ensure data directories exist
const DATA_DIR = path.join(__dirname, 'data');
const POSITIONS_DIR = path.join(DATA_DIR, 'Positions');
const ARCHIVE_DIR = path.join(DATA_DIR, 'Archive');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(POSITIONS_DIR)) fs.mkdirSync(POSITIONS_DIR);
if (!fs.existsSync(ARCHIVE_DIR)) fs.mkdirSync(ARCHIVE_DIR);

// Initialize Database
const db = new Database(path.join(DATA_DIR, 'kiosk.db'));

// Schema Setup
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS column_rules (
    col_id TEXT PRIMARY KEY, -- 'A' through 'Z'
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
    id TEXT PRIMARY KEY, -- e.g., 'A-1'
    col_id TEXT,
    row_idx INTEGER,
    status TEXT DEFAULT 'free', -- 'free', 'occupied'
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

// Seed Settings if empty
const checkSettings = db.prepare('SELECT count(*) as count FROM settings').get() as { count: number };
if (checkSettings.count === 0) {
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('admin_pin', '0000');
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('save_folder', POSITIONS_DIR);
}

// Seed Columns A-Z if empty
const checkCols = db.prepare('SELECT count(*) as count FROM column_rules').get() as { count: number };
if (checkCols.count === 0) {
  const insertCol = db.prepare(`
    INSERT INTO column_rules (col_id, priority, capacity) VALUES (?, ?, ?)
  `);
  const insertPos = db.prepare(`
    INSERT INTO positions (id, col_id, row_idx) VALUES (?, ?, ?)
  `);

  const transaction = db.transaction(() => {
    for (let i = 0; i < 26; i++) {
      const colChar = String.fromCharCode(65 + i); // A-Z
      insertCol.run(colChar, i + 1, 8); // Default priority A=1, B=2...
      
      for (let r = 1; r <= 8; r++) {
        insertPos.run(`${colChar}-${r}`, colChar, r);
      }
    }
  });
  transaction();
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- API Routes ---

  // Get all positions (for map)
  app.get('/api/positions', (req, res) => {
    const positions = db.prepare('SELECT * FROM positions').all();
    res.json(positions);
  });

  // Get column rules
  app.get('/api/admin/rules', (req, res) => {
    const rules = db.prepare('SELECT * FROM column_rules ORDER BY col_id').all();
    res.json(rules);
  });

  // Update column rules
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

  // Verify PIN
  app.post('/api/admin/login', (req, res) => {
    const { pin } = req.body;
    const stored = db.prepare("SELECT value FROM settings WHERE key = 'admin_pin'").get() as { value: string };
    if (stored && stored.value === pin) {
      res.json({ success: true });
    } else {
      res.status(401).json({ success: false, message: 'Invalid PIN' });
    }
  });

  // Change PIN
  app.post('/api/admin/pin', (req, res) => {
    const { newPin } = req.body;
    db.prepare("UPDATE settings SET value = ? WHERE key = 'admin_pin'").run(newPin);
    res.json({ success: true });
  });

  // Get item details by notification ID
  app.get('/api/item/:id', (req, res) => {
    const { id } = req.params;
    const pos = db.prepare('SELECT * FROM positions WHERE notification_id = ?').get(id);
    if (pos) {
      res.json({ success: true, item: pos });
    } else {
      res.status(404).json({ success: false, message: 'Item not found' });
    }
  });

  // STORE Logic
  app.post('/api/store', (req, res) => {
    const { notificationId, partGroup, notifType, userName } = req.body;

    // 1. Check if already exists
    const existing = db.prepare('SELECT * FROM positions WHERE notification_id = ?').get(notificationId) as any;
    if (existing) {
      return res.json({ success: true, position: existing.id, message: 'Already stored' });
    }

    // 2. Find free slot based on rules
    // Get all enabled columns sorted by priority
    const columns = db.prepare(`
      SELECT * FROM column_rules 
      WHERE enabled = 1 
      ORDER BY priority ASC
    `).all() as any[];

    let selectedPos = null;

    for (const col of columns) {
      // Check type constraints
      if (partGroup === 'NS' && !col.allow_ns) continue;
      if (partGroup === 'SUB' && !col.allow_sub) continue;
      if (notifType === 'OTC' && !col.allow_otc) continue;
      if (notifType === 'EXERA2' && !col.allow_exera2) continue;
      if (notifType === 'EXERA3' && !col.allow_exera3) continue;

      // Find first free row within capacity
      const freeSlot = db.prepare(`
        SELECT * FROM positions 
        WHERE col_id = ? AND status = 'free' AND row_idx <= ?
        ORDER BY row_idx ASC
        LIMIT 1
      `).get(col.col_id, col.capacity) as any;

      if (freeSlot) {
        selectedPos = freeSlot;
        break;
      }
    }

    if (!selectedPos) {
      return res.status(400).json({ success: false, message: 'No suitable free positions available.' });
    }

    // 3. Occupy slot
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE positions 
      SET status='occupied', notification_id=?, part_group=?, notif_type=?, user_name=?, timestamp=?
      WHERE id=?
    `).run(notificationId, partGroup, notifType, userName, now, selectedPos.id);

    // 4. Save JSON file
    const posDir = path.join(POSITIONS_DIR, selectedPos.id);
    if (!fs.existsSync(posDir)) fs.mkdirSync(posDir, { recursive: true });
    
    const jsonContent = {
      notificationId,
      partGroup,
      notifType,
      userName,
      position: selectedPos.id,
      timestamp: now
    };
    fs.writeFileSync(path.join(posDir, `${notificationId}.json`), JSON.stringify(jsonContent, null, 2));

    // 5. Log
    db.prepare('INSERT INTO logs (action, details) VALUES (?, ?)').run(
      'STORE', 
      `Stored ${notificationId} at ${selectedPos.id} by ${userName}`
    );

    res.json({ success: true, position: selectedPos.id });
  });

  // PICK Logic
  app.post('/api/pick', (req, res) => {
    const { notificationId } = req.body;

    const pos = db.prepare('SELECT * FROM positions WHERE notification_id = ?').get(notificationId) as any;
    if (!pos) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }

    // 1. Clear slot
    db.prepare(`
      UPDATE positions 
      SET status='free', notification_id=NULL, part_group=NULL, notif_type=NULL, user_name=NULL, timestamp=NULL
      WHERE id=?
    `).run(pos.id);

    // 2. Move JSON to Archive
    const oldPath = path.join(POSITIONS_DIR, pos.id, `${notificationId}.json`);
    const archivePath = path.join(ARCHIVE_DIR, `${notificationId}.json`);
    
    if (fs.existsSync(oldPath)) {
      // Read to ensure we have content, then write to archive
      const content = fs.readFileSync(oldPath);
      fs.writeFileSync(archivePath, content);
      fs.unlinkSync(oldPath);
      
      // Clean up position dir if empty? Optional.
    }

    // 3. Log
    db.prepare('INSERT INTO logs (action, details) VALUES (?, ?)').run(
      'PICK', 
      `Picked ${notificationId} from ${pos.id}`
    );

    res.json({ success: true, position: pos.id });
  });

  // Vite middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production: Serve built assets
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
