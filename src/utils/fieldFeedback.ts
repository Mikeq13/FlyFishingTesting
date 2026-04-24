import { SyncStatusSnapshot } from '@/types/remote';
import { getSyncTrustFeedback } from '@/utils/syncFeedback';
import { SharedDataStatus } from '@/types/appState';

export type FieldFeedbackTone = 'success' | 'warning' | 'info';

export interface FieldFeedback {
  tone: FieldFeedbackTone;
  text: string;
}

export const buildFieldActionFeedback = ({
  action,
  hasRemoteSession,
  sharedDataStatus,
  syncStatus,
  entityLabel
}: {
  action: string;
  hasRemoteSession: boolean;
  sharedDataStatus: SharedDataStatus;
  syncStatus: SyncStatusSnapshot;
  entityLabel: string;
}): FieldFeedback => {
  const syncTrust = getSyncTrustFeedback({
    hasRemoteSession,
    sharedDataStatus,
    syncStatus,
    scope: entityLabel === 'experiment' ? 'experiment' : entityLabel === 'competition' ? 'competition' : 'practice',
    entityLabel
  });

  if (syncTrust) {
    return {
      tone: syncTrust.tone,
      text: `${action}. ${syncTrust.text}`
    };
  }

  return {
    tone: 'success',
    text: `${action}. Saved locally and ready for relaunch.`
  };
};
