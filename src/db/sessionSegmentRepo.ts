import { SessionSegment } from '@/types/activity';
import { getDb, isWeb } from './schema';
import { deleteWebRows, insertWebRow, listWebRows, updateWebRows } from './webStore';

const WEB_SEGMENTS_KEY = 'fishing_lab.session_segments';
const WEB_SEGMENTS_ID_KEY = 'fishing_lab.session_segments.nextId';

export const createSessionSegment = async (payload: Omit<SessionSegment, 'id'>): Promise<number> => {
  if (isWeb) {
    return insertWebRow<SessionSegment>(WEB_SEGMENTS_KEY, WEB_SEGMENTS_ID_KEY, payload);
  }

  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO session_segments (user_id, session_id, session_mode, river_name, water_type, depth_range, started_at, ended_at, rig_setup_json, fly_snapshots_json, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    payload.userId,
    payload.sessionId,
    payload.mode,
    payload.riverName ?? null,
    payload.waterType,
    payload.depthRange,
    payload.startedAt,
    payload.endedAt ?? null,
    payload.rigSetup ? JSON.stringify(payload.rigSetup) : null,
    JSON.stringify(payload.flySnapshots),
    payload.notes ?? null
  );
  return result.lastInsertRowId;
};

export const updateSessionSegment = async (segmentId: number, payload: Omit<SessionSegment, 'id' | 'userId'>): Promise<void> => {
  if (isWeb) {
    updateWebRows<SessionSegment>(WEB_SEGMENTS_KEY, (rows) =>
      rows.map((row) => (row.id === segmentId ? { ...row, ...payload } : row))
    );
    return;
  }

  const db = await getDb();
  await db.runAsync(
    `UPDATE session_segments
     SET session_id = ?, session_mode = ?, river_name = ?, water_type = ?, depth_range = ?, started_at = ?, ended_at = ?, rig_setup_json = ?, fly_snapshots_json = ?, notes = ?
     WHERE id = ?`,
    payload.sessionId,
    payload.mode,
    payload.riverName ?? null,
    payload.waterType,
    payload.depthRange,
    payload.startedAt,
    payload.endedAt ?? null,
    payload.rigSetup ? JSON.stringify(payload.rigSetup) : null,
    JSON.stringify(payload.flySnapshots),
    payload.notes ?? null,
    segmentId
  );
};

export const listSessionSegments = async (userId: number): Promise<SessionSegment[]> => {
  if (isWeb) {
    return listWebRows<SessionSegment>(WEB_SEGMENTS_KEY).filter((segment) => segment.userId === userId);
  }

  const db = await getDb();
  const rows = await db.getAllAsync<any>('SELECT * FROM session_segments WHERE user_id = ? ORDER BY started_at DESC', userId);
  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    sessionId: row.session_id,
    mode: row.session_mode ?? 'practice',
    riverName: row.river_name ?? undefined,
    waterType: row.water_type,
    depthRange: row.depth_range,
    startedAt: row.started_at,
    endedAt: row.ended_at ?? undefined,
    rigSetup: row.rig_setup_json ? JSON.parse(row.rig_setup_json) : undefined,
    flySnapshots: row.fly_snapshots_json ? JSON.parse(row.fly_snapshots_json) : [],
    notes: row.notes ?? undefined
  }));
};

export const deleteSessionSegmentsForUser = async (userId: number): Promise<void> => {
  if (isWeb) {
    deleteWebRows<SessionSegment>(WEB_SEGMENTS_KEY, (row) => row.userId === userId);
    return;
  }

  const db = await getDb();
  await db.runAsync('DELETE FROM session_segments WHERE user_id = ?', userId);
};

export const deleteSessionSegmentsForSessions = async (sessionIds: number[]): Promise<void> => {
  if (!sessionIds.length) return;

  if (isWeb) {
    deleteWebRows<SessionSegment>(WEB_SEGMENTS_KEY, (row) => sessionIds.includes(row.sessionId));
    return;
  }

  const db = await getDb();
  const placeholders = sessionIds.map(() => '?').join(', ');
  await db.runAsync(`DELETE FROM session_segments WHERE session_id IN (${placeholders})`, ...sessionIds);
};
