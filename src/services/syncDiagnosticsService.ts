import { SyncFailureCategory, SyncFailureSummary, SyncQueueEntry } from '@/types/remote';

const normalizeMessage = (message?: string | null) => (message ?? '').trim().toLowerCase();

export const classifySyncFailureCategory = (message?: string | null): SyncFailureCategory => {
  const normalized = normalizeMessage(message);

  if (!normalized) return 'unknown';
  if (
    normalized.includes('schema') ||
    normalized.includes('migration') ||
    normalized.includes('column ') ||
    normalized.includes('remote schema is out of date') ||
    normalized.includes('policy fix') ||
    normalized.includes('42p') ||
    normalized.includes('42703') ||
    normalized.includes('pgrst205')
  ) {
    return 'schema';
  }
  if (
    normalized.includes('sign in') ||
    normalized.includes('signed in') ||
    normalized.includes('token') ||
    normalized.includes('session') ||
    normalized.includes('jwt') ||
    normalized.includes('auth')
  ) {
    return 'auth';
  }
  if (
    normalized.includes('permission') ||
    normalized.includes('not allowed') ||
    normalized.includes('forbidden') ||
    normalized.includes('row-level security') ||
    normalized.includes('rls') ||
    normalized.includes('42501')
  ) {
    return 'permission';
  }
  if (
    normalized.includes('temporarily unavailable') ||
    normalized.includes('timeout') ||
    normalized.includes('network') ||
    normalized.includes('fetch') ||
    normalized.includes('bad gateway') ||
    normalized.includes('502') ||
    normalized.includes('offline')
  ) {
    return 'transient';
  }
  return 'unknown';
};

export const summarizeSyncFailures = (syncQueue: SyncQueueEntry[]): SyncFailureSummary[] =>
  syncQueue
    .filter((entry) => entry.status === 'failed')
    .slice()
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .map((entry) => ({
      queueEntryId: entry.id,
      entityType: entry.entityType,
      operation: entry.operation,
      recordId: entry.recordId ?? null,
      category: classifySyncFailureCategory(entry.errorMessage),
      message: entry.errorMessage ?? 'Unknown sync failure.',
      createdAt: entry.createdAt
    }));

export const describeSyncFailureCategory = (category: SyncFailureCategory) => {
  switch (category) {
    case 'schema':
      return 'Schema / config';
    case 'auth':
      return 'Auth';
    case 'permission':
      return 'Permission';
    case 'transient':
      return 'Transient backend';
    default:
      return 'Unknown';
  }
};
