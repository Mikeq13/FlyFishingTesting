import { SavedFly } from '@/types/fly';
import { getDb, isWeb } from './schema';
import { deleteWebRows, insertWebRow, listWebRows, updateWebRows } from './webStore';
import { dedupeSavedFliesByIdentity, getSavedFlyIdentityKey, normalizeIdentityName } from '@/utils/dataIdentity';

const WEB_SAVED_FLIES_KEY = 'fishing_lab.saved_flies';
const WEB_SAVED_FLIES_ID_KEY = 'fishing_lab.saved_flies.nextId';

export const createSavedFly = async (payload: Omit<SavedFly, 'id' | 'createdAt'>): Promise<number> => {
  return (await ensureSavedFly(payload)).id;
};

export const ensureSavedFly = async (
  payload: Omit<SavedFly, 'id' | 'createdAt'>
): Promise<{ id: number; created: boolean }> => {
  const nextPayload = {
    ...payload,
    name: payload.name.trim(),
    createdAt: new Date().toISOString()
  };
  const normalizedName = normalizeIdentityName(nextPayload.name);

  if (isWeb) {
    const existing = listWebRows<SavedFly>(WEB_SAVED_FLIES_KEY).find(
      (fly) => getSavedFlyIdentityKey(fly) === `${payload.userId}:${normalizedName}`
    );
    if (existing) {
      return { id: existing.id, created: false };
    }
    return {
      id: insertWebRow<SavedFly>(WEB_SAVED_FLIES_KEY, WEB_SAVED_FLIES_ID_KEY, nextPayload),
      created: true
    };
  }

  const db = await getDb();
  const [existing] = await db.getAllAsync<{ id: number }>(
    `SELECT id FROM saved_flies WHERE user_id = ? AND normalized_name = ? ORDER BY id DESC LIMIT 1`,
    payload.userId,
    normalizedName
  );
  if (existing) {
    return { id: existing.id, created: false };
  }
  const result = await db.runAsync(
    `INSERT INTO saved_flies (user_id, name, normalized_name, intent, hook_size, bead_size_mm, bead_color, body_type, bug_family, bug_stage, tail, collar, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    payload.userId,
    nextPayload.name,
    normalizedName,
    payload.intent,
    payload.hookSize,
    payload.beadSizeMm,
    payload.beadColor,
    payload.bodyType,
    payload.bugFamily,
    payload.bugStage,
    payload.tail,
    payload.collar,
    nextPayload.createdAt
  );
  return { id: result.lastInsertRowId, created: true };
};

export const listSavedFlies = async (userId: number): Promise<SavedFly[]> => {
  if (isWeb) {
    const rows = listWebRows<SavedFly>(WEB_SAVED_FLIES_KEY)
      .filter((fly) => fly.userId === userId)
      .map((fly) => ({
        ...fly,
        hookSize: fly.hookSize ?? 16,
        beadColor: fly.beadColor ?? 'black',
        bugFamily: fly.bugFamily ?? 'mayfly',
        bugStage: fly.bugStage ?? 'nymph',
        tail: fly.tail ?? 'natural'
      }));
    const dedupedRows = dedupeSavedFliesByIdentity(rows);
    if (dedupedRows.length !== rows.length) {
      updateWebRows<SavedFly>(WEB_SAVED_FLIES_KEY, (currentRows) =>
        dedupeSavedFliesByIdentity(
          currentRows.map((fly) => ({
            ...fly,
            hookSize: fly.hookSize ?? 16,
            beadColor: fly.beadColor ?? 'black',
            bugFamily: fly.bugFamily ?? 'mayfly',
            bugStage: fly.bugStage ?? 'nymph',
            tail: fly.tail ?? 'natural'
          }))
        )
      );
    }
    return dedupedRows;
  }

  const db = await getDb();
  const rows = await db.getAllAsync<any>('SELECT * FROM saved_flies WHERE user_id = ? ORDER BY created_at DESC', userId);
  const flies = rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    name: row.name,
    intent: row.intent,
    hookSize: row.hook_size ?? 16,
    beadSizeMm: row.bead_size_mm,
    beadColor: row.bead_color ?? 'black',
    bodyType: row.body_type,
    bugFamily: row.bug_family ?? 'mayfly',
    bugStage: row.bug_stage ?? 'nymph',
    tail: row.tail ?? 'natural',
    collar: row.collar,
    createdAt: row.created_at
  }));
  const dedupedFlies = dedupeSavedFliesByIdentity(flies);
  if (dedupedFlies.length !== flies.length) {
    const keepIds = new Set(dedupedFlies.map((fly) => fly.id));
    const duplicateIds = flies.filter((fly) => !keepIds.has(fly.id)).map((fly) => fly.id);
    if (duplicateIds.length) {
      const placeholders = duplicateIds.map(() => '?').join(', ');
      await db.runAsync(`DELETE FROM saved_flies WHERE id IN (${placeholders})`, ...duplicateIds);
    }
  }
  return dedupedFlies;
};

export const deleteSavedFliesForUser = async (userId: number): Promise<void> => {
  if (isWeb) {
    deleteWebRows<SavedFly>(WEB_SAVED_FLIES_KEY, (row) => row.userId === userId);
    return;
  }

  const db = await getDb();
  await db.runAsync('DELETE FROM saved_flies WHERE user_id = ?', userId);
};
