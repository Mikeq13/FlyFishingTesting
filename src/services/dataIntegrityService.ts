import { getExperimentEntries } from '@/utils/experimentEntries';
import { Experiment, ExperimentStatus } from '@/types/experiment';
import { Group, GroupMembership, SharePreference } from '@/types/group';
import { Session } from '@/types/session';
import { IntegritySummary } from '@/types/dataIntegrity';
import { SyncCleanupState } from '@/types/remote';

export interface SessionIntegrityActivity {
  experimentCount?: number;
  catchCount?: number;
}

const hasMeaningfulExperimentData = (experiment: Experiment) => {
  const entries = getExperimentEntries(experiment);
  const totalCasts = entries.reduce((sum, entry) => sum + entry.casts, 0);
  const totalCatches = entries.reduce((sum, entry) => sum + entry.catches, 0);
  const hasFishLog = entries.some((entry) => entry.fishSizesInches.length || entry.fishSpecies.length || entry.catchTimestamps.length);

  return totalCasts > 0 || totalCatches > 0 || hasFishLog;
};

export const normalizeLegacyExperimentStatus = (experiment: Experiment): ExperimentStatus =>
  hasMeaningfulExperimentData(experiment) ? 'complete' : 'draft';

export const classifySessionIntegrity = (
  session: Session,
  cleanupState: SyncCleanupState = 'active',
  activity: SessionIntegrityActivity = {}
): IntegritySummary => {
  if (cleanupState === 'failed_cleanup') {
    return {
      state: 'failed_cleanup',
      label: 'Cleanup Failed',
      analyticsEligible: false,
      reason: 'This session is waiting for another cleanup retry.'
    };
  }

  if (cleanupState === 'pending_delete') {
    return {
      state: 'pending_delete',
      label: 'Pending Delete',
      analyticsEligible: false,
      reason: 'This session is hidden while delete sync finishes.'
    };
  }

  if (!session.date || Number.isNaN(new Date(session.date).getTime()) || !session.waterType || !session.depthRange) {
    return {
      state: 'incomplete',
      label: 'Incomplete',
      analyticsEligible: false,
      reason: 'This session is missing core context needed for trusted analytics.'
    };
  }

  const experimentCount = activity.experimentCount ?? 0;
  const catchCount = activity.catchCount ?? 0;
  if (experimentCount < 1 && catchCount < 1) {
    return {
      state: 'incomplete',
      label: 'Incomplete',
      analyticsEligible: false,
      reason: 'This session has setup details, but no catches or experiments were logged yet.'
    };
  }

  if (!session.riverName?.trim() || session.legacyContextMissing) {
    return {
      state: 'legacy_unreviewed',
      label: 'Legacy',
      analyticsEligible: false,
      reason: 'This older session is missing river context, so it stays out of analytics by default.'
    };
  }

  return {
    state: 'valid',
    label: 'Valid',
    analyticsEligible: true
  };
};

export const classifyExperimentIntegrity = (
  experiment: Experiment,
  session: Session | undefined,
  cleanupState: SyncCleanupState = 'active'
): IntegritySummary => {
  if (cleanupState === 'failed_cleanup') {
    return {
      state: 'failed_cleanup',
      label: 'Cleanup Failed',
      analyticsEligible: false,
      reason: 'This experiment is waiting for another cleanup retry.'
    };
  }

  if (cleanupState === 'pending_delete') {
    return {
      state: 'pending_delete',
      label: 'Pending Delete',
      analyticsEligible: false,
      reason: 'This experiment is hidden while delete sync finishes.'
    };
  }

  if (experiment.archivedAt) {
    return {
      state: 'archived',
      label: 'Archived',
      analyticsEligible: false,
      reason: 'Archived experiments stay out of normal analytics.'
    };
  }

  if (!session) {
    return {
      state: 'orphaned',
      label: 'Orphaned',
      analyticsEligible: false,
      reason: 'This experiment no longer has a valid parent session.'
    };
  }

  const sessionIntegrity = classifySessionIntegrity(session, 'active', { experimentCount: 1 });
  if (sessionIntegrity.state !== 'valid') {
    return {
      state: sessionIntegrity.state,
      label: sessionIntegrity.label,
      analyticsEligible: false,
      reason: sessionIntegrity.reason
    };
  }

  if (experiment.status === 'draft') {
    return {
      state: 'incomplete',
      label: 'Draft',
      analyticsEligible: false,
      reason: 'Incomplete experiments stay manageable but do not count toward insights.'
    };
  }

  if (experiment.legacyStatusMissing) {
    return {
      state: 'legacy_unreviewed',
      label: 'Legacy',
      analyticsEligible: false,
      reason: 'This experiment was repaired from older data and stays out of analytics until reviewed.'
    };
  }

  return {
    state: 'valid',
    label: 'Complete',
    analyticsEligible: true
  };
};

export const classifyGroupIntegrity = ({
  group,
  membership,
  sharePreference,
  currentUserId,
  cleanupState = 'active'
}: {
  group?: Group;
  membership?: GroupMembership;
  sharePreference?: SharePreference;
  currentUserId: number;
  cleanupState?: SyncCleanupState;
}): IntegritySummary => {
  if (cleanupState === 'failed_cleanup') {
    return {
      state: 'failed_cleanup',
      label: 'Cleanup Failed',
      analyticsEligible: false,
      reason: 'This group is hidden while shared cleanup retries.'
    };
  }

  if (cleanupState === 'pending_delete') {
    return {
      state: 'pending_delete',
      label: 'Pending Delete',
      analyticsEligible: false,
      reason: 'This group is hidden while delete sync finishes.'
    };
  }

  if (!group && !membership && !sharePreference) {
    return {
      state: 'orphaned',
      label: 'Missing',
      analyticsEligible: false,
      reason: 'This group record could not be found.'
    };
  }

  if (!group) {
    return {
      state: 'orphaned',
      label: 'Problem',
      analyticsEligible: false,
      reason: 'This group lost its backing group record, so it stays out of normal shared views.'
    };
  }

  if (group.createdByUserId === currentUserId && group.id < 0) {
    return {
      state: 'legacy_unreviewed',
      label: 'Problem',
      analyticsEligible: false,
      reason: 'This older group is missing its local backing record, so it should be reviewed before use.'
    };
  }

  if (membership?.userId === currentUserId && membership.id < 0) {
    return {
      state: 'legacy_unreviewed',
      label: 'Problem',
      analyticsEligible: false,
      reason: 'This shared-group access record is stale and should be detached or deleted.'
    };
  }

  return {
    state: 'valid',
    label: membership?.role === 'organizer' ? 'Organizer' : 'Member',
    analyticsEligible: true
  };
};
