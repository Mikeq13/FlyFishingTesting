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

  const bootstrapStatements = [
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'angler',
      access_level TEXT NOT NULL DEFAULT 'free',
      subscription_status TEXT NOT NULL DEFAULT 'not_started',
      trial_started_at TEXT,
      trial_ends_at TEXT,
      subscription_expires_at TEXT,
      granted_by_user_id INTEGER
    )`,
    `CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      session_mode TEXT NOT NULL DEFAULT 'experiment',
      planned_duration_minutes INTEGER,
      alert_interval_minutes INTEGER,
      alert_markers_json TEXT,
      water_type TEXT NOT NULL,
      depth_range TEXT NOT NULL,
      competition_beat TEXT,
      competition_session_number INTEGER,
      competition_requires_measurement INTEGER NOT NULL DEFAULT 1,
      competition_length_unit TEXT NOT NULL DEFAULT 'mm',
      starting_rig_setup_json TEXT,
      river_name TEXT,
      hypothesis TEXT,
      insect_type TEXT NOT NULL,
      insect_stage TEXT NOT NULL,
      insect_confidence TEXT NOT NULL,
      notes TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS experiments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      session_id INTEGER NOT NULL,
      hypothesis TEXT NOT NULL,
      control_focus TEXT NOT NULL DEFAULT 'pattern',
      rig_setup_json TEXT,
      fly_entries_json TEXT,
      control_fly_json TEXT NOT NULL,
      variant_fly_json TEXT NOT NULL,
      control_casts INTEGER NOT NULL,
      control_catches INTEGER NOT NULL,
      variant_casts INTEGER NOT NULL,
      variant_catches INTEGER NOT NULL,
      winner TEXT NOT NULL,
      outcome TEXT NOT NULL DEFAULT 'inconclusive',
      status TEXT NOT NULL DEFAULT 'complete',
      confidence_score REAL NOT NULL,
      archived_at TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(session_id) REFERENCES sessions(id)
    )`,
    `CREATE TABLE IF NOT EXISTS session_segments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      session_id INTEGER NOT NULL,
      session_mode TEXT NOT NULL DEFAULT 'practice',
      river_name TEXT,
      water_type TEXT NOT NULL,
      depth_range TEXT NOT NULL,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      rig_setup_json TEXT,
      fly_snapshots_json TEXT NOT NULL,
      notes TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(session_id) REFERENCES sessions(id)
    )`,
    `CREATE TABLE IF NOT EXISTS catch_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      session_id INTEGER NOT NULL,
      segment_id INTEGER,
      session_mode TEXT NOT NULL DEFAULT 'practice',
      fly_name TEXT,
      fly_snapshot_json TEXT,
      species TEXT,
      length_value REAL,
      length_unit TEXT NOT NULL DEFAULT 'in',
      caught_at TEXT NOT NULL,
      notes TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(session_id) REFERENCES sessions(id),
      FOREIGN KEY(segment_id) REFERENCES session_segments(id)
    )`,
    `CREATE TABLE IF NOT EXISTS saved_flies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      intent TEXT NOT NULL,
      hook_size INTEGER NOT NULL DEFAULT 16,
      bead_size_mm REAL NOT NULL,
      bead_color TEXT NOT NULL DEFAULT 'black',
      body_type TEXT NOT NULL,
      bug_family TEXT NOT NULL DEFAULT 'mayfly',
      bug_stage TEXT NOT NULL DEFAULT 'nymph',
      tail TEXT NOT NULL DEFAULT 'natural',
      collar TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS saved_rivers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS saved_leader_formulas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      sections_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`
  ];

  for (const statement of bootstrapStatements) {
    await database.execAsync(statement);
  }

  try {
    await database.execAsync(`ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'angler';`);
  } catch {}
  try {
    await database.execAsync(`ALTER TABLE users ADD COLUMN access_level TEXT NOT NULL DEFAULT 'free';`);
  } catch {}
  try {
    await database.execAsync(`ALTER TABLE users ADD COLUMN subscription_status TEXT NOT NULL DEFAULT 'not_started';`);
  } catch {}
  try {
    await database.execAsync(`ALTER TABLE users ADD COLUMN trial_started_at TEXT;`);
  } catch {}
  try {
    await database.execAsync(`ALTER TABLE users ADD COLUMN trial_ends_at TEXT;`);
  } catch {}
  try {
    await database.execAsync(`ALTER TABLE users ADD COLUMN subscription_expires_at TEXT;`);
  } catch {}
  try {
    await database.execAsync(`ALTER TABLE users ADD COLUMN granted_by_user_id INTEGER;`);
  } catch {}
  try {
    await database.execAsync(`ALTER TABLE sessions ADD COLUMN river_name TEXT;`);
  } catch {}
  try {
    await database.execAsync(`ALTER TABLE sessions ADD COLUMN hypothesis TEXT;`);
  } catch {}
  try {
    await database.execAsync(`ALTER TABLE sessions ADD COLUMN planned_duration_minutes INTEGER;`);
  } catch {}
  try {
    await database.execAsync(`ALTER TABLE sessions ADD COLUMN alert_interval_minutes INTEGER;`);
  } catch {}
  try {
    await database.execAsync(`ALTER TABLE sessions ADD COLUMN alert_markers_json TEXT;`);
  } catch {}
  try {
    await database.execAsync(`ALTER TABLE sessions ADD COLUMN competition_beat TEXT;`);
  } catch {}
  try {
    await database.execAsync(`ALTER TABLE sessions ADD COLUMN competition_session_number INTEGER;`);
  } catch {}
  try {
    await database.execAsync(`ALTER TABLE sessions ADD COLUMN competition_requires_measurement INTEGER NOT NULL DEFAULT 1;`);
  } catch {}
  try {
    await database.execAsync(`ALTER TABLE sessions ADD COLUMN competition_length_unit TEXT NOT NULL DEFAULT 'mm';`);
  } catch {}
  try {
    await database.execAsync(`ALTER TABLE sessions ADD COLUMN starting_rig_setup_json TEXT;`);
  } catch {}
  try {
    await database.execAsync(`ALTER TABLE experiments ADD COLUMN outcome TEXT NOT NULL DEFAULT 'inconclusive';`);
  } catch {}
  try {
    await database.execAsync(`ALTER TABLE experiments ADD COLUMN status TEXT NOT NULL DEFAULT 'complete';`);
  } catch {}
  try {
    await database.execAsync(`ALTER TABLE experiments ADD COLUMN control_focus TEXT NOT NULL DEFAULT 'pattern';`);
  } catch {}
  try {
    await database.execAsync(`ALTER TABLE experiments ADD COLUMN rig_setup_json TEXT;`);
  } catch {}
  try {
    await database.execAsync(`ALTER TABLE experiments ADD COLUMN archived_at TEXT;`);
  } catch {}
  try {
    await database.execAsync(`ALTER TABLE experiments ADD COLUMN fly_entries_json TEXT;`);
  } catch {}
  try {
    await database.execAsync(`ALTER TABLE sessions ADD COLUMN session_mode TEXT NOT NULL DEFAULT 'experiment';`);
  } catch {}
  try {
    await database.execAsync(`ALTER TABLE saved_flies ADD COLUMN hook_size INTEGER NOT NULL DEFAULT 16;`);
  } catch {}
  try {
    await database.execAsync(`ALTER TABLE saved_flies ADD COLUMN bug_family TEXT NOT NULL DEFAULT 'mayfly';`);
  } catch {}
  try {
    await database.execAsync(`ALTER TABLE saved_flies ADD COLUMN bead_color TEXT NOT NULL DEFAULT 'black';`);
  } catch {}
  try {
    await database.execAsync(`ALTER TABLE saved_flies ADD COLUMN bug_stage TEXT NOT NULL DEFAULT 'nymph';`);
  } catch {}
  try {
    await database.execAsync(`ALTER TABLE saved_flies ADD COLUMN tail TEXT NOT NULL DEFAULT 'natural';`);
  } catch {}
  try {
    await database.execAsync(`ALTER TABLE session_segments ADD COLUMN rig_setup_json TEXT;`);
  } catch {}
};
