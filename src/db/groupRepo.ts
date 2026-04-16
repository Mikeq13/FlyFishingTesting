import { Group, GroupMembership, SharePreference } from '@/types/group';
import { getDb, isWeb } from './schema';
import { deleteWebRows, insertWebRow, listWebRows, updateWebRows } from './webStore';

const WEB_GROUPS_KEY = 'fishing_lab.groups';
const WEB_GROUPS_ID_KEY = 'fishing_lab.groups.nextId';
const WEB_MEMBERSHIPS_KEY = 'fishing_lab.group_memberships';
const WEB_MEMBERSHIPS_ID_KEY = 'fishing_lab.group_memberships.nextId';
const WEB_SHARE_PREFS_KEY = 'fishing_lab.share_preferences';
const WEB_SHARE_PREFS_ID_KEY = 'fishing_lab.share_preferences.nextId';

const createJoinCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

export const createGroup = async (payload: Omit<Group, 'id' | 'createdAt' | 'joinCode'>): Promise<Group> => {
  const createdAt = new Date().toISOString();
  const nextPayload = {
    ...payload,
    joinCode: createJoinCode(),
    createdAt
  };

  let id: number;
  if (isWeb) {
    id = insertWebRow<Group>(WEB_GROUPS_KEY, WEB_GROUPS_ID_KEY, nextPayload);
  } else {
    const db = await getDb();
    const result = await db.runAsync(
      `INSERT INTO groups (name, join_code, created_by_user_id, created_at) VALUES (?, ?, ?, ?)`,
      nextPayload.name,
      nextPayload.joinCode,
      nextPayload.createdByUserId,
      createdAt
    );
    id = result.lastInsertRowId;
  }

  return { id, ...nextPayload };
};

export const listGroups = async (): Promise<Group[]> => {
  if (isWeb) {
    return listWebRows<Group>(WEB_GROUPS_KEY);
  }

  const db = await getDb();
  const rows = await db.getAllAsync<any>('SELECT * FROM groups ORDER BY created_at DESC');
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    joinCode: row.join_code,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at
  }));
};

export const createGroupMembership = async (payload: Omit<GroupMembership, 'id' | 'joinedAt'>): Promise<GroupMembership> => {
  const joinedAt = new Date().toISOString();
  const nextPayload = { ...payload, joinedAt };
  let id: number;

  if (isWeb) {
    id = insertWebRow<GroupMembership>(WEB_MEMBERSHIPS_KEY, WEB_MEMBERSHIPS_ID_KEY, nextPayload);
  } else {
    const db = await getDb();
    const result = await db.runAsync(
      `INSERT INTO group_memberships (group_id, user_id, membership_role, joined_at) VALUES (?, ?, ?, ?)`,
      nextPayload.groupId,
      nextPayload.userId,
      nextPayload.role,
      joinedAt
    );
    id = result.lastInsertRowId;
  }

  return { id, ...nextPayload };
};

export const listGroupMemberships = async (): Promise<GroupMembership[]> => {
  if (isWeb) {
    return listWebRows<GroupMembership>(WEB_MEMBERSHIPS_KEY);
  }

  const db = await getDb();
  const rows = await db.getAllAsync<any>('SELECT * FROM group_memberships ORDER BY joined_at DESC');
  return rows.map((row) => ({
    id: row.id,
    groupId: row.group_id,
    userId: row.user_id,
    role: row.membership_role,
    joinedAt: row.joined_at
  }));
};

export const createSharePreference = async (
  payload: Omit<SharePreference, 'id' | 'updatedAt'>
): Promise<SharePreference> => {
  const updatedAt = new Date().toISOString();
  const nextPayload = { ...payload, updatedAt };
  let id: number;

  if (isWeb) {
    id = insertWebRow<SharePreference>(WEB_SHARE_PREFS_KEY, WEB_SHARE_PREFS_ID_KEY, nextPayload);
  } else {
    const db = await getDb();
    const result = await db.runAsync(
      `INSERT INTO share_preferences (user_id, group_id, share_journal_entries, share_practice_sessions, share_competition_sessions, share_insights, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      nextPayload.userId,
      nextPayload.groupId,
      nextPayload.shareJournalEntries ? 1 : 0,
      nextPayload.sharePracticeSessions ? 1 : 0,
      nextPayload.shareCompetitionSessions ? 1 : 0,
      nextPayload.shareInsights ? 1 : 0,
      updatedAt
    );
    id = result.lastInsertRowId;
  }

  return { id, ...nextPayload };
};

export const listSharePreferences = async (): Promise<SharePreference[]> => {
  if (isWeb) {
    return listWebRows<SharePreference>(WEB_SHARE_PREFS_KEY);
  }

  const db = await getDb();
  const rows = await db.getAllAsync<any>('SELECT * FROM share_preferences ORDER BY updated_at DESC');
  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    groupId: row.group_id,
    shareJournalEntries: !!row.share_journal_entries,
    sharePracticeSessions: !!row.share_practice_sessions,
    shareCompetitionSessions: !!row.share_competition_sessions,
    shareInsights: !!row.share_insights,
    updatedAt: row.updated_at
  }));
};

export const upsertSharePreference = async (
  payload: Omit<SharePreference, 'id' | 'updatedAt'>
): Promise<void> => {
  const updatedAt = new Date().toISOString();

  if (isWeb) {
    const current = listWebRows<SharePreference>(WEB_SHARE_PREFS_KEY);
    const existing = current.find((item) => item.userId === payload.userId && item.groupId === payload.groupId);
    if (existing) {
      updateWebRows<SharePreference>(WEB_SHARE_PREFS_KEY, (rows) =>
        rows.map((row) =>
          row.id === existing.id
            ? {
                ...row,
                ...payload,
                updatedAt
              }
            : row
        )
      );
    } else {
      insertWebRow<SharePreference>(WEB_SHARE_PREFS_KEY, WEB_SHARE_PREFS_ID_KEY, { ...payload, updatedAt });
    }
    return;
  }

  const db = await getDb();
  const rows = await db.getAllAsync<{ id: number }>(
    'SELECT id FROM share_preferences WHERE user_id = ? AND group_id = ? LIMIT 1',
    payload.userId,
    payload.groupId
  );
  const existingId = rows[0]?.id;

  if (existingId) {
    await db.runAsync(
      `UPDATE share_preferences
       SET share_journal_entries = ?, share_practice_sessions = ?, share_competition_sessions = ?, share_insights = ?, updated_at = ?
       WHERE id = ?`,
      payload.shareJournalEntries ? 1 : 0,
      payload.sharePracticeSessions ? 1 : 0,
      payload.shareCompetitionSessions ? 1 : 0,
      payload.shareInsights ? 1 : 0,
      updatedAt,
      existingId
    );
    return;
  }

  await createSharePreference(payload);
};

export const deleteGroupsForUser = async (userId: number): Promise<void> => {
  const groups = await listGroups();
  const ownedGroupIds = groups.filter((group) => group.createdByUserId === userId).map((group) => group.id);

  if (isWeb) {
    deleteWebRows<Group>(WEB_GROUPS_KEY, (row) => ownedGroupIds.includes(row.id));
    deleteWebRows<GroupMembership>(WEB_MEMBERSHIPS_KEY, (row) => row.userId === userId || ownedGroupIds.includes(row.groupId));
    deleteWebRows<SharePreference>(WEB_SHARE_PREFS_KEY, (row) => row.userId === userId || ownedGroupIds.includes(row.groupId));
    return;
  }

  const db = await getDb();
  await db.runAsync('DELETE FROM share_preferences WHERE user_id = ?', userId);
  await db.runAsync('DELETE FROM group_memberships WHERE user_id = ?', userId);
  if (ownedGroupIds.length) {
    for (const groupId of ownedGroupIds) {
      await db.runAsync('DELETE FROM share_preferences WHERE group_id = ?', groupId);
      await db.runAsync('DELETE FROM group_memberships WHERE group_id = ?', groupId);
      await db.runAsync('DELETE FROM groups WHERE id = ?', groupId);
    }
  }
};
