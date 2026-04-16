import { getDb, isWeb } from './schema';
import { Session } from '@/types/session';
import { deleteWebRows, insertWebRow, listWebRows } from './webStore';

const WEB_SESSIONS_KEY = 'fishing_lab.sessions';
const WEB_SESSIONS_ID_KEY = 'fishing_lab.sessions.nextId';

export const createSession = async (payload: Omit<Session, 'id'>): Promise<number> => {
  if (isWeb) {
    return insertWebRow<Session>(WEB_SESSIONS_KEY, WEB_SESSIONS_ID_KEY, payload);
  }

  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO sessions (user_id, date, session_mode, planned_duration_minutes, alert_interval_minutes, water_type, depth_range, river_name, hypothesis, insect_type, insect_stage, insect_confidence, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    payload.userId,
    payload.date,
    payload.mode,
    payload.plannedDurationMinutes ?? null,
    payload.alertIntervalMinutes ?? null,
    payload.waterType,
    payload.depthRange,
    payload.riverName ?? null,
    payload.hypothesis ?? null,
    'mayfly',
    'nymph',
    'low',
    payload.notes ?? null
  );
  return result.lastInsertRowId;
};

export const listSessions = async (userId: number): Promise<Session[]> => {
  if (isWeb) {
    return listWebRows<Session>(WEB_SESSIONS_KEY)
      .filter((s) => s.userId === userId)
      .map((session) => ({
        ...session,
        mode: session.mode ?? 'experiment',
        plannedDurationMinutes: session.plannedDurationMinutes ?? undefined,
        alertIntervalMinutes: session.alertIntervalMinutes === undefined ? 15 : session.alertIntervalMinutes
      }));
  }

  const db = await getDb();
  const rows = await db.getAllAsync<any>('SELECT * FROM sessions WHERE user_id = ? ORDER BY date DESC', userId);
  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    date: r.date,
    mode: r.session_mode ?? 'experiment',
    plannedDurationMinutes: r.planned_duration_minutes ?? undefined,
    alertIntervalMinutes: r.alert_interval_minutes === undefined ? 15 : r.alert_interval_minutes,
    waterType: r.water_type,
    depthRange: r.depth_range,
    riverName: r.river_name ?? undefined,
    hypothesis: r.hypothesis ?? undefined,
    notes: r.notes ?? undefined
  }));
};

export const deleteSessionsForUser = async (userId: number): Promise<void> => {
  if (isWeb) {
    deleteWebRows<Session>(WEB_SESSIONS_KEY, (row) => row.userId === userId);
    return;
  }

  const db = await getDb();
  await db.runAsync('DELETE FROM sessions WHERE user_id = ?', userId);
};
