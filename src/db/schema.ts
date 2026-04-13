import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export const getDb = async (): Promise<SQLite.SQLiteDatabase> => {
  if (!db) db = await SQLite.openDatabaseAsync('fishing_lab.db');
  return db;
};

export const initDb = async (): Promise<void> => {
  const database = await getDb();
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      water_type TEXT NOT NULL,
      depth_range TEXT NOT NULL,
      insect_type TEXT NOT NULL,
      insect_stage TEXT NOT NULL,
      insect_confidence TEXT NOT NULL,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS experiments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      FOREIGN KEY(session_id) REFERENCES sessions(id)
    );
  `);
};
