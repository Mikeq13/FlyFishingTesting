import { SyncStatusSnapshot } from '@/types/remote';
import { SharedDataStatus } from '@/types/appState';

type SyncFeedbackScope = 'practice' | 'experiment' | 'competition' | 'insights' | 'local_data';
type SyncTrustTone = 'success' | 'warning' | 'info';

const TEMPORARY_OUTAGE_MESSAGES: Record<SyncFeedbackScope, string> = {
  practice: 'Shared backend unavailable. Practice changes are saved locally on this device.',
  experiment: 'Shared backend unavailable. Experiment changes are saved locally on this device.',
  competition: 'Shared backend unavailable. Competition changes are saved locally on this device.',
  insights: 'Shared backend unavailable. Local insight history is still available on this device.',
  local_data: 'Shared backend unavailable. Local data is still safe, and sync should recover when the service is back.'
};

const STRUCTURAL_FIX_MESSAGE = 'Migration or policy fix needed before shared beta sync can be trusted.';

const hasStructuralSyncFailure = (syncStatus: SyncStatusSnapshot) =>
  syncStatus.failureSummaries.some((failure) => failure.category === 'schema' || failure.category === 'permission');

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
  if (hasStructuralSyncFailure(syncStatus)) {
    return `Saved locally. ${STRUCTURAL_FIX_MESSAGE}`;
  }
  if (syncStatus.lastError) {
    return `Saved locally. ${formatSharedBackendError(syncStatus.lastError, scope)}`;
  }
  if (syncStatus.state === 'syncing' || syncStatus.pendingCount > 0) {
    return `Saved locally. Syncing to shared backend for latest ${entityLabel} changes.`;
  }
  return null;
};

export const getPendingSyncFeedbackTone = (syncStatus: SyncStatusSnapshot): SyncTrustTone =>
  syncStatus.lastError || hasStructuralSyncFailure(syncStatus) ? 'warning' : 'info';

export const getSyncTrustFeedback = ({
  hasRemoteSession,
  sharedDataStatus,
  syncStatus,
  scope,
  entityLabel = 'journal'
}: {
  hasRemoteSession: boolean;
  sharedDataStatus: SharedDataStatus;
  syncStatus: SyncStatusSnapshot;
  scope: SyncFeedbackScope;
  entityLabel?: string;
}): { tone: SyncTrustTone; text: string } | null => {
  if (!hasRemoteSession) {
    return {
      tone: 'info',
      text: `Saved locally. Sign in to sync this ${entityLabel} to shared beta data.`
    };
  }

  if (hasStructuralSyncFailure(syncStatus)) {
    return {
      tone: 'warning',
      text: `Saved locally. ${STRUCTURAL_FIX_MESSAGE}`
    };
  }

  if (syncStatus.lastError || sharedDataStatus === 'error') {
    return {
      tone: 'warning',
      text: `Saved locally. ${formatSharedBackendError(syncStatus.lastError, scope)}`
    };
  }

  if (syncStatus.state === 'syncing' || syncStatus.pendingCount > 0 || sharedDataStatus === 'loading') {
    return {
      tone: 'info',
      text: `Saved locally. Syncing to shared backend for latest ${entityLabel} changes.`
    };
  }

  if (sharedDataStatus === 'ready' && syncStatus.state === 'idle') {
    return {
      tone: 'success',
      text: `Saved locally. Shared backend ready; latest ${entityLabel} data should survive refresh and relaunch.`
    };
  }

  return null;
};
