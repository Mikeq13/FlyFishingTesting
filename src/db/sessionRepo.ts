import { getDb, isWeb } from './schema';
import { Session } from '@/types/session';
import { insertWebRow, listWebRows } from './webStore';

const WEB_SESSIONS_KEY = 'fishing_lab.sessions';
const WEB_SESSIONS_ID_KEY = 'fishing_lab.sessions.nextId';

export const createSession = async (payload: Omit<Session, 'id'>): Promise<number> => {
  if (isWeb) {
    return insertWebRow<Session>(WEB_SESSIONS_KEY, WEB_SESSIONS_ID_KEY, payload);
  }

  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO sessions (user_id, date, water_type, depth_range, river_name, insect_type, insect_stage, insect_confidence, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    payload.userId,
    payload.date,
    payload.waterType,
    payload.depthRange,
    payload.riverName ?? null,
    'mayfly',
    'nymph',
    'low',
    payload.notes ?? null
  );
  return result.lastInsertRowId;
};

export const listSessions = async (userId: number): Promise<Session[]> => {
  if (isWeb) return listWebRows<Session>(WEB_SESSIONS_KEY).filter((s) => s.userId === userId);

  const db = await getDb();
  const rows = await db.getAllAsync<any>('SELECT * FROM sessions WHERE user_id = ? ORDER BY date DESC', userId);
  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    date: r.date,
    waterType: r.water_type,
    depthRange: r.depth_range,
    riverName: r.river_name ?? undefined,
    notes: r.notes ?? undefined
  }));
};
