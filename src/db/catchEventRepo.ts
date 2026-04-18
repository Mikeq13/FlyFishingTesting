import { CatchEvent } from '@/types/activity';
import { getDb, isWeb } from './schema';
import { deleteWebRows, insertWebRow, listWebRows } from './webStore';

const WEB_CATCH_EVENTS_KEY = 'fishing_lab.catch_events';
const WEB_CATCH_EVENTS_ID_KEY = 'fishing_lab.catch_events.nextId';

export const createCatchEvent = async (payload: Omit<CatchEvent, 'id'>): Promise<number> => {
  if (isWeb) {
    return insertWebRow<CatchEvent>(WEB_CATCH_EVENTS_KEY, WEB_CATCH_EVENTS_ID_KEY, payload);
  }

  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO catch_events (user_id, session_id, segment_id, session_mode, fly_name, fly_snapshot_json, species, length_value, length_unit, caught_at, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    payload.userId,
    payload.sessionId,
    payload.segmentId ?? null,
    payload.mode,
    payload.flyName ?? null,
    payload.flySnapshot ? JSON.stringify(payload.flySnapshot) : null,
    payload.species ?? null,
    payload.lengthValue ?? null,
    payload.lengthUnit,
    payload.caughtAt,
    payload.notes ?? null
  );
  return result.lastInsertRowId;
};

export const listCatchEvents = async (userId: number): Promise<CatchEvent[]> => {
  if (isWeb) {
    return listWebRows<CatchEvent>(WEB_CATCH_EVENTS_KEY).filter((event) => event.userId === userId);
  }

  const db = await getDb();
  const rows = await db.getAllAsync<any>('SELECT * FROM catch_events WHERE user_id = ? ORDER BY caught_at DESC', userId);
  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    sessionId: row.session_id,
    segmentId: row.segment_id ?? undefined,
    mode: row.session_mode ?? 'practice',
    flyName: row.fly_name ?? undefined,
    flySnapshot: row.fly_snapshot_json ? JSON.parse(row.fly_snapshot_json) : undefined,
    species: row.species ?? undefined,
    lengthValue: row.length_value ?? undefined,
    lengthUnit: row.length_unit ?? 'in',
    caughtAt: row.caught_at,
    notes: row.notes ?? undefined
  }));
};

export const deleteCatchEventsForUser = async (userId: number): Promise<void> => {
  if (isWeb) {
    deleteWebRows<CatchEvent>(WEB_CATCH_EVENTS_KEY, (row) => row.userId === userId);
    return;
  }

  const db = await getDb();
  await db.runAsync('DELETE FROM catch_events WHERE user_id = ?', userId);
};

export const deleteCatchEventsForSessions = async (sessionIds: number[]): Promise<void> => {
  if (!sessionIds.length) return;

  if (isWeb) {
    deleteWebRows<CatchEvent>(WEB_CATCH_EVENTS_KEY, (row) => sessionIds.includes(row.sessionId));
    return;
  }

  const db = await getDb();
  const placeholders = sessionIds.map(() => '?').join(', ');
  await db.runAsync(`DELETE FROM catch_events WHERE session_id IN (${placeholders})`, ...sessionIds);
};
