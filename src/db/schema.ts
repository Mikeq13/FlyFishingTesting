import { Platform } from 'react-native';

type DbLike = {
  execAsync: (sql: string) => Promise<void>;
  runAsync: (...args: any[]) => Promise<{ lastInsertRowId: number }>;
  getAllAsync: <T = any>(sql: string, ...args: any[]) => Promise<T[]>;
};

let db: DbLike | null = null;
export const isWeb = Platform.OS === 'web';

export const getDb = async (): Promise<DbLike> => {
  if (isWeb) throw new Error('SQLite unavailable on web runtime');
  if (!db) {
    const SQLite = await import('./sqlite');
    db = (await SQLite.openDatabaseAsync('fishing_lab.db')) as DbLike;
  }
  return db;
};

export const initDb = async (): Promise<void> => {
  if (isWeb) return;
  const database = await getDb();

  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      water_type TEXT NOT NULL,
      depth_range TEXT NOT NULL,
      river_name TEXT,
      insect_type TEXT NOT NULL,
      insect_stage TEXT NOT NULL,
      insect_confidence TEXT NOT NULL,
      notes TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS experiments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      session_id INTEGER NOT NULL,
      hypothesis TEXT NOT NULL,
      fly_entries_json TEXT,
      control_fly_json TEXT NOT NULL,
      variant_fly_json TEXT NOT NULL,
      control_casts INTEGER NOT NULL,
      control_catches INTEGER NOT NULL,
      variant_casts INTEGER NOT NULL,
      variant_catches INTEGER NOT NULL,
      winner TEXT NOT NULL,
      outcome TEXT NOT NULL DEFAULT 'inconclusive',
      confidence_score REAL NOT NULL,
      archived_at TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(session_id) REFERENCES sessions(id)
    );

    CREATE TABLE IF NOT EXISTS saved_flies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      intent TEXT NOT NULL,
      hook_size INTEGER NOT NULL DEFAULT 16,
      bead_size_mm REAL NOT NULL,
      body_type TEXT NOT NULL,
      bug_family TEXT NOT NULL DEFAULT 'mayfly',
      bug_stage TEXT NOT NULL DEFAULT 'nymph',
      tail TEXT NOT NULL DEFAULT 'natural',
      collar TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS saved_rivers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `);

  try {
    await database.execAsync(`ALTER TABLE sessions ADD COLUMN river_name TEXT;`);
  } catch {}
  try {
    await database.execAsync(`ALTER TABLE experiments ADD COLUMN outcome TEXT NOT NULL DEFAULT 'inconclusive';`);
  } catch {}
  try {
    await database.execAsync(`ALTER TABLE experiments ADD COLUMN archived_at TEXT;`);
  } catch {}
  try {
    await database.execAsync(`ALTER TABLE experiments ADD COLUMN fly_entries_json TEXT;`);
  } catch {}
  try {
    await database.execAsync(`ALTER TABLE saved_flies ADD COLUMN hook_size INTEGER NOT NULL DEFAULT 16;`);
  } catch {}
  try {
    await database.execAsync(`ALTER TABLE saved_flies ADD COLUMN bug_family TEXT NOT NULL DEFAULT 'mayfly';`);
  } catch {}
  try {
    await database.execAsync(`ALTER TABLE saved_flies ADD COLUMN bug_stage TEXT NOT NULL DEFAULT 'nymph';`);
  } catch {}
  try {
    await database.execAsync(`ALTER TABLE saved_flies ADD COLUMN tail TEXT NOT NULL DEFAULT 'natural';`);
  } catch {}
};
