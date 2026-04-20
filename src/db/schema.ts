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
      email TEXT,
      remote_auth_id TEXT,
      email_verified_at TEXT,
      owner_linked_email TEXT,
      owner_linked_auth_id TEXT,
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
    `CREATE TABLE IF NOT EXISTS invites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inviter_user_id INTEGER NOT NULL,
      target_group_id INTEGER NOT NULL,
      invite_code TEXT NOT NULL,
      target_name TEXT,
      grant_type TEXT NOT NULL DEFAULT 'power_user_group',
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL,
      accepted_by_user_id INTEGER,
      accepted_at TEXT,
      revoked_at TEXT,
      FOREIGN KEY(inviter_user_id) REFERENCES users(id),
      FOREIGN KEY(target_group_id) REFERENCES groups(id),
      FOREIGN KEY(accepted_by_user_id) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS sponsored_access (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sponsor_user_id INTEGER NOT NULL,
      sponsored_user_id INTEGER NOT NULL,
      target_group_id INTEGER NOT NULL,
      granted_access_level TEXT NOT NULL DEFAULT 'power_user',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      revoked_at TEXT,
      FOREIGN KEY(sponsor_user_id) REFERENCES users(id),
      FOREIGN KEY(sponsored_user_id) REFERENCES users(id),
      FOREIGN KEY(target_group_id) REFERENCES groups(id)
    )`,
    `CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      operation TEXT NOT NULL,
      record_id INTEGER,
      payload_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL,
      synced_at TEXT,
      error_message TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS sync_metadata (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      local_record_id INTEGER NOT NULL,
      remote_record_id TEXT,
      last_synced_at TEXT,
      pending_import INTEGER NOT NULL DEFAULT 1
    )`,
    `CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      session_mode TEXT NOT NULL DEFAULT 'experiment',
      planned_duration_minutes INTEGER,
      alert_interval_minutes INTEGER,
      alert_markers_json TEXT,
      notification_sound_enabled INTEGER NOT NULL DEFAULT 1,
      notification_vibration_enabled INTEGER NOT NULL DEFAULT 1,
      ended_at TEXT,
      start_at TEXT,
      end_at TEXT,
      water_type TEXT NOT NULL,
      depth_range TEXT NOT NULL,
      shared_group_id INTEGER,
      practice_measurement_enabled INTEGER NOT NULL DEFAULT 0,
      practice_length_unit TEXT NOT NULL DEFAULT 'in',
      competition_id INTEGER,
      competition_assignment_id INTEGER,
      competition_group_id INTEGER,
      competition_session_id INTEGER,
      competition_assigned_group TEXT,
      competition_role TEXT NOT NULL DEFAULT 'fishing',
      competition_beat TEXT,
      competition_session_number INTEGER,
      competition_requires_measurement INTEGER NOT NULL DEFAULT 1,
      competition_length_unit TEXT NOT NULL DEFAULT 'mm',
      starting_rig_setup_json TEXT,
      starting_technique TEXT,
      river_name TEXT,
      hypothesis TEXT,
      insect_type TEXT NOT NULL,
      insect_stage TEXT NOT NULL,
      insect_confidence TEXT NOT NULL,
      notes TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS session_group_shares (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      session_id INTEGER NOT NULL,
      group_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(session_id) REFERENCES sessions(id),
      FOREIGN KEY(group_id) REFERENCES groups(id)
    )`,
    `CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      join_code TEXT NOT NULL,
      created_by_user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(created_by_user_id) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS group_memberships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      membership_role TEXT NOT NULL DEFAULT 'member',
      joined_at TEXT NOT NULL,
      FOREIGN KEY(group_id) REFERENCES groups(id),
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS share_preferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      group_id INTEGER NOT NULL,
      share_journal_entries INTEGER NOT NULL DEFAULT 0,
      share_practice_sessions INTEGER NOT NULL DEFAULT 0,
      share_competition_sessions INTEGER NOT NULL DEFAULT 0,
      share_insights INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(group_id) REFERENCES groups(id)
    )`,
    `CREATE TABLE IF NOT EXISTS competitions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      organizer_user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      join_code TEXT NOT NULL,
      group_count INTEGER NOT NULL DEFAULT 1,
      session_count INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      FOREIGN KEY(organizer_user_id) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS competition_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      competition_id INTEGER NOT NULL,
      label TEXT NOT NULL,
      sort_order INTEGER NOT NULL,
      FOREIGN KEY(competition_id) REFERENCES competitions(id)
    )`,
    `CREATE TABLE IF NOT EXISTS competition_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      competition_id INTEGER NOT NULL,
      session_number INTEGER NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      FOREIGN KEY(competition_id) REFERENCES competitions(id)
    )`,
    `CREATE TABLE IF NOT EXISTS competition_participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      competition_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      joined_at TEXT NOT NULL,
      FOREIGN KEY(competition_id) REFERENCES competitions(id),
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS competition_session_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      competition_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      competition_group_id INTEGER,
      competition_session_id INTEGER,
      beat TEXT NOT NULL,
      assignment_role TEXT NOT NULL DEFAULT 'fishing',
      session_id INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(competition_id) REFERENCES competitions(id),
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(competition_group_id) REFERENCES competition_groups(id),
      FOREIGN KEY(competition_session_id) REFERENCES competition_sessions(id),
      FOREIGN KEY(session_id) REFERENCES sessions(id)
    )`,
    `CREATE TABLE IF NOT EXISTS experiments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      session_id INTEGER NOT NULL,
      hypothesis TEXT NOT NULL,
      control_focus TEXT NOT NULL DEFAULT 'pattern',
      water_type TEXT,
      technique TEXT,
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
      technique TEXT,
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
      normalized_name TEXT,
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
      normalized_name TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS saved_leader_formulas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      normalized_name TEXT,
      sections_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS saved_rig_presets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      normalized_name TEXT,
      preset_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`
  ];

  for (const statement of bootstrapStatements) {
    await database.execAsync(statement);
  }

  try {
    await database.execAsync(`ALTER TABLE users ADD COLUMN email TEXT;`);
  } catch {}
  try {
    await database.execAsync(`ALTER TABLE users ADD COLUMN remote_auth_id TEXT;`);
  } catch {}
  try {
    await database.execAsync(`ALTER TABLE users ADD COLUMN email_verified_at TEXT;`);
  } catch {}
  try {
    await database.execAsync(`ALTER TABLE users ADD COLUMN owner_linked_email TEXT;`);
  } catch {}
  try {
    await database.execAsync(`ALTER TABLE users ADD COLUMN owner_linked_auth_id TEXT;`);
  } catch {}
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
    await database.execAsync(`ALTER TABLE sessions ADD COLUMN notification_sound_enabled INTEGER NOT NULL DEFAULT 1;`);
  } catch {}
  try {
    await database.execAsync(`ALTER TABLE sessions ADD COLUMN notification_vibration_enabled INTEGER NOT NULL DEFAULT 1;`);
  } catch {}
  try {
    await database.execAsync(`ALTER TABLE sessions ADD COLUMN ended_at TEXT;`);
  } catch {}
  try {
    await database.execAsync(`ALTER TABLE sessions ADD COLUMN start_at TEXT;`);
  } catch {}
  try {
    await database.execAsync(`ALTER TABLE sessions ADD COLUMN end_at TEXT;`);
  } catch {}
  try {
    await database.execAsync(`ALTER TABLE sessions ADD COLUMN shared_group_id INTEGER;`);
  } catch {}
  try {
    await database.execAsync(`CREATE TABLE IF NOT EXISTS session_group_shares (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      session_id INTEGER NOT NULL,
      group_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(session_id) REFERENCES sessions(id),
      FOREIGN KEY(group_id) REFERENCES groups(id)
    )`);
  } catch {}
  try {
    await database.execAsync(`ALTER TABLE sessions ADD COLUMN practice_measurement_enabled INTEGER NOT NULL DEFAULT 0;`);
  } catch {}
  try {
    await database.execAsync(`ALTER TABLE sessions ADD COLUMN practice_length_unit TEXT NOT NULL DEFAULT 'in';`);
  } catch {}
  try {
    await database.execAsync(`ALTER TABLE sessions ADD COLUMN competition_id INTEGER;`);
  } catch {}
  try {
    await database.execAsync(`ALTER TABLE sessions ADD COLUMN competition_assignment_id INTEGER;`);
  } catch {}
  try {
    await database.execAsync(`ALTER TABLE sessions ADD COLUMN competition_group_id INTEGER;`);
  } catch {}
  try {
    await database.execAsync(`ALTER TABLE sessions ADD COLUMN competition_session_id INTEGER;`);
  } catch {}
  try {
    await database.execAsync(`ALTER TABLE sessions ADD COLUMN competition_assigned_group TEXT;`);
  } catch {}
  try {
    await database.execAsync(`ALTER TABLE sessions ADD COLUMN competition_role TEXT NOT NULL DEFAULT 'fishing';`);
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
    await database.execAsync(`ALTER TABLE sessions ADD COLUMN starting_technique TEXT;`);
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
    await database.execAsync(`ALTER TABLE experiments ADD COLUMN technique TEXT;`);
  } catch {}
  try {
    await database.execAsync(`ALTER TABLE experiments ADD COLUMN water_type TEXT;`);
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
    await database.execAsync(`ALTER TABLE saved_flies ADD COLUMN normalized_name TEXT;`);
  } catch {}
  try {
    await database.execAsync(`ALTER TABLE saved_rivers ADD COLUMN normalized_name TEXT;`);
  } catch {}
  try {
    await database.execAsync(`ALTER TABLE saved_leader_formulas ADD COLUMN normalized_name TEXT;`);
  } catch {}
  try {
    await database.execAsync(`ALTER TABLE saved_rig_presets ADD COLUMN normalized_name TEXT;`);
  } catch {}
  try {
    await database.execAsync(`ALTER TABLE saved_flies ADD COLUMN hook_size INTEGER NOT NULL DEFAULT 16;`);
  } catch {}
  await database.execAsync(`UPDATE saved_flies SET normalized_name = lower(trim(name)) WHERE normalized_name IS NULL OR normalized_name = '';`);
  await database.execAsync(`UPDATE saved_rivers SET normalized_name = lower(trim(name)) WHERE normalized_name IS NULL OR normalized_name = '';`);
  await database.execAsync(`UPDATE saved_leader_formulas SET normalized_name = lower(trim(name)) WHERE normalized_name IS NULL OR normalized_name = '';`);
  await database.execAsync(`UPDATE saved_rig_presets SET normalized_name = lower(trim(name)) WHERE normalized_name IS NULL OR normalized_name = '';`);
  await database.execAsync(`DELETE FROM saved_flies
    WHERE id NOT IN (
      SELECT MAX(id)
      FROM saved_flies
      GROUP BY user_id, normalized_name
    );`);
  await database.execAsync(`DELETE FROM saved_rivers
    WHERE id NOT IN (
      SELECT MAX(id)
      FROM saved_rivers
      GROUP BY user_id, normalized_name
    );`);
  await database.execAsync(`DELETE FROM saved_leader_formulas
    WHERE id NOT IN (
      SELECT MAX(id)
      FROM saved_leader_formulas
      GROUP BY user_id, normalized_name
    );`);
  await database.execAsync(`DELETE FROM saved_rig_presets
    WHERE id NOT IN (
      SELECT MAX(id)
      FROM saved_rig_presets
      GROUP BY user_id, normalized_name
    );`);
  await database.execAsync(`DELETE FROM session_group_shares
    WHERE id NOT IN (
      SELECT MAX(id)
      FROM session_group_shares
      GROUP BY user_id, session_id, group_id
    );`);
  await database.execAsync(`DELETE FROM experiments
    WHERE status = 'draft'
      AND archived_at IS NULL
      AND id NOT IN (
        SELECT MAX(id)
        FROM experiments
        WHERE status = 'draft' AND archived_at IS NULL
        GROUP BY user_id, session_id
      );`);
  await database.execAsync(`CREATE UNIQUE INDEX IF NOT EXISTS idx_saved_flies_user_normalized_name ON saved_flies(user_id, normalized_name);`);
  await database.execAsync(`CREATE UNIQUE INDEX IF NOT EXISTS idx_saved_rivers_user_normalized_name ON saved_rivers(user_id, normalized_name);`);
  await database.execAsync(`CREATE UNIQUE INDEX IF NOT EXISTS idx_saved_leader_formulas_user_normalized_name ON saved_leader_formulas(user_id, normalized_name);`);
  await database.execAsync(`CREATE UNIQUE INDEX IF NOT EXISTS idx_saved_rig_presets_user_normalized_name ON saved_rig_presets(user_id, normalized_name);`);
  await database.execAsync(`CREATE UNIQUE INDEX IF NOT EXISTS idx_session_group_shares_user_session_group ON session_group_shares(user_id, session_id, group_id);`);
  await database.execAsync(`CREATE UNIQUE INDEX IF NOT EXISTS idx_experiments_user_session_active_draft ON experiments(user_id, session_id) WHERE status = 'draft' AND archived_at IS NULL;`);
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
  try {
    await database.execAsync(`ALTER TABLE session_segments ADD COLUMN technique TEXT;`);
  } catch {}
  try {
    await database.execAsync(`CREATE TABLE IF NOT EXISTS invites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inviter_user_id INTEGER NOT NULL,
      target_group_id INTEGER NOT NULL,
      invite_code TEXT NOT NULL,
      target_name TEXT,
      grant_type TEXT NOT NULL DEFAULT 'power_user_group',
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL,
      accepted_by_user_id INTEGER,
      accepted_at TEXT,
      revoked_at TEXT,
      FOREIGN KEY(inviter_user_id) REFERENCES users(id),
      FOREIGN KEY(target_group_id) REFERENCES groups(id),
      FOREIGN KEY(accepted_by_user_id) REFERENCES users(id)
    )`);
  } catch {}
  try {
    await database.execAsync(`CREATE TABLE IF NOT EXISTS sponsored_access (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sponsor_user_id INTEGER NOT NULL,
      sponsored_user_id INTEGER NOT NULL,
      target_group_id INTEGER NOT NULL,
      granted_access_level TEXT NOT NULL DEFAULT 'power_user',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      revoked_at TEXT,
      FOREIGN KEY(sponsor_user_id) REFERENCES users(id),
      FOREIGN KEY(sponsored_user_id) REFERENCES users(id),
      FOREIGN KEY(target_group_id) REFERENCES groups(id)
    )`);
  } catch {}
  try {
    await database.execAsync(`CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      operation TEXT NOT NULL,
      record_id INTEGER,
      payload_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL,
      synced_at TEXT,
      error_message TEXT
    )`);
  } catch {}
  try {
    await database.execAsync(`CREATE TABLE IF NOT EXISTS sync_metadata (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      local_record_id INTEGER NOT NULL,
      remote_record_id TEXT,
      last_synced_at TEXT,
      pending_import INTEGER NOT NULL DEFAULT 1
    )`);
  } catch {}
  try {
    await database.execAsync(`CREATE TABLE IF NOT EXISTS saved_leader_formulas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      sections_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`);
  } catch {}
  try {
    await database.execAsync(`CREATE TABLE IF NOT EXISTS saved_rig_presets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      preset_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`);
  } catch {}
  try {
    await database.execAsync(`CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      join_code TEXT NOT NULL,
      created_by_user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(created_by_user_id) REFERENCES users(id)
    )`);
  } catch {}
  try {
    await database.execAsync(`CREATE TABLE IF NOT EXISTS group_memberships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      membership_role TEXT NOT NULL DEFAULT 'member',
      joined_at TEXT NOT NULL,
      FOREIGN KEY(group_id) REFERENCES groups(id),
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`);
  } catch {}
  try {
    await database.execAsync(`CREATE TABLE IF NOT EXISTS share_preferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      group_id INTEGER NOT NULL,
      share_journal_entries INTEGER NOT NULL DEFAULT 0,
      share_practice_sessions INTEGER NOT NULL DEFAULT 0,
      share_competition_sessions INTEGER NOT NULL DEFAULT 0,
      share_insights INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(group_id) REFERENCES groups(id)
    )`);
  } catch {}
  try {
    await database.execAsync(`CREATE TABLE IF NOT EXISTS competitions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      organizer_user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      join_code TEXT NOT NULL,
      group_count INTEGER NOT NULL DEFAULT 1,
      session_count INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      FOREIGN KEY(organizer_user_id) REFERENCES users(id)
    )`);
  } catch {}
  try {
    await database.execAsync(`ALTER TABLE competitions ADD COLUMN group_count INTEGER NOT NULL DEFAULT 1;`);
  } catch {}
  try {
    await database.execAsync(`ALTER TABLE competitions ADD COLUMN session_count INTEGER NOT NULL DEFAULT 1;`);
  } catch {}
  try {
    await database.execAsync(`CREATE TABLE IF NOT EXISTS competition_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      competition_id INTEGER NOT NULL,
      label TEXT NOT NULL,
      sort_order INTEGER NOT NULL,
      FOREIGN KEY(competition_id) REFERENCES competitions(id)
    )`);
  } catch {}
  try {
    await database.execAsync(`CREATE TABLE IF NOT EXISTS competition_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      competition_id INTEGER NOT NULL,
      session_number INTEGER NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      FOREIGN KEY(competition_id) REFERENCES competitions(id)
    )`);
  } catch {}
  try {
    await database.execAsync(`CREATE TABLE IF NOT EXISTS competition_participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      competition_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      joined_at TEXT NOT NULL,
      FOREIGN KEY(competition_id) REFERENCES competitions(id),
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`);
  } catch {}
  try {
    await database.execAsync(`CREATE TABLE IF NOT EXISTS competition_session_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      competition_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      competition_group_id INTEGER,
      competition_session_id INTEGER,
      beat TEXT NOT NULL,
      assignment_role TEXT NOT NULL DEFAULT 'fishing',
      session_id INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(competition_id) REFERENCES competitions(id),
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(competition_group_id) REFERENCES competition_groups(id),
      FOREIGN KEY(competition_session_id) REFERENCES competition_sessions(id),
      FOREIGN KEY(session_id) REFERENCES sessions(id)
    )`);
  } catch {}
  try {
    await database.execAsync(`ALTER TABLE competition_session_assignments ADD COLUMN competition_group_id INTEGER;`);
  } catch {}
  try {
    await database.execAsync(`ALTER TABLE competition_session_assignments ADD COLUMN competition_session_id INTEGER;`);
  } catch {}
};
