import { SavedRiver } from '@/types/session';
import { getDb, isWeb } from './schema';
import { deleteWebRows, insertWebRow, listWebRows } from './webStore';

const WEB_SAVED_RIVERS_KEY = 'fishing_lab.saved_rivers';
const WEB_SAVED_RIVERS_ID_KEY = 'fishing_lab.saved_rivers.nextId';

export const createSavedRiver = async (payload: Omit<SavedRiver, 'id' | 'createdAt'>): Promise<number> => {
  const nextPayload = {
    ...payload,
    createdAt: new Date().toISOString()
  };

  if (isWeb) {
    return insertWebRow<SavedRiver>(WEB_SAVED_RIVERS_KEY, WEB_SAVED_RIVERS_ID_KEY, nextPayload);
  }

  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO saved_rivers (user_id, name, created_at) VALUES (?, ?, ?)`,
    payload.userId,
    payload.name,
    nextPayload.createdAt
  );
  return result.lastInsertRowId;
};

export const listSavedRivers = async (userId: number): Promise<SavedRiver[]> => {
  if (isWeb) {
    return listWebRows<SavedRiver>(WEB_SAVED_RIVERS_KEY).filter((river) => river.userId === userId);
  }

  const db = await getDb();
  const rows = await db.getAllAsync<any>('SELECT * FROM saved_rivers WHERE user_id = ? ORDER BY created_at DESC', userId);
  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    name: row.name,
    createdAt: row.created_at
  }));
};

export const deleteSavedRiversForUser = async (userId: number): Promise<void> => {
  if (isWeb) {
    deleteWebRows<SavedRiver>(WEB_SAVED_RIVERS_KEY, (row) => row.userId === userId);
    return;
  }

  const db = await getDb();
  await db.runAsync('DELETE FROM saved_rivers WHERE user_id = ?', userId);
};
