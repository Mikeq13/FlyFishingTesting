import { SyncEntityType, SyncMetadataEntry } from '@/types/remote';
import { getDb, isWeb } from './schema';
import { deleteWebRows, insertWebRow, listWebRows, updateWebRows } from './webStore';

const WEB_SYNC_METADATA_KEY = 'fishing_lab.sync_metadata';
const WEB_SYNC_METADATA_ID_KEY = 'fishing_lab.sync_metadata.nextId';

export const listSyncMetadataEntries = async (): Promise<SyncMetadataEntry[]> => {
  if (isWeb) {
    return listWebRows<SyncMetadataEntry>(WEB_SYNC_METADATA_KEY);
  }

  const db = await getDb();
  const rows = await db.getAllAsync<any>('SELECT * FROM sync_metadata ORDER BY entity_type, local_record_id');
  return rows.map((row) => ({
    id: row.id,
    entityType: row.entity_type,
    localRecordId: row.local_record_id,
    remoteRecordId: row.remote_record_id ?? null,
    lastSyncedAt: row.last_synced_at ?? null,
    pendingImport: !!row.pending_import
  }));
};

export const upsertSyncMetadataEntry = async (
  payload: Omit<SyncMetadataEntry, 'id'>
): Promise<SyncMetadataEntry> => {
  if (isWeb) {
    const existing = listWebRows<SyncMetadataEntry>(WEB_SYNC_METADATA_KEY).find(
      (entry) => entry.entityType === payload.entityType && entry.localRecordId === payload.localRecordId
    );
    if (existing) {
      updateWebRows<SyncMetadataEntry>(WEB_SYNC_METADATA_KEY, (rows) =>
        rows.map((row) =>
          row.id === existing.id
            ? {
                ...row,
                ...payload
              }
            : row
        )
      );
      return { id: existing.id, ...payload };
    }
    const id = insertWebRow<SyncMetadataEntry>(WEB_SYNC_METADATA_KEY, WEB_SYNC_METADATA_ID_KEY, payload);
    return { id, ...payload };
  }

  const db = await getDb();
  const existingRows = await db.getAllAsync<{ id: number }>(
    `SELECT id FROM sync_metadata WHERE entity_type = ? AND local_record_id = ? LIMIT 1`,
    payload.entityType,
    payload.localRecordId
  );
  const existing = existingRows[0];
  if (existing) {
    await db.runAsync(
      `UPDATE sync_metadata
       SET remote_record_id = ?, last_synced_at = ?, pending_import = ?
       WHERE id = ?`,
      payload.remoteRecordId ?? null,
      payload.lastSyncedAt ?? null,
      payload.pendingImport ? 1 : 0,
      existing.id
    );
    return { id: existing.id, ...payload };
  }

  const result = await db.runAsync(
    `INSERT INTO sync_metadata (entity_type, local_record_id, remote_record_id, last_synced_at, pending_import)
     VALUES (?, ?, ?, ?, ?)`,
    payload.entityType,
    payload.localRecordId,
    payload.remoteRecordId ?? null,
    payload.lastSyncedAt ?? null,
    payload.pendingImport ? 1 : 0
  );
  return { id: result.lastInsertRowId, ...payload };
};

export const getSyncMetadataEntry = async (
  entityType: SyncEntityType,
  localRecordId: number
): Promise<SyncMetadataEntry | null> => {
  const entries = await listSyncMetadataEntries();
  return entries.find((entry) => entry.entityType === entityType && entry.localRecordId === localRecordId) ?? null;
};

export const deleteSyncMetadataEntry = async (
  entityType: SyncEntityType,
  localRecordId: number
): Promise<void> => {
  if (isWeb) {
    deleteWebRows<SyncMetadataEntry>(
      WEB_SYNC_METADATA_KEY,
      (row) => row.entityType === entityType && row.localRecordId === localRecordId
    );
    return;
  }

  const db = await getDb();
  await db.runAsync('DELETE FROM sync_metadata WHERE entity_type = ? AND local_record_id = ?', entityType, localRecordId);
};

export const deleteAllSyncMetadataEntries = async (): Promise<void> => {
  if (isWeb) {
    deleteWebRows<SyncMetadataEntry>(WEB_SYNC_METADATA_KEY, () => true);
    return;
  }

  const db = await getDb();
  await db.runAsync('DELETE FROM sync_metadata');
};
