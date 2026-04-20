import { SavedRiver } from '@/types/session';
import { getDb, isWeb } from './schema';
import { deleteWebRows, insertWebRow, listWebRows, updateWebRows } from './webStore';
import { dedupeSavedRiversByIdentity, getSavedRiverIdentityKey, normalizeIdentityName } from '@/utils/dataIdentity';

const WEB_SAVED_RIVERS_KEY = 'fishing_lab.saved_rivers';
const WEB_SAVED_RIVERS_ID_KEY = 'fishing_lab.saved_rivers.nextId';

export const createSavedRiver = async (payload: Omit<SavedRiver, 'id' | 'createdAt'>): Promise<number> => {
  return (await ensureSavedRiver(payload)).id;
};

export const ensureSavedRiver = async (
  payload: Omit<SavedRiver, 'id' | 'createdAt'>
): Promise<{ id: number; created: boolean }> => {
  const nextPayload = {
    ...payload,
    name: payload.name.trim(),
    createdAt: new Date().toISOString()
  };
  const normalizedName = normalizeIdentityName(nextPayload.name);

  if (isWeb) {
    const existing = listWebRows<SavedRiver>(WEB_SAVED_RIVERS_KEY).find(
      (river) => getSavedRiverIdentityKey(river) === `${payload.userId}:${normalizedName}`
    );
    if (existing) {
      return { id: existing.id, created: false };
    }
    return {
      id: insertWebRow<SavedRiver>(WEB_SAVED_RIVERS_KEY, WEB_SAVED_RIVERS_ID_KEY, nextPayload),
      created: true
    };
  }

  const db = await getDb();
  const [row] = await db.getAllAsync<{ id: number }>(
    `SELECT id FROM saved_rivers WHERE user_id = ? AND normalized_name = ? ORDER BY id DESC LIMIT 1`,
    payload.userId,
    normalizedName
  );
  if (row) {
    return { id: row.id, created: false };
  }
  const result = await db.runAsync(
    `INSERT INTO saved_rivers (user_id, name, normalized_name, created_at) VALUES (?, ?, ?, ?)`,
    payload.userId,
    nextPayload.name,
    normalizedName,
    nextPayload.createdAt
  );
  return {
    id: result.lastInsertRowId,
    created: true
  };
};

export const listSavedRivers = async (userId: number): Promise<SavedRiver[]> => {
  if (isWeb) {
    const rows = listWebRows<SavedRiver>(WEB_SAVED_RIVERS_KEY).filter((river) => river.userId === userId);
    const dedupedRows = dedupeSavedRiversByIdentity(rows);
    if (dedupedRows.length !== rows.length) {
      updateWebRows<SavedRiver>(WEB_SAVED_RIVERS_KEY, (currentRows) => dedupeSavedRiversByIdentity(currentRows));
    }
    return dedupedRows;
  }

  const db = await getDb();
  const rows = await db.getAllAsync<any>('SELECT * FROM saved_rivers WHERE user_id = ? ORDER BY created_at DESC', userId);
  const rivers = rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    name: row.name,
    createdAt: row.created_at
  }));
  const dedupedRivers = dedupeSavedRiversByIdentity(rivers);
  if (dedupedRivers.length !== rivers.length) {
    const keepIds = new Set(dedupedRivers.map((river) => river.id));
    const duplicateIds = rivers.filter((river) => !keepIds.has(river.id)).map((river) => river.id);
    if (duplicateIds.length) {
      const placeholders = duplicateIds.map(() => '?').join(', ');
      await db.runAsync(`DELETE FROM saved_rivers WHERE id IN (${placeholders})`, ...duplicateIds);
    }
  }
  return dedupedRivers;
};

export const deleteSavedRiversForUser = async (userId: number): Promise<void> => {
  if (isWeb) {
    deleteWebRows<SavedRiver>(WEB_SAVED_RIVERS_KEY, (row) => row.userId === userId);
    return;
  }

  const db = await getDb();
  await db.runAsync('DELETE FROM saved_rivers WHERE user_id = ?', userId);
};
