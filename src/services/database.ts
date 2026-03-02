import initSqlJs, { Database } from 'sql.js';

let db: Database | null = null;
let SQL: any = null;

export async function initDB(savedData?: Uint8Array): Promise<void> {
  if (!SQL) {
    SQL = await initSqlJs({
      locateFile: file => `/${file}`
    });
  }
  
  if (savedData) {
    db = new SQL.Database(savedData);
  } else if (!db) {
    db = new SQL.Database();
    initSchema();
  }
}

export function getDB(): Database {
  if (!db) throw new Error("Database not initialized");
  return db;
}

export function exportDB(): Uint8Array {
  if (!db) throw new Error("Database not initialized");
  return db.export();
}

function initSchema() {
  if (!db) return;
  
  db.run(`
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

  // Seed Data
  const result = db.exec("SELECT count(*) as count FROM settings");
  if (result[0].values[0][0] === 0) {
    db.run("INSERT INTO settings (key, value) VALUES (?, ?)", ['admin_pin', '0000']);
  }

  const colResult = db.exec("SELECT count(*) as count FROM column_rules");
  if (colResult[0].values[0][0] === 0) {
    for (let i = 0; i < 26; i++) {
      const colChar = String.fromCharCode(65 + i);
      db.run("INSERT INTO column_rules (col_id, priority, capacity) VALUES (?, ?, ?)", [colChar, i + 1, 8]);
      for (let r = 1; r <= 8; r++) {
        db.run("INSERT INTO positions (id, col_id, row_idx) VALUES (?, ?, ?)", [`${colChar}-${r}`, colChar, r]);
      }
    }
  }
}
