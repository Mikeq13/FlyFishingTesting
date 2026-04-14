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
      control_fly_json TEXT NOT NULL,
      variant_fly_json TEXT NOT NULL,
      control_casts INTEGER NOT NULL,
      control_catches INTEGER NOT NULL,
      variant_casts INTEGER NOT NULL,
      variant_catches INTEGER NOT NULL,
      winner TEXT NOT NULL,
      confidence_score REAL NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(session_id) REFERENCES sessions(id)
    );

    CREATE TABLE IF NOT EXISTS saved_flies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      intent TEXT NOT NULL,
      bead_size_mm REAL NOT NULL,
      body_type TEXT NOT NULL,
      collar TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `);
};
