import { SyncQueueEntry, SyncQueueStatus } from '@/types/remote';
import { getDb, isWeb } from './schema';
import { deleteWebRows, insertWebRow, listWebRows, updateWebRows } from './webStore';

const WEB_SYNC_QUEUE_KEY = 'fishing_lab.sync_queue';
const WEB_SYNC_QUEUE_ID_KEY = 'fishing_lab.sync_queue.nextId';

export const createSyncQueueEntry = async (
  payload: Omit<SyncQueueEntry, 'id' | 'createdAt' | 'status' | 'syncedAt' | 'errorMessage'>
): Promise<SyncQueueEntry> => {
  const nextPayload = {
    ...payload,
    createdAt: new Date().toISOString(),
    status: 'pending' as SyncQueueStatus,
    syncedAt: null,
    errorMessage: null
  };

  if (isWeb) {
    const id = insertWebRow<SyncQueueEntry>(WEB_SYNC_QUEUE_KEY, WEB_SYNC_QUEUE_ID_KEY, nextPayload);
    return { id, ...nextPayload };
  }

  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO sync_queue (entity_type, operation, record_id, payload_json, status, created_at, synced_at, error_message)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    nextPayload.entityType,
    nextPayload.operation,
    nextPayload.recordId ?? null,
    nextPayload.payloadJson,
    nextPayload.status,
    nextPayload.createdAt,
    null,
    null
  );
  return { id: result.lastInsertRowId, ...nextPayload };
};

export const listSyncQueueEntries = async (): Promise<SyncQueueEntry[]> => {
  if (isWeb) {
    return listWebRows<SyncQueueEntry>(WEB_SYNC_QUEUE_KEY);
  }

  const db = await getDb();
  const rows = await db.getAllAsync<any>('SELECT * FROM sync_queue ORDER BY created_at DESC');
  return rows.map((row) => ({
    id: row.id,
    entityType: row.entity_type,
    operation: row.operation,
    recordId: row.record_id ?? null,
    payloadJson: row.payload_json,
    status: row.status,
    createdAt: row.created_at,
    syncedAt: row.synced_at ?? null,
    errorMessage: row.error_message ?? null
  }));
};

export const updateSyncQueueEntry = async (
  entryId: number,
  updates: Partial<Omit<SyncQueueEntry, 'id' | 'entityType' | 'operation' | 'recordId' | 'payloadJson' | 'createdAt'>>
): Promise<void> => {
  if (isWeb) {
    updateWebRows<SyncQueueEntry>(WEB_SYNC_QUEUE_KEY, (rows) =>
      rows.map((row) => (row.id === entryId ? { ...row, ...updates } : row))
    );
    return;
  }

  const db = await getDb();
  const assignments: string[] = [];
  const args: unknown[] = [];
  if (updates.status !== undefined) {
    assignments.push('status = ?');
    args.push(updates.status);
  }
  if (updates.syncedAt !== undefined) {
    assignments.push('synced_at = ?');
    args.push(updates.syncedAt);
  }
  if (updates.errorMessage !== undefined) {
    assignments.push('error_message = ?');
    args.push(updates.errorMessage);
  }
  if (!assignments.length) return;
  await db.runAsync(`UPDATE sync_queue SET ${assignments.join(', ')} WHERE id = ?`, ...args, entryId);
};

export const markAllPendingSyncEntriesAsSynced = async (): Promise<void> => {
  const syncedAt = new Date().toISOString();
  if (isWeb) {
    updateWebRows<SyncQueueEntry>(WEB_SYNC_QUEUE_KEY, (rows) =>
      rows.map((row) =>
        row.status === 'pending' ? { ...row, status: 'synced', syncedAt, errorMessage: null } : row
      )
    );
    return;
  }

  const db = await getDb();
  await db.runAsync(
    `UPDATE sync_queue SET status = 'synced', synced_at = ?, error_message = NULL WHERE status = 'pending'`,
    syncedAt
  );
};

export const deleteSyncQueueEntriesForUserReset = async (): Promise<void> => {
  if (isWeb) {
    deleteWebRows<SyncQueueEntry>(WEB_SYNC_QUEUE_KEY, () => true);
    return;
  }

  const db = await getDb();
  await db.runAsync('DELETE FROM sync_queue');
};
