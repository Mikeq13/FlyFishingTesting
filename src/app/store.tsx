import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Experiment, Insight } from '@/types/experiment';
import { SavedRiver, Session } from '@/types/session';
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
import { updateUser } from '@/db/userRepo';
import { getAppSetting, setActiveUserId as saveActiveUserId, setAppSetting } from '@/db/settingsRepo';
import { buildAggregates } from '@/engine/aggregationEngine';
import { generateAnglerComparisons } from '@/engine/anglerComparisonEngine';
import { createTrialWindow, getEntitlementLabel, hasPremiumAccess } from '@/engine/entitlementEngine';
import { generateInsights } from '@/engine/insightEngine';
import { buildTopFlyInsights, buildTopFlyRecords, TopFlyRecord } from '@/engine/topFlyEngine';
import { AccessLevel, SubscriptionStatus } from '@/types/user';
import { AuthStatus, Invite, RemoteSessionSnapshot, SponsoredAccess, SyncQueueEntry, SyncStatusSnapshot } from '@/types/remote';
import {
  bootstrapLocalApp,
  enqueueLocalSyncChange,
  loadLocalAppData,
} from '@/services/localAppDataService';
import { bootstrapAuthSession, subscribeToAuthChanges } from '@/services/authService';
import { hasSupabaseConfig } from '@/services/supabaseClient';
import { syncQueueToSupabase } from '@/services/syncService';
import { fetchRemoteAccessSnapshot } from '@/services/remoteAccessService';
import { fetchRemoteSharedDataSnapshot } from '@/services/remoteSharedDataService';
import { createStoreActions } from '@/app/storeActions';
import { AppStore, UserDataCleanupCategory } from '@/app/storeTypes';
import { NotificationPermissionStatus, SharedDataStatus } from '@/types/appState';
import { getNotificationPermissionStatus } from '@/utils/sessionNotifications';

export type { UserDataCleanupCategory };

const Ctx = createContext<AppStore | null>(null);
const TESTING_PREMIUM_OVERRIDE = true;
const TESTING_ADMIN_OVERRIDE = true;

export const AppStoreProvider = ({ children }: { children: React.ReactNode }) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [allSessions, setAllSessions] = useState<Session[]>([]);
  const [sessionSegments, setSessionSegments] = useState<SessionSegment[]>([]);
  const [catchEvents, setCatchEvents] = useState<CatchEvent[]>([]);
  const [allCatchEvents, setAllCatchEvents] = useState<CatchEvent[]>([]);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [allExperiments, setAllExperiments] = useState<Experiment[]>([]);
  const [anglerComparisons, setAnglerComparisons] = useState<Insight[]>([]);
  const [topFlyRecords, setTopFlyRecords] = useState<TopFlyRecord[]>([]);
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
  const [authStatus, setAuthStatus] = useState<AuthStatus>(hasSupabaseConfig ? 'authenticating' : 'anonymous');
  const [remoteSession, setRemoteSession] = useState<RemoteSessionSnapshot | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const [sharedDataStatus, setSharedDataStatus] = useState<SharedDataStatus>('idle');
  const [notificationPermissionStatus, setNotificationPermissionStatus] = useState<NotificationPermissionStatus>('unknown');
  const [activeUserId, setActiveUserId] = useState<number | null>(null);
  const importSeededRef = useRef<string | null>(null);
  const sessionMap = useMemo(() => new Map(sessions.map((session) => [session.id, session])), [sessions]);
  const currentUser = useMemo(() => users.find((user) => user.id === activeUserId) ?? null, [activeUserId, users]);
  const completeExperiments = useMemo(() => experiments.filter((experiment) => experiment.status !== 'draft'), [experiments]);
  const storedOwnerUser = useMemo(() => users.find((user) => user.role === 'owner') ?? null, [users]);
  const ownerUser = useMemo(
    () => storedOwnerUser ?? (TESTING_ADMIN_OVERRIDE ? currentUser : null),
    [currentUser, storedOwnerUser]
  );
  const isSyncEnabled = hasSupabaseConfig && !!remoteSession;

  const selectActiveUser = async (id: number) => {
    setActiveUserId(id);
    await saveActiveUserId(id);
  };

  const bootstrap = async () => {
    const bootstrapped = await bootstrapLocalApp();
    setUsers(bootstrapped.users);
    setActiveUserId(bootstrapped.activeUserId);
  };

  const mergeById = <T extends { id: number }>(primary: T[], incoming: T[]) => {
    const map = new Map<number, T>();
    [...primary, ...incoming].forEach((item) => {
      map.set(item.id, item);
    });
    return [...map.values()];
  };

  const refresh = async (targetUserId?: number | null) => {
    const loaded = await loadLocalAppData(targetUserId ?? activeUserId);
    let nextUsers = loaded.users;
    let nextSessions = loaded.sessions;
    let nextAllSessions = loaded.allSessions;
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

    if (hasSupabaseConfig && remoteSession) {
      setSharedDataStatus('loading');
      try {
        const remoteAccess = await fetchRemoteAccessSnapshot(remoteSession.authUserId);
        const remoteShared = await fetchRemoteSharedDataSnapshot(remoteSession.authUserId, remoteAccess);
        setLastSyncError(null);
        setSharedDataStatus('ready');

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

        nextSessions = mergeById(loaded.sessions, remoteShared.ownedSessions);
        nextAllSessions = mergeById(loaded.allSessions, remoteShared.accessibleSessions);
        nextSessionSegments = mergeById(loaded.sessionSegments, remoteShared.ownedSessionSegments);
        nextCatchEvents = mergeById(loaded.catchEvents, remoteShared.ownedCatchEvents);
        nextAllCatchEvents = mergeById(loaded.allCatchEvents, remoteShared.accessibleCatchEvents);
        nextExperiments = mergeById(loaded.experiments, remoteShared.ownedExperiments);
        nextAllExperiments = mergeById(loaded.allExperiments, remoteShared.accessibleExperiments);
        nextSavedFlies = mergeById(loaded.savedFlies, remoteShared.savedFlies);
        nextSavedLeaderFormulas = mergeById(loaded.savedLeaderFormulas, remoteShared.savedLeaderFormulas);
        nextSavedRigPresets = mergeById(loaded.savedRigPresets, remoteShared.savedRigPresets);
        nextSavedRivers = mergeById(loaded.savedRivers, remoteShared.savedRivers);
      } catch (error) {
        console.error(error);
        setLastSyncError(error instanceof Error ? error.message : 'Unable to load shared data from Supabase.');
        setSharedDataStatus('error');
      }
    } else {
      setSharedDataStatus('idle');
    }

    setUsers(nextUsers);
    setSessions(nextSessions);
    setAllSessions(nextAllSessions);
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
    setAnglerComparisons(generateAnglerComparisons(nextUsers, nextAllSessions, nextAllExperiments.filter((experiment) => experiment.status !== 'draft')));
    setTopFlyRecords(buildTopFlyRecords(nextSessions, nextExperiments.filter((experiment) => experiment.status !== 'draft')));
  };

  const bindCurrentUserToRemoteSession = async (snapshot: RemoteSessionSnapshot) => {
    if (!currentUser) return;
    const nextEmail = snapshot.email ?? currentUser.email ?? null;
    if (currentUser.remoteAuthId === snapshot.authUserId && currentUser.email === nextEmail) {
      return;
    }

    await updateUser(currentUser.id, {
      remoteAuthId: snapshot.authUserId,
      email: nextEmail
    });
    await trackSyncChange('profile', 'update', currentUser.id, {
      remoteAuthId: snapshot.authUserId,
      email: nextEmail
    });
    await refresh(currentUser.id);
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
      await trackSyncChange('saved_setup', 'create', savedFly.id, savedFly);
    }

    for (const formula of loaded.savedLeaderFormulas) {
      await trackSyncChange('saved_setup', 'create', formula.id, formula);
    }

    for (const preset of loaded.savedRigPresets) {
      await trackSyncChange('saved_setup', 'create', preset.id, preset);
    }

    for (const river of loaded.savedRivers) {
      await trackSyncChange('saved_setup', 'create', river.id, river);
    }
  };

  useEffect(() => {
    bootstrap().catch(console.error);
  }, []);

  useEffect(() => {
    refresh().catch(console.error);
  }, [activeUserId]);

  useEffect(() => {
    if (!hasSupabaseConfig) {
      setAuthStatus('anonymous');
      setRemoteSession(null);
      setSharedDataStatus('idle');
      return;
    }

    let mounted = true;

    bootstrapAuthSession()
      .then((snapshot) => {
        if (!mounted) return;
        setRemoteSession(snapshot);
        setAuthStatus(snapshot ? 'authenticated' : 'anonymous');
      })
      .catch((error) => {
        console.error(error);
        if (!mounted) return;
        setRemoteSession(null);
        setAuthStatus('anonymous');
      });

    const unsubscribe = subscribeToAuthChanges((snapshot) => {
      if (!mounted) return;
      setRemoteSession(snapshot);
      setAuthStatus(snapshot ? 'authenticated' : 'anonymous');
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    getNotificationPermissionStatus()
      .then(setNotificationPermissionStatus)
      .catch((error) => {
        console.error(error);
        setNotificationPermissionStatus('unknown');
      });
  }, []);

  useEffect(() => {
    if (!remoteSession || !currentUser) return;

    bindCurrentUserToRemoteSession(remoteSession).catch(console.error);

    const importKey = `supabase_import_seeded_${remoteSession.authUserId}_${currentUser.id}`;
    if (importSeededRef.current === importKey) return;

    importSeededRef.current = importKey;
    (async () => {
      const existing = await getAppSetting(importKey);
      if (existing) return;
      await setAppSetting(importKey, new Date().toISOString());
      await enqueueImportSeed(currentUser);
      await refresh(currentUser.id);
      await flushSyncQueue();
    })().catch((error) => {
      console.error(error);
      importSeededRef.current = null;
    });
  }, [currentUser, remoteSession]);

  useEffect(() => {
    if (!remoteSession || !currentUser || isSyncing) return;
    const hasPendingEntries = syncQueue.some((entry) => entry.status === 'pending');
    if (!hasPendingEntries) return;

    const timeoutId = setTimeout(() => {
      flushSyncQueue().catch(console.error);
    }, 600);

    return () => clearTimeout(timeoutId);
  }, [currentUser, isSyncing, remoteSession, syncQueue]);

  const insights = useMemo(() => generateInsights(buildAggregates(sessions, completeExperiments)), [sessions, completeExperiments]);
  const topFlyInsights = useMemo(() => buildTopFlyInsights(topFlyRecords), [topFlyRecords]);
  const syncStatus = useMemo<SyncStatusSnapshot>(() => {
    const pendingCount = syncQueue.filter((entry) => entry.status === 'pending').length;
    const failedCount = syncQueue.filter((entry) => entry.status === 'failed').length;
    const syncedEntries = syncQueue.filter((entry) => entry.status === 'synced');
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
      lastError: lastSyncError
    };
  }, [isSyncing, lastSyncError, syncQueue]);

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
    if (!currentUser) {
      throw new Error('No active user selected.');
    }

    if (!hasSupabaseConfig) {
      throw new Error('Supabase is not configured yet. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY first.');
    }

    if (!remoteSession) {
      throw new Error('Sign in with your magic link before syncing shared data.');
    }

    setIsSyncing(true);
    setLastSyncError(null);
    try {
      const loaded = await loadLocalAppData(currentUser.id);
      await syncQueueToSupabase(
        {
          currentUser: {
            ...currentUser,
            email: remoteSession.email ?? currentUser.email ?? null,
            remoteAuthId: remoteSession.authUserId
          },
          remoteAuthUserId: remoteSession.authUserId,
          loaded
        },
        loaded.syncQueue
      );
      await refresh(currentUser.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to sync right now.';
      setLastSyncError(message);
      throw error;
    } finally {
      setIsSyncing(false);
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
    groups,
    groupMemberships,
    sharePreferences,
    competitions,
    competitionParticipants,
    invites,
    experiments,
    sessionMap,
    remoteSession,
    setActiveUserId,
    setRemoteSession,
    setAuthStatus,
    selectActiveUser,
    refresh,
    trackSyncChange,
    flushSyncQueueInternal: flushSyncQueue,
    updateUserAccess
  });

  return (
    <Ctx.Provider
      value={{
        sessions,
        allSessions,
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
        currentEntitlementLabel: TESTING_PREMIUM_OVERRIDE ? 'Testing access enabled' : getEntitlementLabel(currentUser),
        currentHasPremiumAccess: TESTING_PREMIUM_OVERRIDE ? true : hasPremiumAccess(currentUser) || hasPremiumAccess(ownerUser),
        canManageAccess: TESTING_ADMIN_OVERRIDE ? true : !!ownerUser,
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
        sharedDataStatus,
        notificationPermissionStatus,
        authStatus,
        remoteSession,
        isSyncEnabled,
        activeUserId,
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
