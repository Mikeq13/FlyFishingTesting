import { Invite, SponsoredAccess } from '@/types/remote';
import { getDb, isWeb } from './schema';
import { deleteWebRows, insertWebRow, listWebRows, updateWebRows } from './webStore';

const WEB_INVITES_KEY = 'fishing_lab.invites';
const WEB_INVITES_ID_KEY = 'fishing_lab.invites.nextId';
const WEB_SPONSORED_ACCESS_KEY = 'fishing_lab.sponsored_access';
const WEB_SPONSORED_ACCESS_ID_KEY = 'fishing_lab.sponsored_access.nextId';

const createInviteCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

export const createInvite = async (
  payload: Omit<Invite, 'id' | 'inviteCode' | 'status' | 'createdAt' | 'acceptedByUserId' | 'acceptedAt' | 'revokedAt'>
): Promise<Invite> => {
  const nextPayload = {
    ...payload,
    inviteCode: createInviteCode(),
    status: 'pending' as const,
    createdAt: new Date().toISOString(),
    acceptedByUserId: null,
    acceptedAt: null,
    revokedAt: null
  };

  if (isWeb) {
    const id = insertWebRow<Invite>(WEB_INVITES_KEY, WEB_INVITES_ID_KEY, nextPayload);
    return { id, ...nextPayload };
  }

  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO invites (inviter_user_id, target_group_id, invite_code, target_name, grant_type, status, created_at, accepted_by_user_id, accepted_at, revoked_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    nextPayload.inviterUserId,
    nextPayload.targetGroupId,
    nextPayload.inviteCode,
    nextPayload.targetName ?? null,
    nextPayload.grantType,
    nextPayload.status,
    nextPayload.createdAt,
    null,
    null,
    null
  );
  return { id: result.lastInsertRowId, ...nextPayload };
};

export const listInvites = async (): Promise<Invite[]> => {
  if (isWeb) {
    return listWebRows<Invite>(WEB_INVITES_KEY);
  }

  const db = await getDb();
  const rows = await db.getAllAsync<any>('SELECT * FROM invites ORDER BY created_at DESC');
  return rows.map((row) => ({
    id: row.id,
    inviterUserId: row.inviter_user_id,
    targetGroupId: row.target_group_id,
    inviteCode: row.invite_code,
    targetName: row.target_name ?? null,
    grantType: row.grant_type,
    status: row.status,
    createdAt: row.created_at,
    acceptedByUserId: row.accepted_by_user_id ?? null,
    acceptedAt: row.accepted_at ?? null,
    revokedAt: row.revoked_at ?? null
  }));
};

export const updateInvite = async (
  inviteId: number,
  updates: Partial<Omit<Invite, 'id' | 'inviterUserId' | 'targetGroupId' | 'inviteCode' | 'grantType' | 'createdAt'>>
): Promise<void> => {
  if (isWeb) {
    updateWebRows<Invite>(WEB_INVITES_KEY, (rows) =>
      rows.map((row) => (row.id === inviteId ? { ...row, ...updates } : row))
    );
    return;
  }

  const db = await getDb();
  const assignments: string[] = [];
  const args: unknown[] = [];

  if (updates.targetName !== undefined) {
    assignments.push('target_name = ?');
    args.push(updates.targetName);
  }
  if (updates.status !== undefined) {
    assignments.push('status = ?');
    args.push(updates.status);
  }
  if (updates.acceptedByUserId !== undefined) {
    assignments.push('accepted_by_user_id = ?');
    args.push(updates.acceptedByUserId);
  }
  if (updates.acceptedAt !== undefined) {
    assignments.push('accepted_at = ?');
    args.push(updates.acceptedAt);
  }
  if (updates.revokedAt !== undefined) {
    assignments.push('revoked_at = ?');
    args.push(updates.revokedAt);
  }

  if (!assignments.length) return;
  await db.runAsync(`UPDATE invites SET ${assignments.join(', ')} WHERE id = ?`, ...args, inviteId);
};

export const createSponsoredAccess = async (
  payload: Omit<SponsoredAccess, 'id' | 'createdAt' | 'revokedAt'>
): Promise<SponsoredAccess> => {
  const nextPayload = {
    ...payload,
    createdAt: new Date().toISOString(),
    revokedAt: null
  };

  if (isWeb) {
    const id = insertWebRow<SponsoredAccess>(
      WEB_SPONSORED_ACCESS_KEY,
      WEB_SPONSORED_ACCESS_ID_KEY,
      nextPayload
    );
    return { id, ...nextPayload };
  }

  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO sponsored_access (sponsor_user_id, sponsored_user_id, target_group_id, granted_access_level, active, created_at, revoked_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    nextPayload.sponsorUserId,
    nextPayload.sponsoredUserId,
    nextPayload.targetGroupId,
    nextPayload.grantedAccessLevel,
    nextPayload.active ? 1 : 0,
    nextPayload.createdAt,
    null
  );
  return { id: result.lastInsertRowId, ...nextPayload };
};

export const listSponsoredAccess = async (): Promise<SponsoredAccess[]> => {
  if (isWeb) {
    return listWebRows<SponsoredAccess>(WEB_SPONSORED_ACCESS_KEY);
  }

  const db = await getDb();
  const rows = await db.getAllAsync<any>('SELECT * FROM sponsored_access ORDER BY created_at DESC');
  return rows.map((row) => ({
    id: row.id,
    sponsorUserId: row.sponsor_user_id,
    sponsoredUserId: row.sponsored_user_id,
    targetGroupId: row.target_group_id,
    grantedAccessLevel: row.granted_access_level,
    active: !!row.active,
    createdAt: row.created_at,
    revokedAt: row.revoked_at ?? null
  }));
};

export const updateSponsoredAccess = async (
  accessId: number,
  updates: Partial<Omit<SponsoredAccess, 'id' | 'sponsorUserId' | 'sponsoredUserId' | 'targetGroupId' | 'grantedAccessLevel' | 'createdAt'>>
): Promise<void> => {
  if (isWeb) {
    updateWebRows<SponsoredAccess>(WEB_SPONSORED_ACCESS_KEY, (rows) =>
      rows.map((row) => (row.id === accessId ? { ...row, ...updates } : row))
    );
    return;
  }

  const db = await getDb();
  const assignments: string[] = [];
  const args: unknown[] = [];

  if (updates.active !== undefined) {
    assignments.push('active = ?');
    args.push(updates.active ? 1 : 0);
  }
  if (updates.revokedAt !== undefined) {
    assignments.push('revoked_at = ?');
    args.push(updates.revokedAt);
  }

  if (!assignments.length) return;
  await db.runAsync(`UPDATE sponsored_access SET ${assignments.join(', ')} WHERE id = ?`, ...args, accessId);
};

export const deleteAccessRecordsForUser = async (userId: number): Promise<void> => {
  if (isWeb) {
    deleteWebRows<Invite>(WEB_INVITES_KEY, (row) => row.inviterUserId === userId || row.acceptedByUserId === userId);
    deleteWebRows<SponsoredAccess>(WEB_SPONSORED_ACCESS_KEY, (row) => row.sponsorUserId === userId || row.sponsoredUserId === userId);
    return;
  }

  const db = await getDb();
  await db.runAsync('DELETE FROM invites WHERE inviter_user_id = ? OR accepted_by_user_id = ?', userId, userId);
  await db.runAsync('DELETE FROM sponsored_access WHERE sponsor_user_id = ? OR sponsored_user_id = ?', userId, userId);
};

export const deleteAccessRecordsForGroup = async (groupId: number): Promise<void> => {
  if (isWeb) {
    deleteWebRows<Invite>(WEB_INVITES_KEY, (row) => row.targetGroupId === groupId);
    deleteWebRows<SponsoredAccess>(WEB_SPONSORED_ACCESS_KEY, (row) => row.targetGroupId === groupId);
    return;
  }

  const db = await getDb();
  await db.runAsync('DELETE FROM invites WHERE target_group_id = ?', groupId);
  await db.runAsync('DELETE FROM sponsored_access WHERE target_group_id = ?', groupId);
};
