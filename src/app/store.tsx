import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { Experiment, Insight } from '@/types/experiment';
import { SavedRiver, Session, SessionGroupShare } from '@/types/session';
import { UserProfile } from '@/types/user';
import { SavedFly } from '@/types/fly';
import { CatchEvent, SessionSegment } from '@/types/activity';
import {
  Competition,
  CompetitionGroup,
  CompetitionParticipant,
  CompetitionSession,
  CompetitionSessionAssignment,
  Group,
  GroupMembership,
  SharePreference
} from '@/types/group';
import { LeaderFormula, RigPreset } from '@/types/rig';
import { createUser, updateUser } from '@/db/userRepo';
import { getAppSetting, setActiveUserId as saveActiveUserId, setAppSetting } from '@/db/settingsRepo';
import { buildAggregates } from '@/engine/aggregationEngine';
import { generateAnglerComparisons } from '@/engine/anglerComparisonEngine';
import { createTrialWindow, getEntitlementLabel, hasPremiumAccess } from '@/engine/entitlementEngine';
import { generateInsights } from '@/engine/insightEngine';
import { buildTopFlyInsights, buildTopFlyRecords, TopFlyRecord } from '@/engine/topFlyEngine';
import { AccessLevel, SubscriptionStatus } from '@/types/user';
import { AuthStatus, BackendDiagnosticsSnapshot, CleanupSyncStatus, EnvConfigDiagnostics, Invite, MfaFactorSummary, PendingTotpEnrollment, RemoteSchemaDiagnostics, RemoteSessionSnapshot, SponsoredAccess, SyncCleanupState, SyncQueueEntry, SyncStatusSnapshot } from '@/types/remote';
import {
  bootstrapLocalApp,
  enqueueLocalSyncChange,
  loadLocalAppData,
  resetLocalWebDemoData,
} from '@/services/localAppDataService';
import { bootstrapAuthSession, getMfaAssuranceLevel, listMfaFactors, subscribeToAuthChanges } from '@/services/authService';
import { hasSupabaseConfig } from '@/services/supabaseClient';
import { syncQueueToSupabase } from '@/services/syncService';
import { fetchRemoteAccessSnapshot } from '@/services/remoteAccessService';
import { fetchRemoteSharedDataSnapshot } from '@/services/remoteSharedDataService';
import { verifyRemoteSchemaCompatibility } from '@/services/remoteCompatibilityService';
import { createStoreActions } from '@/app/storeActions';
import { AppStore, UserDataCleanupCategory } from '@/app/storeTypes';
import { NotificationPermissionStatus, SharedDataStatus } from '@/types/appState';
import { getNotificationPermissionStatus } from '@/utils/sessionNotifications';
import { classifyExperimentIntegrity, classifyGroupIntegrity, classifySessionIntegrity } from '@/services/dataIntegrityService';
import { IntegritySummary } from '@/types/dataIntegrity';
import { upsertSyncMetadataEntry } from '@/db/syncMetadataRepo';
import { applySessionShareIds } from '@/utils/sessionSharing';
import { formatSharedBackendError } from '@/utils/syncFeedback';
import {
  dedupeDraftExperimentsByIdentity,
  dedupeSavedFliesByIdentity,
  dedupeSavedLeaderFormulasByIdentity,
  dedupeSavedRigPresetsByIdentity,
  dedupeSavedRiversByIdentity,
  dedupeSessionGroupSharesByIdentity
} from '@/utils/dataIdentity';
import { summarizeSyncFailures } from '@/services/syncDiagnosticsService';
import { isWebDemoModeEnabled } from '@/services/webDemoService';

export type { UserDataCleanupCategory };

const Ctx = createContext<AppStore | null>(null);
const OWNER_ACCOUNT_EMAIL = '13jmmq@gmail.com';
const STRUCTURAL_BACKEND_ERROR_CODES = new Set(['42P17', 'PGRST205', 'PGRST116']);

const getErrorCode = (error: unknown): string | null => {
  if (!error || typeof error !== 'object' || !('code' in error)) return null;
  return typeof (error as { code?: unknown }).code === 'string' ? ((error as { code: string }).code) : null;
};

const getErrorMessage = (error: unknown): string => {
  const rawMessage =
    error instanceof Error
      ? error.message
      : error && typeof error === 'object' && 'message' in error && typeof (error as { message?: unknown }).message === 'string'
        ? (error as { message: string }).message
        : null;

  if (rawMessage) {
    return formatSharedBackendError(rawMessage, 'local_data');
  }
  return 'Unable to reach the shared beta backend right now.';
};

const isStructuralBackendError = (error: unknown) => {
  const code = getErrorCode(error);
  return code ? STRUCTURAL_BACKEND_ERROR_CODES.has(code) : false;
};

const isMissingRemoteTableError = (error: unknown, tableName: string) =>
  getErrorCode(error) === 'PGRST205' && getErrorMessage(error).includes(`table 'public.${tableName}'`);

const toStructuralBackendMessage = (error: unknown) =>
  isMissingRemoteTableError(error, 'session_group_shares')
    ? 'Shared beta backend needs the session group sharing migration before multi-group sync can continue.'
    : `Shared beta backend needs a schema or policy fix before cloud sync can continue. ${getErrorMessage(error)}`;

const normalizeRuntimeIssue = (label: string, error: unknown) => {
  if (!error || typeof error !== 'object') {
    return error;
  }

  const message = getErrorMessage(error);
  const normalizedMessage = formatSharedBackendError(message, 'local_data');

  if (normalizedMessage !== message) {
    return {
      code: getErrorCode(error) ?? null,
      message: normalizedMessage
    };
  }

  return {
    code: getErrorCode(error) ?? null,
    message
  };
};

const reportRuntimeIssue = (label: string, error: unknown) => {
  if (__DEV__) {
    console.info(`[runtime-trust] ${label}`, normalizeRuntimeIssue(label, error));
  }
};

export const AppStoreProvider = ({ children }: { children: React.ReactNode }) => {
  const isWebDemoMode = isWebDemoModeEnabled();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [allSessions, setAllSessions] = useState<Session[]>([]);
  const [sessionGroupShares, setSessionGroupShares] = useState<SessionGroupShare[]>([]);
  const [sessionSegments, setSessionSegments] = useState<SessionSegment[]>([]);
  const [catchEvents, setCatchEvents] = useState<CatchEvent[]>([]);
  const [allCatchEvents, setAllCatchEvents] = useState<CatchEvent[]>([]);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [allExperiments, setAllExperiments] = useState<Experiment[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [savedFlies, setSavedFlies] = useState<SavedFly[]>([]);
  const [savedLeaderFormulas, setSavedLeaderFormulas] = useState<LeaderFormula[]>([]);
  const [savedRigPresets, setSavedRigPresets] = useState<RigPreset[]>([]);
  const [savedRivers, setSavedRivers] = useState<SavedRiver[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupMemberships, setGroupMemberships] = useState<GroupMembership[]>([]);
  const [sharePreferences, setSharePreferences] = useState<SharePreference[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [competitionGroups, setCompetitionGroups] = useState<CompetitionGroup[]>([]);
  const [competitionSessions, setCompetitionSessions] = useState<CompetitionSession[]>([]);
  const [competitionParticipants, setCompetitionParticipants] = useState<CompetitionParticipant[]>([]);
  const [competitionAssignments, setCompetitionAssignments] = useState<CompetitionSessionAssignment[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [sponsoredAccess, setSponsoredAccess] = useState<SponsoredAccess[]>([]);
  const [syncQueue, setSyncQueue] = useState<SyncQueueEntry[]>([]);
  const [authStatus, setAuthStatus] = useState<AuthStatus>(isWebDemoMode ? 'unauthenticated' : hasSupabaseConfig ? 'authenticating' : 'unauthenticated');
  const [remoteSession, setRemoteSession] = useState<RemoteSessionSnapshot | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [localBootstrapReady, setLocalBootstrapReady] = useState(false);
  const [remoteBootstrapState, setRemoteBootstrapState] = useState<'idle' | 'resolving_local' | 'loading_remote' | 'ready' | 'degraded'>('idle');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const [sharedDataStatus, setSharedDataStatus] = useState<SharedDataStatus>('idle');
  const [notificationPermissionStatus, setNotificationPermissionStatus] = useState<NotificationPermissionStatus>('unknown');
  const [activeUserId, setActiveUserId] = useState<number | null>(null);
  const [remoteBackendBlocked, setRemoteBackendBlocked] = useState(false);
  const [remoteSchemaDiagnostics, setRemoteSchemaDiagnostics] = useState<RemoteSchemaDiagnostics>({
    status: 'idle',
    checkedAt: null,
    message: null,
    checks: []
  });
  const [mfaFactors, setMfaFactors] = useState<MfaFactorSummary[]>([]);
  const [pendingTotpEnrollment, setPendingTotpEnrollment] = useState<PendingTotpEnrollment | null>(null);
  const [mfaAssuranceLevel, setMfaAssuranceLevel] = useState<'aal1' | 'aal2' | 'unknown'>('unknown');
  const importSeededRef = useRef<string | null>(null);
  const sessionMap = useMemo(() => new Map(sessions.map((session) => [session.id, session])), [sessions]);
  const normalizeEmail = (value?: string | null) => value?.trim().toLowerCase() ?? null;
  const currentUser = useMemo(() => users.find((user) => user.id === activeUserId) ?? null, [activeUserId, users]);
  const storedOwnerUser = useMemo(() => users.find((user) => user.role === 'owner') ?? null, [users]);
  const ownerUser = useMemo(() => storedOwnerUser, [storedOwnerUser]);
  const isSyncEnabled = !isWebDemoMode && hasSupabaseConfig && !!remoteSession;
  const ownerIdentityLinked = Boolean(ownerUser?.ownerLinkedAuthId || ownerUser?.ownerLinkedEmail);
  const isAuthenticatedOwner = Boolean(
    ownerUser &&
      remoteSession &&
      ((ownerUser.ownerLinkedAuthId && ownerUser.ownerLinkedAuthId === remoteSession.authUserId) ||
        (ownerUser.ownerLinkedEmail && normalizeEmail(ownerUser.ownerLinkedEmail) === normalizeEmail(remoteSession.email)))
  );
  const accessDisplayUser = useMemo(
    () => (isAuthenticatedOwner && ownerUser ? ownerUser : currentUser),
    [currentUser, isAuthenticatedOwner, ownerUser]
  );
  const canManageAccess = !isWebDemoMode && Boolean((currentUser?.role === 'owner' || isAuthenticatedOwner) && (!remoteSession || isAuthenticatedOwner));
  const ownerAccountEmail = normalizeEmail(OWNER_ACCOUNT_EMAIL);

  const selectActiveUser = async (id: number) => {
    setActiveUserId(id);
    await saveActiveUserId(id);
  };

  useEffect(() => {
    if (!isAuthenticatedOwner || !ownerUser || activeUserId === ownerUser.id) return;
    selectActiveUser(ownerUser.id).catch((error) => reportRuntimeIssue('owner auto-select failed', error));
  }, [activeUserId, isAuthenticatedOwner, ownerUser]);

  const bootstrap = async () => {
    try {
      const bootstrapped = await bootstrapLocalApp({ isWebDemoMode });
      setUsers(bootstrapped.users);
      setActiveUserId(bootstrapped.activeUserId);
    } finally {
      setLocalBootstrapReady(true);
    }
  };

  const envDiagnostics = useMemo<EnvConfigDiagnostics>(() => {
    const hasUrl = Boolean(process.env.EXPO_PUBLIC_SUPABASE_URL);
    const hasPublishableKey = Boolean(process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
    const hasLegacyAnonKey = Boolean(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
    if (hasLegacyAnonKey) {
      return {
        status: 'legacy_key_detected',
        message: 'Legacy anon key detected. Use only EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY for public auth configuration.',
        hasUrl,
        hasPublishableKey,
        hasLegacyAnonKey
      };
    }
    if (!hasUrl || !hasPublishableKey) {
      return {
        status: 'missing',
        message: 'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY in this runtime.',
        hasUrl,
        hasPublishableKey,
        hasLegacyAnonKey
      };
    }
    return {
      status: 'valid',
      message: 'Publishable key path is configured for this runtime.',
      hasUrl,
      hasPublishableKey,
      hasLegacyAnonKey
    };
  }, []);

  const checkRemoteSchemaCompatibility = async () => {
    setRemoteSchemaDiagnostics((current) => ({
      ...current,
      status: 'checking'
    }));
    const diagnostics = await verifyRemoteSchemaCompatibility();
    setRemoteSchemaDiagnostics(diagnostics);
    return diagnostics;
  };

  const mergeById = <T extends { id: number }>(primary: T[], incoming: T[]) => {
    const map = new Map<number, T>();
    [...primary, ...incoming].forEach((item) => {
      map.set(item.id, item);
    });
    return [...map.values()];
  };

  const canonicalizeDuplicateProneState = ({
    sessionGroupShares,
    allSessionGroupShares,
    experiments,
    allExperiments,
    savedFlies,
    savedLeaderFormulas,
    savedRigPresets,
    savedRivers
  }: {
    sessionGroupShares: SessionGroupShare[];
    allSessionGroupShares: SessionGroupShare[];
    experiments: Experiment[];
    allExperiments: Experiment[];
    savedFlies: SavedFly[];
    savedLeaderFormulas: LeaderFormula[];
    savedRigPresets: RigPreset[];
    savedRivers: SavedRiver[];
  }) => ({
    sessionGroupShares: dedupeSessionGroupSharesByIdentity(sessionGroupShares),
    allSessionGroupShares: dedupeSessionGroupSharesByIdentity(allSessionGroupShares),
    experiments: dedupeDraftExperimentsByIdentity(experiments),
    allExperiments: dedupeDraftExperimentsByIdentity(allExperiments),
    savedFlies: dedupeSavedFliesByIdentity(savedFlies),
    savedLeaderFormulas: dedupeSavedLeaderFormulasByIdentity(savedLeaderFormulas),
    savedRigPresets: dedupeSavedRigPresetsByIdentity(savedRigPresets),
    savedRivers: dedupeSavedRiversByIdentity(savedRivers)
  });

  const suppressPendingDeletes = <T extends { id: number }>(
    records: T[],
    syncQueue: SyncQueueEntry[],
    entityTypes: SyncQueueEntry['entityType'][]
  ) => {
    const pendingDeleteIds = new Set(
      syncQueue
        .filter(
          (entry) =>
            entityTypes.includes(entry.entityType) &&
            entry.operation === 'delete' &&
            (entry.status === 'pending' || entry.status === 'failed') &&
            typeof entry.recordId === 'number'
        )
        .map((entry) => entry.recordId as number)
    );

    if (!pendingDeleteIds.size) return records;
    return records.filter((record) => !pendingDeleteIds.has(record.id));
  };

  const getSyncRecordState = React.useCallback<AppStore['getSyncRecordState']>(
    (entityType, recordId) => {
      const matchingEntries = syncQueue.filter((entry) => {
        return entry.entityType === entityType && entry.operation === 'delete' && entry.recordId === recordId;
      });
      const failedEntry = matchingEntries.find((entry) => entry.status === 'failed');
      if (failedEntry) return 'failed_cleanup';
      const pendingEntry = matchingEntries.find((entry) => entry.status === 'pending');
      if (pendingEntry) return 'pending_delete';
      return 'active';
    },
    [syncQueue]
  );

  const sessionIntegrityById = useMemo(() => {
    const map = new Map<number, IntegritySummary>();
    const experimentCountBySessionId = new Map<number, number>();
    const catchCountBySessionId = new Map<number, number>();

    experiments.forEach((experiment) => {
      experimentCountBySessionId.set(experiment.sessionId, (experimentCountBySessionId.get(experiment.sessionId) ?? 0) + 1);
    });
    catchEvents.forEach((event) => {
      catchCountBySessionId.set(event.sessionId, (catchCountBySessionId.get(event.sessionId) ?? 0) + 1);
    });

    sessions.forEach((session) => {
      map.set(
        session.id,
        classifySessionIntegrity(session, getSyncRecordState('session', session.id), {
          experimentCount: experimentCountBySessionId.get(session.id) ?? 0,
          catchCount: catchCountBySessionId.get(session.id) ?? 0
        })
      );
    });
    return map;
  }, [catchEvents, experiments, getSyncRecordState, sessions]);

  const experimentIntegrityById = useMemo(() => {
    const map = new Map<number, IntegritySummary>();
    experiments.forEach((experiment) => {
      map.set(
        experiment.id,
        classifyExperimentIntegrity(
          experiment,
          sessionMap.get(experiment.sessionId),
          getSyncRecordState('experiment', experiment.id)
        )
      );
    });
    return map;
  }, [experiments, getSyncRecordState, sessionMap]);

  const groupIntegrityById = useMemo(() => {
    const map = new Map<number, IntegritySummary>();
    const membershipsByGroupId = new Map<number, GroupMembership>();
    const preferencesByGroupId = new Map<number, SharePreference>();

    groupMemberships
      .filter((membership) => membership.userId === activeUserId)
      .forEach((membership) => {
        membershipsByGroupId.set(membership.groupId, membership);
      });
    sharePreferences
      .filter((preference) => preference.userId === activeUserId)
      .forEach((preference) => {
        preferencesByGroupId.set(preference.groupId, preference);
      });

    groups.forEach((group) => {
      const membership = membershipsByGroupId.get(group.id);
      const groupCleanupState = getSyncRecordState('group', group.id);
      const membershipCleanupState = membership ? getSyncRecordState('group_membership', membership.id) : 'active';
      const cleanupState = groupCleanupState !== 'active' ? groupCleanupState : membershipCleanupState;
      map.set(
        group.id,
        classifyGroupIntegrity({
          group,
          membership,
          sharePreference: preferencesByGroupId.get(group.id),
          currentUserId: activeUserId ?? -1,
          cleanupState
        })
      );
    });

    return map;
  }, [activeUserId, getSyncRecordState, groupMemberships, groups, sharePreferences]);

  const getSessionIntegrity = React.useCallback<AppStore['getSessionIntegrity']>(
    (sessionId) =>
      sessionIntegrityById.get(sessionId) ?? {
        state: 'orphaned',
        label: 'Missing',
        analyticsEligible: false,
        reason: 'This session could not be found.'
      },
    [sessionIntegrityById]
  );

  const getExperimentIntegrity = React.useCallback<AppStore['getExperimentIntegrity']>(
    (experimentId) =>
      experimentIntegrityById.get(experimentId) ?? {
        state: 'orphaned',
        label: 'Missing',
        analyticsEligible: false,
        reason: 'This experiment could not be found.'
      },
    [experimentIntegrityById]
  );

  const getGroupIntegrity = React.useCallback<AppStore['getGroupIntegrity']>(
    (groupId) =>
      groupIntegrityById.get(groupId) ?? {
        state: 'orphaned',
        label: 'Missing',
        analyticsEligible: false,
        reason: 'This group could not be found.'
      },
    [groupIntegrityById]
  );

  const analyticsEligibleSessions = useMemo(
    () => sessions.filter((session) => getSessionIntegrity(session.id).analyticsEligible),
    [getSessionIntegrity, sessions]
  );

  const analyticsEligibleExperiments = useMemo(
    () => experiments.filter((experiment) => getExperimentIntegrity(experiment.id).analyticsEligible),
    [experiments, getExperimentIntegrity]
  );

  const analyticsEligibleAllSessions = useMemo(
    () => {
      const experimentCountBySessionId = new Map<number, number>();
      const catchCountBySessionId = new Map<number, number>();

      allExperiments.forEach((experiment) => {
        experimentCountBySessionId.set(experiment.sessionId, (experimentCountBySessionId.get(experiment.sessionId) ?? 0) + 1);
      });
      allCatchEvents.forEach((event) => {
        catchCountBySessionId.set(event.sessionId, (catchCountBySessionId.get(event.sessionId) ?? 0) + 1);
      });

      return allSessions.filter((session) =>
        classifySessionIntegrity(session, 'active', {
          experimentCount: experimentCountBySessionId.get(session.id) ?? 0,
          catchCount: catchCountBySessionId.get(session.id) ?? 0
        }).analyticsEligible
      );
    },
    [allCatchEvents, allExperiments, allSessions]
  );

  const analyticsEligibleAllExperiments = useMemo(() => {
    const allSessionMap = new Map(allSessions.map((session) => [session.id, session]));
    return allExperiments.filter((experiment) =>
      classifyExperimentIntegrity(experiment, allSessionMap.get(experiment.sessionId)).analyticsEligible
    );
  }, [allExperiments, allSessions]);

  const refresh = async (targetUserId?: number | null, options?: { includeRemote?: boolean }) => {
    const loaded = await loadLocalAppData(targetUserId ?? activeUserId);
    let nextUsers = loaded.users;
    let nextSessions = loaded.sessions;
    let nextAllSessions = loaded.allSessions;
    let nextSessionGroupShares = loaded.sessionGroupShares;
    let nextAllSessionGroupShares = loaded.sessionGroupShares;
    let nextSessionSegments = loaded.sessionSegments;
    let nextCatchEvents = loaded.catchEvents;
    let nextAllCatchEvents = loaded.allCatchEvents;
    let nextExperiments = loaded.experiments;
    let nextAllExperiments = loaded.allExperiments;
    let nextSavedFlies = loaded.savedFlies;
    let nextSavedLeaderFormulas = loaded.savedLeaderFormulas;
    let nextSavedRigPresets = loaded.savedRigPresets;
    let nextSavedRivers = loaded.savedRivers;
    let nextGroups = loaded.groups;
    let nextGroupMemberships = loaded.groupMemberships;
    let nextSharePreferences = loaded.sharePreferences;
    let nextCompetitions = loaded.competitions;
    let nextCompetitionGroups = loaded.competitionGroups;
    let nextCompetitionSessions = loaded.competitionSessions;
    let nextCompetitionParticipants = loaded.competitionParticipants;
    let nextCompetitionAssignments = loaded.competitionAssignments;
    let nextInvites = loaded.invites;
    let nextSponsoredAccess = loaded.sponsoredAccess;

    const includeRemote = options?.includeRemote ?? true;

    if (hasSupabaseConfig && remoteSession && includeRemote && !isWebDemoMode) {
      setRemoteBootstrapState('loading_remote');
      setSharedDataStatus('loading');
      try {
        const schemaDiagnostics = await checkRemoteSchemaCompatibility();
        if (schemaDiagnostics.status === 'incompatible') {
          setRemoteBackendBlocked(true);
          setLastSyncError(schemaDiagnostics.message ?? 'Shared beta backend schema is out of date.');
          setSharedDataStatus('error');
          setRemoteBootstrapState('degraded');
        } else if (schemaDiagnostics.status === 'error') {
          setLastSyncError(schemaDiagnostics.message ?? 'Could not verify shared beta backend schema.');
          setSharedDataStatus('error');
          setRemoteBootstrapState('degraded');
        } else {
          const remoteAccess = await fetchRemoteAccessSnapshot(remoteSession.authUserId);
          const remoteShared = await fetchRemoteSharedDataSnapshot(remoteSession.authUserId, remoteAccess);
          await Promise.all(
            [...remoteAccess.syncMetadataHints, ...remoteShared.syncMetadataHints].map((hint) =>
              upsertSyncMetadataEntry({
                entityType: hint.entityType,
                localRecordId: hint.localRecordId,
                remoteRecordId: hint.remoteRecordId,
                lastSyncedAt: new Date().toISOString(),
                pendingImport: false
              })
            )
          );
          setLastSyncError(null);
          setRemoteBackendBlocked(false);
          setSharedDataStatus('ready');
          setRemoteBootstrapState('ready');

          nextUsers = mergeById(loaded.users, remoteAccess.users);
          nextGroups = mergeById(loaded.groups, remoteAccess.groups);
          nextGroupMemberships = mergeById(loaded.groupMemberships, remoteAccess.groupMemberships);
          nextSharePreferences = mergeById(loaded.sharePreferences, remoteAccess.sharePreferences);
          nextInvites = mergeById(loaded.invites, remoteAccess.invites);
          nextSponsoredAccess = mergeById(loaded.sponsoredAccess, remoteAccess.sponsoredAccess);
          nextCompetitions = mergeById(loaded.competitions, remoteAccess.competitions);
          nextCompetitionGroups = mergeById(loaded.competitionGroups, remoteAccess.competitionGroups);
          nextCompetitionSessions = mergeById(loaded.competitionSessions, remoteAccess.competitionSessions);
          nextCompetitionParticipants = mergeById(loaded.competitionParticipants, remoteAccess.competitionParticipants);
          nextCompetitionAssignments = mergeById(loaded.competitionAssignments, remoteAccess.competitionAssignments);

          nextSessionGroupShares = mergeById(loaded.sessionGroupShares, remoteShared.ownedSessionGroupShares);
          nextAllSessionGroupShares = mergeById(loaded.sessionGroupShares, remoteShared.accessibleSessionGroupShares);
          nextSessions = applySessionShareIds(mergeById(loaded.sessions, remoteShared.ownedSessions), nextSessionGroupShares);
          nextAllSessions = applySessionShareIds(mergeById(loaded.allSessions, remoteShared.accessibleSessions), nextAllSessionGroupShares);
          nextSessionSegments = mergeById(loaded.sessionSegments, remoteShared.ownedSessionSegments);
          nextCatchEvents = mergeById(loaded.catchEvents, remoteShared.ownedCatchEvents);
          nextAllCatchEvents = mergeById(loaded.allCatchEvents, remoteShared.accessibleCatchEvents);
          nextExperiments = mergeById(loaded.experiments, remoteShared.ownedExperiments);
          nextAllExperiments = mergeById(loaded.allExperiments, remoteShared.accessibleExperiments);
          nextSavedFlies = mergeById(loaded.savedFlies, remoteShared.savedFlies);
          nextSavedLeaderFormulas = mergeById(loaded.savedLeaderFormulas, remoteShared.savedLeaderFormulas);
          nextSavedRigPresets = mergeById(loaded.savedRigPresets, remoteShared.savedRigPresets);
          nextSavedRivers = mergeById(loaded.savedRivers, remoteShared.savedRivers);
        }
      } catch (error) {
        reportRuntimeIssue('shared access bootstrap failed', error);
        if (isStructuralBackendError(error)) {
          setRemoteBackendBlocked(true);
          setLastSyncError(toStructuralBackendMessage(error));
        } else {
          setLastSyncError(getErrorMessage(error));
        }
        setSharedDataStatus('error');
        setRemoteBootstrapState('degraded');
      }
    } else if (remoteBackendBlocked) {
      setSharedDataStatus('error');
      setRemoteBootstrapState('degraded');
    } else {
      setSharedDataStatus('idle');
      if (!remoteSession) {
        setRemoteBootstrapState('idle');
      }
    }

    nextGroups = suppressPendingDeletes(nextGroups, loaded.syncQueue, ['group']);
    nextGroupMemberships = suppressPendingDeletes(nextGroupMemberships, loaded.syncQueue, ['group_membership']);
    nextSharePreferences = suppressPendingDeletes(nextSharePreferences, loaded.syncQueue, ['share_preference']);
    nextInvites = suppressPendingDeletes(nextInvites, loaded.syncQueue, ['invite']);
    nextSponsoredAccess = suppressPendingDeletes(nextSponsoredAccess, loaded.syncQueue, ['sponsored_access']);
    nextCompetitions = suppressPendingDeletes(nextCompetitions, loaded.syncQueue, ['competition']);
    nextCompetitionGroups = suppressPendingDeletes(nextCompetitionGroups, loaded.syncQueue, ['competition_group']);
    nextCompetitionSessions = suppressPendingDeletes(nextCompetitionSessions, loaded.syncQueue, ['competition_session']);
    nextCompetitionParticipants = suppressPendingDeletes(nextCompetitionParticipants, loaded.syncQueue, ['competition_participant']);
    nextCompetitionAssignments = suppressPendingDeletes(nextCompetitionAssignments, loaded.syncQueue, ['competition_assignment']);
    nextSessionGroupShares = suppressPendingDeletes(nextSessionGroupShares, loaded.syncQueue, ['session_group_share']);
    nextAllSessionGroupShares = suppressPendingDeletes(nextAllSessionGroupShares, loaded.syncQueue, ['session_group_share']);
    nextSessions = applySessionShareIds(suppressPendingDeletes(nextSessions, loaded.syncQueue, ['session']), nextSessionGroupShares);
    nextAllSessions = applySessionShareIds(suppressPendingDeletes(nextAllSessions, loaded.syncQueue, ['session']), nextAllSessionGroupShares);
    nextSessionSegments = suppressPendingDeletes(nextSessionSegments, loaded.syncQueue, ['session_segment']);
    nextCatchEvents = suppressPendingDeletes(nextCatchEvents, loaded.syncQueue, ['catch_event']);
    nextAllCatchEvents = suppressPendingDeletes(nextAllCatchEvents, loaded.syncQueue, ['catch_event']);
    nextExperiments = suppressPendingDeletes(nextExperiments, loaded.syncQueue, ['experiment']);
    nextAllExperiments = suppressPendingDeletes(nextAllExperiments, loaded.syncQueue, ['experiment']);
    nextSavedFlies = suppressPendingDeletes(nextSavedFlies, loaded.syncQueue, ['saved_fly']);
    nextSavedLeaderFormulas = suppressPendingDeletes(nextSavedLeaderFormulas, loaded.syncQueue, ['saved_leader_formula']);
    nextSavedRigPresets = suppressPendingDeletes(nextSavedRigPresets, loaded.syncQueue, ['saved_rig_preset']);
    nextSavedRivers = suppressPendingDeletes(nextSavedRivers, loaded.syncQueue, ['saved_river']);

    const canonicalizedState = canonicalizeDuplicateProneState({
      sessionGroupShares: nextSessionGroupShares,
      allSessionGroupShares: nextAllSessionGroupShares,
      experiments: nextExperiments,
      allExperiments: nextAllExperiments,
      savedFlies: nextSavedFlies,
      savedLeaderFormulas: nextSavedLeaderFormulas,
      savedRigPresets: nextSavedRigPresets,
      savedRivers: nextSavedRivers
    });
    nextSessionGroupShares = canonicalizedState.sessionGroupShares;
    nextAllSessionGroupShares = canonicalizedState.allSessionGroupShares;
    nextExperiments = canonicalizedState.experiments;
    nextAllExperiments = canonicalizedState.allExperiments;
    nextSavedFlies = canonicalizedState.savedFlies;
    nextSavedLeaderFormulas = canonicalizedState.savedLeaderFormulas;
    nextSavedRigPresets = canonicalizedState.savedRigPresets;
    nextSavedRivers = canonicalizedState.savedRivers;
    nextSessions = applySessionShareIds(nextSessions, nextSessionGroupShares);
    nextAllSessions = applySessionShareIds(nextAllSessions, nextAllSessionGroupShares);

    setUsers(nextUsers);
    setSessions(nextSessions);
    setAllSessions(nextAllSessions);
    setSessionGroupShares(nextSessionGroupShares);
    setSessionSegments(nextSessionSegments);
    setCatchEvents(nextCatchEvents);
    setAllCatchEvents(nextAllCatchEvents);
    setExperiments(nextExperiments);
    setAllExperiments(nextAllExperiments);
    setSavedFlies(nextSavedFlies);
    setSavedLeaderFormulas(nextSavedLeaderFormulas);
    setSavedRigPresets(nextSavedRigPresets);
    setSavedRivers(nextSavedRivers);
    setGroups(nextGroups);
    setGroupMemberships(nextGroupMemberships);
    setSharePreferences(nextSharePreferences);
    setCompetitions(nextCompetitions);
    setCompetitionGroups(nextCompetitionGroups);
    setCompetitionSessions(nextCompetitionSessions);
    setCompetitionParticipants(nextCompetitionParticipants);
    setCompetitionAssignments(nextCompetitionAssignments);
    setInvites(nextInvites);
    setSponsoredAccess(nextSponsoredAccess);
    setSyncQueue(loaded.syncQueue);
  };

  const flushSyncQueueWithUser = async (
    user: UserProfile,
    sessionOverride?: RemoteSessionSnapshot | null
  ) => {
    const effectiveSession = sessionOverride ?? remoteSession;

    if (!hasSupabaseConfig) {
      throw new Error('Supabase is not configured yet. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY first.');
    }

    if (!effectiveSession) {
      throw new Error('Sign in before syncing shared data.');
    }

    if (remoteBackendBlocked) {
      const schemaDiagnostics = await checkRemoteSchemaCompatibility();
      if (schemaDiagnostics.status === 'compatible') {
        setRemoteBackendBlocked(false);
      } else {
        throw new Error(schemaDiagnostics.message ?? 'Shared beta backend needs a schema or policy fix before sync can continue.');
      }
    }

    setIsSyncing(true);
    setLastSyncError(null);
    try {
      const schemaDiagnostics = await checkRemoteSchemaCompatibility();
      if (schemaDiagnostics.status !== 'compatible') {
        setRemoteBackendBlocked(schemaDiagnostics.status === 'incompatible');
        setLastSyncError(schemaDiagnostics.message ?? 'Shared beta backend schema is not ready for sync.');
        throw new Error(schemaDiagnostics.message ?? 'Shared beta backend schema is not ready for sync.');
      }
      const loaded = await loadLocalAppData(user.id);
      await syncQueueToSupabase(
        {
          currentUser: {
            ...user,
            email: effectiveSession.email ?? user.email ?? null,
            remoteAuthId: effectiveSession.authUserId,
            emailVerifiedAt: effectiveSession.emailVerifiedAt ?? user.emailVerifiedAt ?? null
          },
          remoteAuthUserId: effectiveSession.authUserId,
          loaded
        },
        loaded.syncQueue
      );
      await refresh(user.id);
    } catch (error) {
      const message = isStructuralBackendError(error)
        ? toStructuralBackendMessage(error)
        : getErrorMessage(error);
      if (isStructuralBackendError(error)) {
        setRemoteBackendBlocked(true);
        setRemoteBootstrapState('degraded');
      }
      setLastSyncError(message);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  };

  const ensureUserForRemoteSession = async (snapshot: RemoteSessionSnapshot) => {
    const normalizedEmail = normalizeEmail(snapshot.email);
    const matchedByAuthId = users.find((user) => user.remoteAuthId === snapshot.authUserId);
    const ownerCandidate =
      normalizedEmail && normalizedEmail === ownerAccountEmail
        ? users.find((user) => user.role === 'owner') ?? null
        : null;
    const matchedByEmail = normalizedEmail
      ? users.find(
          (user) =>
            normalizeEmail(user.email) === normalizedEmail &&
            (user.role !== 'owner' || normalizedEmail === ownerAccountEmail)
        )
      : null;
    const targetUser = matchedByAuthId ?? ownerCandidate ?? matchedByEmail;
    const derivedName =
      snapshot.email?.split('@')[0]?.replace(/[._-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()) || 'Angler';
    const profileName =
      !targetUser?.name || targetUser.name === 'Owner Account' || targetUser.name === 'Primary Angler'
        ? derivedName
        : targetUser.name;

    if (targetUser) {
      await updateUser(targetUser.id, {
        name: profileName,
        remoteAuthId: snapshot.authUserId,
        email: snapshot.email ?? targetUser.email ?? null,
        emailVerifiedAt: snapshot.emailVerifiedAt ?? targetUser.emailVerifiedAt ?? null,
        ownerLinkedEmail: targetUser.role === 'owner' && normalizedEmail === ownerAccountEmail ? snapshot.email ?? targetUser.ownerLinkedEmail ?? null : targetUser.ownerLinkedEmail ?? null,
        ownerLinkedAuthId:
          targetUser.role === 'owner' && normalizedEmail === ownerAccountEmail
            ? snapshot.authUserId
            : targetUser.ownerLinkedAuthId ?? null
      });
      await trackSyncChange('profile', 'update', targetUser.id, {
        name: profileName,
        remoteAuthId: snapshot.authUserId,
        email: snapshot.email ?? targetUser.email ?? null,
        emailVerifiedAt: snapshot.emailVerifiedAt ?? targetUser.emailVerifiedAt ?? null,
        ownerLinkedEmail:
          targetUser.role === 'owner' && normalizedEmail === ownerAccountEmail
            ? snapshot.email ?? targetUser.ownerLinkedEmail ?? null
            : targetUser.ownerLinkedEmail ?? null,
        ownerLinkedAuthId:
          targetUser.role === 'owner' && normalizedEmail === ownerAccountEmail
            ? snapshot.authUserId
            : targetUser.ownerLinkedAuthId ?? null
      });
      await selectActiveUser(targetUser.id);
      return targetUser.id;
    }

    const createdId = await createUser({
      name: derivedName,
      email: snapshot.email ?? null,
      remoteAuthId: snapshot.authUserId,
      emailVerifiedAt: snapshot.emailVerifiedAt ?? null,
      role: 'angler'
    });
    await trackSyncChange('profile', 'create', createdId, {
      name: derivedName,
      email: snapshot.email ?? null,
      remoteAuthId: snapshot.authUserId,
      emailVerifiedAt: snapshot.emailVerifiedAt ?? null
    });
    await selectActiveUser(createdId);
    return createdId;
  };

  const enqueueImportSeed = async (targetUser: UserProfile) => {
    const loaded = await loadLocalAppData(targetUser.id);

    await trackSyncChange('profile', 'update', targetUser.id, {
      importedAt: new Date().toISOString()
    });

    for (const group of loaded.groups.filter((entry) => entry.createdByUserId === targetUser.id)) {
      await trackSyncChange('group', 'create', group.id, group);
    }

    for (const membership of loaded.groupMemberships.filter((entry) => entry.userId === targetUser.id)) {
      await trackSyncChange('group_membership', membership.role === 'organizer' ? 'create' : 'join', membership.id, membership);
    }

    for (const preference of loaded.sharePreferences.filter((entry) => entry.userId === targetUser.id)) {
      await trackSyncChange('share_preference', 'update', preference.id, {
        groupId: preference.groupId,
        preferenceId: preference.id
      });
    }

    for (const invite of loaded.invites.filter((entry) => entry.inviterUserId === targetUser.id)) {
      await trackSyncChange('invite', invite.status === 'accepted' ? 'accept' : 'create', invite.id, invite);
    }

    for (const access of loaded.sponsoredAccess.filter((entry) => entry.sponsorUserId === targetUser.id || entry.sponsoredUserId === targetUser.id)) {
      await trackSyncChange('sponsored_access', access.active ? 'update' : 'revoke', access.id, access);
    }

    const ownedCompetitionIds = loaded.competitions
      .filter((entry) => entry.organizerUserId === targetUser.id)
      .map((entry) => entry.id);

    for (const competition of loaded.competitions.filter((entry) => entry.organizerUserId === targetUser.id)) {
      await trackSyncChange('competition', 'create', competition.id, competition);
    }

    for (const group of loaded.competitionGroups.filter((entry) => ownedCompetitionIds.includes(entry.competitionId))) {
      await trackSyncChange('competition_group', 'create', group.id, group);
    }

    for (const competitionSession of loaded.competitionSessions.filter((entry) => ownedCompetitionIds.includes(entry.competitionId))) {
      await trackSyncChange('competition_session', 'create', competitionSession.id, competitionSession);
    }

    for (const participant of loaded.competitionParticipants.filter((entry) => entry.userId === targetUser.id || ownedCompetitionIds.includes(entry.competitionId))) {
      await trackSyncChange('competition_participant', participant.userId === targetUser.id ? 'join' : 'create', participant.id, participant);
    }

    for (const assignment of loaded.competitionAssignments.filter((entry) => entry.userId === targetUser.id || ownedCompetitionIds.includes(entry.competitionId))) {
      await trackSyncChange('competition_assignment', 'update', assignment.id, assignment);
    }

    for (const session of loaded.sessions) {
      await trackSyncChange('session', 'create', session.id, session);
    }

    for (const share of loaded.sessionGroupShares.filter((entry) => entry.userId === targetUser.id)) {
      await trackSyncChange('session_group_share', 'create', share.id, share);
    }

    for (const segment of loaded.sessionSegments) {
      await trackSyncChange('session_segment', 'create', segment.id, segment);
    }

    for (const event of loaded.catchEvents) {
      await trackSyncChange('catch_event', 'create', event.id, event);
    }

    for (const experiment of loaded.experiments) {
      await trackSyncChange('experiment', experiment.status === 'draft' ? 'update' : 'create', experiment.id, experiment);
    }

    for (const savedFly of loaded.savedFlies) {
      await trackSyncChange('saved_fly', 'create', savedFly.id, savedFly);
    }

    for (const formula of loaded.savedLeaderFormulas) {
      await trackSyncChange('saved_leader_formula', 'create', formula.id, formula);
    }

    for (const preset of loaded.savedRigPresets) {
      await trackSyncChange('saved_rig_preset', 'create', preset.id, preset);
    }

    for (const river of loaded.savedRivers) {
      await trackSyncChange('saved_river', 'create', river.id, river);
    }
  };

  useEffect(() => {
    bootstrap().catch((error) => reportRuntimeIssue('local bootstrap failed', error));
  }, []);

  useEffect(() => {
    refresh().catch((error) => reportRuntimeIssue('initial refresh failed', error));
  }, [activeUserId]);

  useEffect(() => {
    if (isWebDemoMode || !hasSupabaseConfig) {
      setAuthStatus('unauthenticated');
      setRemoteSession(null);
      setSharedDataStatus('idle');
      setRemoteBackendBlocked(false);
      setRemoteBootstrapState('idle');
      setAuthReady(true);
      return;
    }

    let mounted = true;

    bootstrapAuthSession()
      .then((snapshot) => {
        if (!mounted) return;
        setRemoteBackendBlocked(false);
        setRemoteBootstrapState(snapshot ? 'resolving_local' : 'idle');
        setRemoteSession(snapshot);
        setAuthStatus(snapshot ? 'authenticated' : 'unauthenticated');
        setAuthReady(true);
      })
      .catch((error) => {
        reportRuntimeIssue('auth-linked refresh failed', error);
        if (!mounted) return;
        setRemoteBackendBlocked(false);
        setRemoteBootstrapState('idle');
        setRemoteSession(null);
        setAuthStatus('unauthenticated');
        setAuthReady(true);
      });

    const unsubscribe = subscribeToAuthChanges((snapshot, event) => {
      if (!mounted) return;
      setRemoteBackendBlocked(false);
      setRemoteBootstrapState(snapshot ? 'resolving_local' : 'idle');
      setRemoteSession(snapshot);
      if (event === 'PASSWORD_RECOVERY') {
        setAuthStatus('password_reset_required');
      } else {
        setAuthStatus(snapshot ? 'authenticated' : 'unauthenticated');
      }
      setAuthReady(true);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [isWebDemoMode]);

  useEffect(() => {
    getNotificationPermissionStatus()
      .then(setNotificationPermissionStatus)
      .catch((error) => {
        reportRuntimeIssue('shared snapshot refresh failed', error);
        setNotificationPermissionStatus('unknown');
      });
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;

      getNotificationPermissionStatus()
        .then(setNotificationPermissionStatus)
        .catch((error) => {
          reportRuntimeIssue('shared-data hydration failed', error);
          setNotificationPermissionStatus('unknown');
        });

      if (isWebDemoMode) {
        return;
      }

      if (remoteBackendBlocked) {
        setRemoteBackendBlocked(false);
        setRemoteBootstrapState(remoteSession ? 'loading_remote' : 'idle');
        if (currentUser) {
          refresh(currentUser.id).catch((error) => reportRuntimeIssue('app-state refresh failed', error));
        }
      } else if (remoteSession && currentUser && !isSyncing) {
        flushSyncQueue().catch((error) => reportRuntimeIssue('resume sync flush failed', error));
      }
    });

    return () => {
      subscription.remove();
    };
  }, [currentUser, isSyncing, isWebDemoMode, refresh, remoteBackendBlocked, remoteSession]);

  useEffect(() => {
    if (isWebDemoMode || !remoteSession) {
      setMfaFactors([]);
      setPendingTotpEnrollment(null);
      setMfaAssuranceLevel('unknown');
      return;
    }

    let cancelled = false;

    (async () => {
      setRemoteBootstrapState('resolving_local');
      const resolvedUserId = await ensureUserForRemoteSession(remoteSession);
      if (cancelled) return;

      await refresh(resolvedUserId, { includeRemote: false });
      if (cancelled) return;

      const [factors, assurance] = await Promise.all([
        listMfaFactors().catch((error) => {
          reportRuntimeIssue('mfa factor refresh failed', error);
          return { totp: [] as any[] };
        }),
        getMfaAssuranceLevel().catch((error) => {
          reportRuntimeIssue('mfa assurance refresh failed', error);
          return { currentLevel: 'aal1', nextLevel: 'aal1' } as const;
        })
      ]);

      if (cancelled) return;

      setMfaFactors(
        factors.totp.map((factor) => ({
          id: factor.id,
          friendlyName: factor.friendly_name ?? null,
          factorType: 'totp',
          status: factor.status
        }))
      );
      setMfaAssuranceLevel((assurance.currentLevel as 'aal1' | 'aal2') ?? 'unknown');

      if (assurance.nextLevel === 'aal2' && assurance.currentLevel !== assurance.nextLevel) {
        setAuthStatus('mfa_required');
      } else if (factors.totp.length) {
        setAuthStatus('mfa_enrolled');
      } else {
        setAuthStatus('authenticated');
      }

      const importKey = `supabase_import_seeded_${remoteSession.authUserId}_${resolvedUserId}`;
      if (importSeededRef.current === importKey) return;

      importSeededRef.current = importKey;
      const existing = await getAppSetting(importKey);
      if (existing) {
        await refresh(resolvedUserId);
        return;
      }

      await setAppSetting(importKey, new Date().toISOString());
      const loaded = await loadLocalAppData(resolvedUserId);
      const targetUser = loaded.users.find((user) => user.id === resolvedUserId);
      if (!targetUser) return;
      await enqueueImportSeed(targetUser);
      await refresh(resolvedUserId);
      await flushSyncQueueWithUser(targetUser, remoteSession);
    })().catch((error) => {
      reportRuntimeIssue('notification permission refresh failed', error);
      importSeededRef.current = null;
      setRemoteBootstrapState('degraded');
    });

    return () => {
      cancelled = true;
    };
  }, [isWebDemoMode, remoteSession]);

  useEffect(() => {
    if (isWebDemoMode || !remoteSession || !currentUser || isSyncing || remoteBackendBlocked) return;
    const hasPendingEntries = syncQueue.some((entry) => entry.status === 'pending');
    if (!hasPendingEntries) return;

    const timeoutId = setTimeout(() => {
      flushSyncQueue().catch((error) => reportRuntimeIssue('sync queue flush retry failed', error));
    }, 600);

    return () => clearTimeout(timeoutId);
  }, [currentUser, isSyncing, isWebDemoMode, remoteBackendBlocked, remoteSession, syncQueue]);

  useEffect(() => {
    if (isWebDemoMode || !remoteSession || !currentUser || isSyncing || remoteBackendBlocked) return;
    const hasRetryableEntries = syncQueue.some((entry) => entry.status === 'pending' || entry.status === 'failed');
    if (!hasRetryableEntries) return;

    const intervalId = setInterval(() => {
      flushSyncQueue().catch((error) => reportRuntimeIssue('sync queue flush after enqueue failed', error));
    }, 15000);

    return () => clearInterval(intervalId);
  }, [currentUser, isSyncing, isWebDemoMode, remoteBackendBlocked, remoteSession, syncQueue]);

  const insights = useMemo(
    () => generateInsights(buildAggregates(analyticsEligibleSessions, analyticsEligibleExperiments)),
    [analyticsEligibleExperiments, analyticsEligibleSessions]
  );
  const anglerComparisons = useMemo(
    () => generateAnglerComparisons(users, analyticsEligibleAllSessions, analyticsEligibleAllExperiments),
    [analyticsEligibleAllExperiments, analyticsEligibleAllSessions, users]
  );
  const topFlyRecords = useMemo(
    () => buildTopFlyRecords(analyticsEligibleSessions, analyticsEligibleExperiments),
    [analyticsEligibleExperiments, analyticsEligibleSessions]
  );
  const topFlyInsights = useMemo(() => buildTopFlyInsights(topFlyRecords), [topFlyRecords]);
  const syncStatus = useMemo<SyncStatusSnapshot>(() => {
    const pendingCount = syncQueue.filter((entry) => entry.status === 'pending').length;
    const failedCount = syncQueue.filter((entry) => entry.status === 'failed').length;
    const syncedEntries = syncQueue.filter((entry) => entry.status === 'synced');
    const failureSummaries = summarizeSyncFailures(syncQueue);
    const lastSyncedAt = syncedEntries
      .map((entry) => entry.syncedAt ?? null)
      .filter((value): value is string => !!value)
      .sort()
      .at(-1) ?? null;
    return {
      state: lastSyncError ? 'error' : isSyncing ? 'syncing' : 'idle',
      pendingCount,
      failedCount,
      syncedCount: syncedEntries.length,
      lastSyncedAt,
      lastError: lastSyncError,
      failureSummaries
    };
  }, [isSyncing, lastSyncError, syncQueue]);
  const cleanupSyncStatus = useMemo<CleanupSyncStatus>(() => {
    const deleteEntries = syncQueue.filter((entry) => entry.operation === 'delete');
    const failedDeleteEntries = deleteEntries.filter((entry) => entry.status === 'failed');
    return {
      pendingDeleteCount: deleteEntries.filter((entry) => entry.status === 'pending').length,
      failedDeleteCount: failedDeleteEntries.length,
      lastFailedDeleteMessage: failedDeleteEntries[0]?.errorMessage ?? null
    };
  }, [syncQueue]);
  const backendDiagnostics = useMemo<BackendDiagnosticsSnapshot>(
    () => ({
      projectHost: process.env.EXPO_PUBLIC_SUPABASE_URL
        ? (() => {
            try {
              return new URL(process.env.EXPO_PUBLIC_SUPABASE_URL).host;
            } catch {
              return process.env.EXPO_PUBLIC_SUPABASE_URL ?? null;
            }
          })()
        : null,
      authConnected: !!remoteSession,
      bootstrapState: remoteBootstrapState,
      sharedDataStatus,
      syncStatus,
      schema: remoteSchemaDiagnostics,
      env: envDiagnostics
    }),
    [envDiagnostics, remoteBootstrapState, remoteSchemaDiagnostics, remoteSession, sharedDataStatus, syncStatus]
  );

  const trackSyncChange = async (
    entityType: SyncQueueEntry['entityType'],
    operation: SyncQueueEntry['operation'],
    recordId: number | null,
    payload: unknown
  ) => {
    await enqueueLocalSyncChange({
      entityType,
      operation,
      recordId,
      payloadJson: JSON.stringify(payload)
    });
  };

  const flushSyncQueue = async () => {
    if (isWebDemoMode) {
      return;
    }
    if (!currentUser) {
      throw new Error('No active user selected.');
    }
    await flushSyncQueueWithUser(currentUser);
  };

  const resetWebDemoData = async () => {
    if (!isWebDemoMode) return;
    setLocalBootstrapReady(false);
    try {
      const bootstrapped = await resetLocalWebDemoData();
      setUsers(bootstrapped.users);
      setActiveUserId(bootstrapped.activeUserId);
      await refresh(bootstrapped.activeUserId, { includeRemote: false });
    } finally {
      setLocalBootstrapReady(true);
    }
  };

  const updateUserAccess = async (
    userId: number,
    next: {
      accessLevel: AccessLevel;
      subscriptionStatus: SubscriptionStatus;
      trialStartedAt?: string | null;
      trialEndsAt?: string | null;
      subscriptionExpiresAt?: string | null;
      grantedByUserId?: number | null;
    }
  ) => {
    await updateUser(userId, next);
    await trackSyncChange('profile', 'update', userId, next);
    await refresh(activeUserId);
  };

  const actions = createStoreActions({
      activeUserId,
    currentUser,
    users,
    sessions,
    savedFlies,
    savedLeaderFormulas,
    savedRigPresets,
      savedRivers,
      groups,
    groupMemberships,
    sharePreferences,
    competitions,
    competitionParticipants,
    invites,
    sponsoredAccess,
    catchEvents,
    sessionSegments,
    experiments,
    sessionGroupShares,
    sessionMap,
    competitionGroups,
    competitionSessions,
    competitionAssignments,
    remoteSession,
    ownerIdentityLinked,
    isAuthenticatedOwner,
    pendingTotpEnrollment,
    setActiveUserId,
    setRemoteSession,
    setAuthStatus,
    setPendingTotpEnrollment,
    setMfaFactors,
    setMfaAssuranceLevel,
    selectActiveUser,
    refresh,
    trackSyncChange,
    flushSyncQueueInternal: flushSyncQueue,
    updateUserAccess,
    getGroupIntegrity
  });

  return (
    <Ctx.Provider
      value={{
        sessions,
        allSessions,
        sessionGroupShares,
        sessionSegments,
        catchEvents,
        allCatchEvents,
        experiments,
        allExperiments,
        insights,
        anglerComparisons,
        topFlyRecords,
        topFlyInsights,
        users,
        ownerUser,
        currentUser,
        currentEntitlementLabel: getEntitlementLabel(accessDisplayUser),
        currentHasPremiumAccess: hasPremiumAccess(accessDisplayUser),
        isWebDemoMode,
        canManageAccess,
        savedFlies,
        savedLeaderFormulas,
        savedRigPresets,
        savedRivers,
        groups,
        groupMemberships,
        sharePreferences,
        competitions,
        competitionGroups,
        competitionSessions,
        competitionParticipants,
        competitionAssignments,
        invites,
        sponsoredAccess,
        syncQueue,
        syncStatus,
        cleanupSyncStatus,
        backendDiagnostics,
        sharedDataStatus,
        notificationPermissionStatus,
        authStatus,
        remoteSession,
        authReady,
        localBootstrapReady,
        remoteBootstrapState,
        isSyncEnabled,
        ownerIdentityLinked,
        isAuthenticatedOwner,
        mfaFactors,
        pendingTotpEnrollment,
        mfaAssuranceLevel,
        activeUserId,
        resetWebDemoData,
        getSyncRecordState,
        getSessionIntegrity,
        getExperimentIntegrity,
        getGroupIntegrity,
        ...actions
      }}
    >
      {children}
    </Ctx.Provider>
  );
};

export const useAppStore = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('AppStoreProvider missing');
  return ctx;
};
