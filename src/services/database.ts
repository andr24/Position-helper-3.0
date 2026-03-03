import { Position, ColumnRule } from '../types';

export interface DatabaseState {
  settings: Record<string, string>;
  column_rules: ColumnRule[];
  positions: Position[];
  logs: { id: number; action: string; details: string; timestamp: string }[];
}

let db: DatabaseState | null = null;

export async function initDB(savedData?: string): Promise<void> {
  if (savedData) {
    db = JSON.parse(savedData);
  } else if (!db) {
    db = initSchema();
  }
}

export function getDB(): DatabaseState {
  if (!db) throw new Error("Database not initialized");
  return db;
}

export function exportDB(): string {
  if (!db) throw new Error("Database not initialized");
  return JSON.stringify(db, null, 2);
}

function initSchema(): DatabaseState {
  const state: DatabaseState = {
    settings: {
      'admin_pin': '0000'
    },
    column_rules: [],
    positions: [],
    logs: []
  };

  for (let i = 0; i < 26; i++) {
    const colChar = String.fromCharCode(65 + i);
    state.column_rules.push({
      col_id: colChar,
      enabled: 1,
      priority: i + 1,
      capacity: 8,
      allow_ns: 1,
      allow_sub: 1,
      allow_otc: 1,
      allow_exera2: 1,
      allow_exera3: 1
    });

    for (let r = 1; r <= 8; r++) {
      state.positions.push({
        id: `${colChar}-${r}`,
        col_id: colChar,
        row_idx: r,
        status: 'free',
        has_ns: false,
        has_sub: false,
        is_a_rank: false
      });
    }
  }

  return state;
}
