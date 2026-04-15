import { SavedFly } from '@/types/fly';
import { getDb, isWeb } from './schema';
import { deleteWebRows, insertWebRow, listWebRows } from './webStore';

const WEB_SAVED_FLIES_KEY = 'fishing_lab.saved_flies';
const WEB_SAVED_FLIES_ID_KEY = 'fishing_lab.saved_flies.nextId';

export const createSavedFly = async (payload: Omit<SavedFly, 'id' | 'createdAt'>): Promise<number> => {
  const nextPayload = {
    ...payload,
    createdAt: new Date().toISOString()
  };

  if (isWeb) {
    return insertWebRow<SavedFly>(WEB_SAVED_FLIES_KEY, WEB_SAVED_FLIES_ID_KEY, nextPayload);
  }

  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO saved_flies (user_id, name, intent, hook_size, bead_size_mm, body_type, bug_family, bug_stage, tail, collar, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    payload.userId,
    payload.name,
    payload.intent,
    payload.hookSize,
    payload.beadSizeMm,
    payload.bodyType,
    payload.bugFamily,
    payload.bugStage,
    payload.tail,
    payload.collar,
    nextPayload.createdAt
  );
  return result.lastInsertRowId;
};

export const listSavedFlies = async (userId: number): Promise<SavedFly[]> => {
  if (isWeb) {
    return listWebRows<SavedFly>(WEB_SAVED_FLIES_KEY).filter((fly) => fly.userId === userId);
  }

  const db = await getDb();
  const rows = await db.getAllAsync<any>('SELECT * FROM saved_flies WHERE user_id = ? ORDER BY created_at DESC', userId);
  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    name: row.name,
    intent: row.intent,
    hookSize: row.hook_size ?? 16,
    beadSizeMm: row.bead_size_mm,
    bodyType: row.body_type,
    bugFamily: row.bug_family ?? 'mayfly',
    bugStage: row.bug_stage ?? 'nymph',
    tail: row.tail ?? 'natural',
    collar: row.collar,
    createdAt: row.created_at
  }));
};

export const deleteSavedFliesForUser = async (userId: number): Promise<void> => {
  if (isWeb) {
    deleteWebRows<SavedFly>(WEB_SAVED_FLIES_KEY, (row) => row.userId === userId);
    return;
  }

  const db = await getDb();
  await db.runAsync('DELETE FROM saved_flies WHERE user_id = ?', userId);
};
