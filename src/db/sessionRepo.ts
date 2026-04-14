import { getDb, isWeb } from './schema';
import { Session } from '@/types/session';

let memSessions: Session[] = [];
let memId = 1;

export const createSession = async (payload: Omit<Session, 'id'>): Promise<number> => {
  if (isWeb) {
    const id = memId++;
    memSessions.unshift({ id, ...payload });
    return id;
  }

  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO sessions (user_id, date, water_type, depth_range, insect_type, insect_stage, insect_confidence, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    payload.userId,
    payload.date,
    payload.waterType,
    payload.depthRange,
    payload.insectType,
    payload.insectStage,
    payload.insectConfidence,
    payload.notes ?? null
  );
  return result.lastInsertRowId;
};

export const listSessions = async (userId: number): Promise<Session[]> => {
  if (isWeb) return memSessions.filter((s) => s.userId === userId);

  const db = await getDb();
  const rows = await db.getAllAsync<any>('SELECT * FROM sessions WHERE user_id = ? ORDER BY date DESC', userId);
  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    date: r.date,
    waterType: r.water_type,
    depthRange: r.depth_range,
    insectType: r.insect_type,
    insectStage: r.insect_stage,
    insectConfidence: r.insect_confidence,
    notes: r.notes ?? undefined
  }));
};
