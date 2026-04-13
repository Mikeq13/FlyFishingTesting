import { getDb } from './schema';
import { Session } from '@/types/session';

export const createSession = async (payload: Omit<Session, 'id'>): Promise<number> => {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO sessions (date, water_type, depth_range, insect_type, insect_stage, insect_confidence, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
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

export const listSessions = async (): Promise<Session[]> => {
  const db = await getDb();
  const rows = await db.getAllAsync<any>('SELECT * FROM sessions ORDER BY date DESC');
  return rows.map((r) => ({
    id: r.id,
    date: r.date,
    waterType: r.water_type,
    depthRange: r.depth_range,
    insectType: r.insect_type,
    insectStage: r.insect_stage,
    insectConfidence: r.insect_confidence,
    notes: r.notes ?? undefined
  }));
};
