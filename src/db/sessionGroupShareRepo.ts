import { getDb, isWeb } from './schema';
import { SessionGroupShare } from '@/types/session';
import { deleteWebRows, insertWebRow, listWebRows, updateWebRows } from './webStore';
import { dedupeSessionGroupSharesByIdentity, getSessionGroupShareIdentityKey } from '@/utils/dataIdentity';

const WEB_SESSION_GROUP_SHARES_KEY = 'fishing_lab.session_group_shares';
const WEB_SESSION_GROUP_SHARES_ID_KEY = 'fishing_lab.session_group_shares.nextId';

export const listSessionGroupShares = async (): Promise<SessionGroupShare[]> => {
  if (isWeb) {
    const rows = listWebRows<SessionGroupShare>(WEB_SESSION_GROUP_SHARES_KEY);
    const dedupedRows = dedupeSessionGroupSharesByIdentity(rows);
    if (dedupedRows.length !== rows.length) {
      updateWebRows<SessionGroupShare>(WEB_SESSION_GROUP_SHARES_KEY, (currentRows) =>
        dedupeSessionGroupSharesByIdentity(currentRows)
      );
    }
    return dedupedRows;
  }

  const db = await getDb();
  const rows = await db.getAllAsync<any>('SELECT * FROM session_group_shares ORDER BY id ASC');
  const shares = rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    sessionId: row.session_id,
    groupId: row.group_id,
    createdAt: row.created_at
  }));
  const dedupedShares = dedupeSessionGroupSharesByIdentity(shares);
  if (dedupedShares.length !== shares.length) {
    const keepIds = new Set(dedupedShares.map((share) => share.id));
    const duplicateIds = shares.filter((share) => !keepIds.has(share.id)).map((share) => share.id);
    if (duplicateIds.length) {
      const placeholders = duplicateIds.map(() => '?').join(', ');
      await db.runAsync(`DELETE FROM session_group_shares WHERE id IN (${placeholders})`, ...duplicateIds);
    }
  }
  return dedupedShares;
};

export const createSessionGroupShare = async (
  payload: Omit<SessionGroupShare, 'id' | 'createdAt'>
): Promise<SessionGroupShare> => {
  const createdAt = new Date().toISOString();

  if (isWeb) {
    const existing = listWebRows<SessionGroupShare>(WEB_SESSION_GROUP_SHARES_KEY).find(
      (share) => getSessionGroupShareIdentityKey(share) === getSessionGroupShareIdentityKey(payload)
    );
    if (existing) {
      return existing;
    }
    const id = insertWebRow<SessionGroupShare>(WEB_SESSION_GROUP_SHARES_KEY, WEB_SESSION_GROUP_SHARES_ID_KEY, {
      ...payload,
      createdAt
    });
    return {
      id,
      ...payload,
      createdAt
    };
  }

  const db = await getDb();
  const [existing] = await db.getAllAsync<any>(
    `SELECT * FROM session_group_shares WHERE user_id = ? AND session_id = ? AND group_id = ? ORDER BY id DESC LIMIT 1`,
    payload.userId,
    payload.sessionId,
    payload.groupId
  );
  if (existing) {
    return {
      id: existing.id,
      userId: existing.user_id,
      sessionId: existing.session_id,
      groupId: existing.group_id,
      createdAt: existing.created_at
    };
  }
  const result = await db.runAsync(
    `INSERT INTO session_group_shares (user_id, session_id, group_id, created_at)
     VALUES (?, ?, ?, ?)`,
    payload.userId,
    payload.sessionId,
    payload.groupId,
    createdAt
  );

  return {
    id: result.lastInsertRowId,
    ...payload,
    createdAt
  };
};

export const deleteSessionGroupShares = async (shareIds: number[]): Promise<void> => {
  if (!shareIds.length) return;

  if (isWeb) {
    deleteWebRows<SessionGroupShare>(WEB_SESSION_GROUP_SHARES_KEY, (row) => shareIds.includes(row.id));
    return;
  }

  const db = await getDb();
  const placeholders = shareIds.map(() => '?').join(', ');
  await db.runAsync(`DELETE FROM session_group_shares WHERE id IN (${placeholders})`, ...shareIds);
};

export const deleteSessionGroupSharesForSession = async (sessionId: number): Promise<void> => {
  if (isWeb) {
    deleteWebRows<SessionGroupShare>(WEB_SESSION_GROUP_SHARES_KEY, (row) => row.sessionId === sessionId);
    return;
  }

  const db = await getDb();
  await db.runAsync('DELETE FROM session_group_shares WHERE session_id = ?', sessionId);
};

export const deleteSessionGroupSharesForSessions = async (sessionIds: number[]): Promise<void> => {
  if (!sessionIds.length) return;

  if (isWeb) {
    deleteWebRows<SessionGroupShare>(WEB_SESSION_GROUP_SHARES_KEY, (row) => sessionIds.includes(row.sessionId));
    return;
  }

  const db = await getDb();
  const placeholders = sessionIds.map(() => '?').join(', ');
  await db.runAsync(`DELETE FROM session_group_shares WHERE session_id IN (${placeholders})`, ...sessionIds);
};

export const deleteSessionGroupSharesForGroup = async (groupId: number): Promise<void> => {
  if (isWeb) {
    deleteWebRows<SessionGroupShare>(WEB_SESSION_GROUP_SHARES_KEY, (row) => row.groupId === groupId);
    return;
  }

  const db = await getDb();
  await db.runAsync('DELETE FROM session_group_shares WHERE group_id = ?', groupId);
};

export const deleteSessionGroupSharesForUser = async (userId: number): Promise<void> => {
  if (isWeb) {
    deleteWebRows<SessionGroupShare>(WEB_SESSION_GROUP_SHARES_KEY, (row) => row.userId === userId);
    return;
  }

  const db = await getDb();
  await db.runAsync('DELETE FROM session_group_shares WHERE user_id = ?', userId);
};
