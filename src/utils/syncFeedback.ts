import { SyncStatusSnapshot } from '@/types/remote';

type SyncFeedbackScope = 'practice' | 'experiment' | 'competition' | 'insights' | 'local_data';

const TEMPORARY_OUTAGE_MESSAGES: Record<SyncFeedbackScope, string> = {
  practice: 'Shared beta backend is temporarily unavailable right now. Your practice changes are still safe on this device.',
  experiment: 'Shared beta backend is temporarily unavailable right now. Your experiment changes are still safe on this device.',
  competition: 'Shared beta backend is temporarily unavailable right now. Your competition changes are still safe on this device.',
  insights: 'Shared insights are temporarily unavailable right now. Your local insight history is still safe.',
  local_data: 'Shared beta backend is temporarily unavailable right now. Your local data is still safe, and cloud sync should recover once the service is back.'
};

export const formatSharedBackendError = (error: unknown, scope: SyncFeedbackScope): string => {
  if (error == null) {
    return TEMPORARY_OUTAGE_MESSAGES[scope];
  }
  const rawMessage = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Please try again.';
  const normalized = rawMessage.toLowerCase();
  if (
    normalized.includes('502 bad gateway') ||
    normalized.includes('bad gateway') ||
    normalized.includes('<!doctype html') ||
    normalized.includes('<html')
  ) {
    return TEMPORARY_OUTAGE_MESSAGES[scope];
  }
  return rawMessage;
};

export const getPendingSyncFeedback = (
  syncStatus: SyncStatusSnapshot,
  scope: Exclude<SyncFeedbackScope, 'local_data'>,
  entityLabel: string
): string | null => {
  if (syncStatus.lastError) {
    return `Saved locally. ${formatSharedBackendError(syncStatus.lastError, scope)}`;
  }
  if (syncStatus.state === 'syncing' || syncStatus.pendingCount > 0) {
    return `Saved locally. Syncing the latest ${entityLabel} changes to the shared backend now.`;
  }
  return null;
};
