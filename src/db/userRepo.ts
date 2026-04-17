import { getDb, isWeb } from './schema';
import { AccessLevel, SubscriptionStatus, UserProfile, UserRole } from '@/types/user';
import { deleteWebRows, insertWebRow, listWebRows, updateWebRows } from './webStore';

const WEB_USERS_KEY = 'fishing_lab.users';
const WEB_USERS_ID_KEY = 'fishing_lab.users.nextId';

type CreateUserInput = {
  name: string;
  email?: string | null;
  remoteAuthId?: string | null;
  emailVerifiedAt?: string | null;
  ownerLinkedEmail?: string | null;
  ownerLinkedAuthId?: string | null;
  role?: UserRole;
  accessLevel?: AccessLevel;
  subscriptionStatus?: SubscriptionStatus;
  trialStartedAt?: string | null;
  trialEndsAt?: string | null;
  subscriptionExpiresAt?: string | null;
  grantedByUserId?: number | null;
};

type UpdateUserInput = Partial<Omit<UserProfile, 'id' | 'createdAt'>>;

const mapUserRow = (row: any, index: number): UserProfile => {
  const role = (row.role ?? (index === 0 ? 'owner' : 'angler')) as UserRole;
  const accessLevel = (row.access_level ?? row.accessLevel ?? (role === 'owner' ? 'power_user' : 'free')) as AccessLevel;
  const subscriptionStatus = (row.subscription_status ?? row.subscriptionStatus ?? (role === 'owner' ? 'power_user' : 'not_started')) as SubscriptionStatus;

  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at ?? row.createdAt,
    email: row.email ?? null,
    remoteAuthId: row.remote_auth_id ?? row.remoteAuthId ?? null,
    emailVerifiedAt: row.email_verified_at ?? row.emailVerifiedAt ?? null,
    ownerLinkedEmail: row.owner_linked_email ?? row.ownerLinkedEmail ?? null,
    ownerLinkedAuthId: row.owner_linked_auth_id ?? row.ownerLinkedAuthId ?? null,
    role,
    accessLevel,
    subscriptionStatus,
    trialStartedAt: row.trial_started_at ?? row.trialStartedAt ?? null,
    trialEndsAt: row.trial_ends_at ?? row.trialEndsAt ?? null,
    subscriptionExpiresAt: row.subscription_expires_at ?? row.subscriptionExpiresAt ?? null,
    grantedByUserId: row.granted_by_user_id ?? row.grantedByUserId ?? null
  };
};

export const createUser = async (input: string | CreateUserInput): Promise<number> => {
  const payload = typeof input === 'string' ? { name: input } : input;
  const role = payload.role ?? 'angler';
  const accessLevel = payload.accessLevel ?? (role === 'owner' ? 'power_user' : 'free');
  const subscriptionStatus = payload.subscriptionStatus ?? (role === 'owner' ? 'power_user' : 'not_started');

  if (isWeb) {
    return insertWebRow<UserProfile>(
      WEB_USERS_KEY,
      WEB_USERS_ID_KEY,
      {
        name: payload.name,
        createdAt: new Date().toISOString(),
        email: payload.email ?? null,
        remoteAuthId: payload.remoteAuthId ?? null,
        emailVerifiedAt: payload.emailVerifiedAt ?? null,
        ownerLinkedEmail: payload.ownerLinkedEmail ?? null,
        ownerLinkedAuthId: payload.ownerLinkedAuthId ?? null,
        role,
        accessLevel,
        subscriptionStatus,
        trialStartedAt: payload.trialStartedAt ?? null,
        trialEndsAt: payload.trialEndsAt ?? null,
        subscriptionExpiresAt: payload.subscriptionExpiresAt ?? null,
        grantedByUserId: payload.grantedByUserId ?? null
      },
      { prepend: false }
    );
  }

  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO users (name, created_at, email, remote_auth_id, email_verified_at, owner_linked_email, owner_linked_auth_id, role, access_level, subscription_status, trial_started_at, trial_ends_at, subscription_expires_at, granted_by_user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    payload.name,
    new Date().toISOString(),
    payload.email ?? null,
    payload.remoteAuthId ?? null,
    payload.emailVerifiedAt ?? null,
    payload.ownerLinkedEmail ?? null,
    payload.ownerLinkedAuthId ?? null,
    role,
    accessLevel,
    subscriptionStatus,
    payload.trialStartedAt ?? null,
    payload.trialEndsAt ?? null,
    payload.subscriptionExpiresAt ?? null,
    payload.grantedByUserId ?? null
  );
  return result.lastInsertRowId;
};

export const listUsers = async (): Promise<UserProfile[]> => {
  if (isWeb) return listWebRows<any>(WEB_USERS_KEY).map(mapUserRow);
  const db = await getDb();
  const rows = await db.getAllAsync<any>('SELECT * FROM users ORDER BY id ASC');
  return rows.map(mapUserRow);
};

export const updateUser = async (id: number, updates: UpdateUserInput): Promise<void> => {
  if (isWeb) {
    updateWebRows<UserProfile>(WEB_USERS_KEY, (rows) =>
      rows.map((row) =>
        row.id === id
          ? {
              ...row,
              ...updates
            }
          : row
      )
    );
    return;
  }

  const db = await getDb();
  const assignments: string[] = [];
  const args: unknown[] = [];

  if (updates.name !== undefined) {
    assignments.push('name = ?');
    args.push(updates.name);
  }
  if (updates.email !== undefined) {
    assignments.push('email = ?');
    args.push(updates.email);
  }
  if (updates.remoteAuthId !== undefined) {
    assignments.push('remote_auth_id = ?');
    args.push(updates.remoteAuthId);
  }
  if (updates.emailVerifiedAt !== undefined) {
    assignments.push('email_verified_at = ?');
    args.push(updates.emailVerifiedAt);
  }
  if (updates.ownerLinkedEmail !== undefined) {
    assignments.push('owner_linked_email = ?');
    args.push(updates.ownerLinkedEmail);
  }
  if (updates.ownerLinkedAuthId !== undefined) {
    assignments.push('owner_linked_auth_id = ?');
    args.push(updates.ownerLinkedAuthId);
  }
  if (updates.role !== undefined) {
    assignments.push('role = ?');
    args.push(updates.role);
  }
  if (updates.accessLevel !== undefined) {
    assignments.push('access_level = ?');
    args.push(updates.accessLevel);
  }
  if (updates.subscriptionStatus !== undefined) {
    assignments.push('subscription_status = ?');
    args.push(updates.subscriptionStatus);
  }
  if (updates.trialStartedAt !== undefined) {
    assignments.push('trial_started_at = ?');
    args.push(updates.trialStartedAt);
  }
  if (updates.trialEndsAt !== undefined) {
    assignments.push('trial_ends_at = ?');
    args.push(updates.trialEndsAt);
  }
  if (updates.subscriptionExpiresAt !== undefined) {
    assignments.push('subscription_expires_at = ?');
    args.push(updates.subscriptionExpiresAt);
  }
  if (updates.grantedByUserId !== undefined) {
    assignments.push('granted_by_user_id = ?');
    args.push(updates.grantedByUserId);
  }

  if (!assignments.length) return;

  await db.runAsync(`UPDATE users SET ${assignments.join(', ')} WHERE id = ?`, ...args, id);
};

export const deleteUser = async (id: number): Promise<void> => {
  if (isWeb) {
    deleteWebRows<UserProfile>(WEB_USERS_KEY, (row) => row.id === id);
    return;
  }

  const db = await getDb();
  await db.runAsync('DELETE FROM users WHERE id = ?', id);
};
