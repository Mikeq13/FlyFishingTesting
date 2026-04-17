import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Experiment, Insight } from '@/types/experiment';
import { SavedRiver, Session } from '@/types/session';
import { UserProfile } from '@/types/user';
import { FlySetup, SavedFly } from '@/types/fly';
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
import { createSession, deleteSessionsForUser, listSessions, updateSession } from '@/db/sessionRepo';
import { archiveExperiments, createExperiment, deleteDraftExperimentsForUser, deleteExperiments, deleteExperimentsForUser, listExperiments, updateExperiment } from '@/db/experimentRepo';
import { createUser, deleteUser, listUsers, updateUser } from '@/db/userRepo';
import { createSavedFly, deleteSavedFliesForUser, listSavedFlies } from '@/db/savedFlyRepo';
import { createSavedLeaderFormula, deleteSavedLeaderFormula, deleteSavedLeaderFormulasForUser, listSavedLeaderFormulas } from '@/db/savedLeaderFormulaRepo';
import { createSavedRigPreset, deleteSavedRigPreset, deleteSavedRigPresetsForUser, listSavedRigPresets } from '@/db/savedRigPresetRepo';
import { createSavedRiver, deleteSavedRiversForUser, listSavedRivers } from '@/db/savedRiverRepo';
import { createSessionSegment, deleteSessionSegmentsForUser, listSessionSegments, updateSessionSegment } from '@/db/sessionSegmentRepo';
import { createCatchEvent, deleteCatchEventsForUser, listCatchEvents } from '@/db/catchEventRepo';
import { getActiveUserId as loadActiveUserId, getAppSetting, setActiveUserId as saveActiveUserId, setAppSetting } from '@/db/settingsRepo';
import { buildAggregates } from '@/engine/aggregationEngine';
import { generateAnglerComparisons } from '@/engine/anglerComparisonEngine';
import { createTrialWindow, getEntitlementLabel, hasPremiumAccess } from '@/engine/entitlementEngine';
import { generateInsights } from '@/engine/insightEngine';
import { buildTopFlyInsights, buildTopFlyRecords, TopFlyRecord } from '@/engine/topFlyEngine';
import { isWithinDateRange } from '@/utils/dateRange';
import { AccessLevel, SubscriptionStatus } from '@/types/user';
import { AuthStatus, Invite, RemoteSessionSnapshot, SponsoredAccess, SyncQueueEntry, SyncStatusSnapshot } from '@/types/remote';
import {
  acceptLocalInvite,
  bootstrapLocalApp,
  clearLocalFishingDataForUser,
  clearLocalUserDataCategories,
  createLocalCompetitionWithParticipant,
  createLocalGroupWithDefaults,
  createLocalInvite,
  deleteLocalAnglerData,
  enqueueLocalSyncChange,
  joinLocalCompetitionByCode,
  joinLocalGroupByCode,
  loadLocalAppData,
  revokeLocalSponsoredAccess,
  saveLocalCompetitionAssignment,
  updateLocalSharePreference
} from '@/services/localAppDataService';
import { bootstrapAuthSession, signInWithMagicLink as requestMagicLink, signOutRemote as endRemoteSession, subscribeToAuthChanges } from '@/services/authService';
import { hasSupabaseConfig } from '@/services/supabaseClient';
import { syncQueueToSupabase } from '@/services/syncService';

export type UserDataCleanupCategory = 'drafts' | 'experiments' | 'sessions' | 'flies' | 'formulas' | 'rig_presets' | 'rivers' | 'all';

interface AppStore {
  sessions: Session[];
  allSessions: Session[];
  sessionSegments: SessionSegment[];
  catchEvents: CatchEvent[];
  allCatchEvents: CatchEvent[];
  experiments: Experiment[];
  allExperiments: Experiment[];
  insights: Insight[];
  anglerComparisons: Insight[];
  topFlyRecords: TopFlyRecord[];
  topFlyInsights: Insight[];
  users: UserProfile[];
  ownerUser: UserProfile | null;
  currentUser: UserProfile | null;
  currentEntitlementLabel: string;
  currentHasPremiumAccess: boolean;
  canManageAccess: boolean;
  savedFlies: SavedFly[];
  savedLeaderFormulas: LeaderFormula[];
  savedRigPresets: RigPreset[];
  savedRivers: SavedRiver[];
  groups: Group[];
  groupMemberships: GroupMembership[];
  sharePreferences: SharePreference[];
  competitions: Competition[];
  competitionGroups: CompetitionGroup[];
  competitionSessions: CompetitionSession[];
  competitionParticipants: CompetitionParticipant[];
  competitionAssignments: CompetitionSessionAssignment[];
  invites: Invite[];
  sponsoredAccess: SponsoredAccess[];
  syncQueue: SyncQueueEntry[];
  syncStatus: SyncStatusSnapshot;
  authStatus: AuthStatus;
  remoteSession: RemoteSessionSnapshot | null;
  isSyncEnabled: boolean;
  activeUserId: number | null;
  setActiveUserId: (id: number) => Promise<void>;
  signInWithMagicLink: (email: string) => Promise<void>;
  signOutRemote: () => Promise<void>;
  addUser: (name: string) => Promise<number>;
  addSavedFly: (payload: FlySetup) => Promise<number>;
  addSavedLeaderFormula: (payload: Omit<LeaderFormula, 'id' | 'userId' | 'createdAt'>) => Promise<number>;
  deleteSavedLeaderFormula: (formulaId: number) => Promise<void>;
  addSavedRigPreset: (payload: Omit<RigPreset, 'id' | 'userId' | 'createdAt'>) => Promise<number>;
  deleteSavedRigPreset: (presetId: number) => Promise<void>;
  addSavedRiver: (name: string) => Promise<number>;
  createGroup: (name: string) => Promise<Group>;
  joinGroup: (joinCode: string) => Promise<GroupMembership>;
  updateSharePreference: (groupId: number, updates: Omit<SharePreference, 'id' | 'userId' | 'groupId' | 'updatedAt'>) => Promise<void>;
  createCompetition: (payload: {
    name: string;
    groupCount: number;
    sessions: Array<{ sessionNumber: number; startTime: string; endTime: string }>;
  }) => Promise<Competition>;
  joinCompetition: (joinCode: string) => Promise<CompetitionParticipant>;
  createInvite: (payload: { targetGroupId: number; targetName?: string | null }) => Promise<Invite>;
  acceptInvite: (inviteCode: string) => Promise<Invite>;
  revokeSponsoredAccess: (sponsoredAccessId: number) => Promise<void>;
  upsertCompetitionAssignment: (payload: Omit<CompetitionSessionAssignment, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<CompetitionSessionAssignment>;
  upsertCompetitionAssignmentForUser: (userId: number, payload: Omit<CompetitionSessionAssignment, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<CompetitionSessionAssignment>;
  flushSyncQueue: () => Promise<void>;
  updateUserAccess: (userId: number, next: { accessLevel: AccessLevel; subscriptionStatus: SubscriptionStatus; trialStartedAt?: string | null; trialEndsAt?: string | null; subscriptionExpiresAt?: string | null; grantedByUserId?: number | null; }) => Promise<void>;
  startTrialForUser: (userId: number) => Promise<void>;
  grantPowerUserAccess: (userId: number) => Promise<void>;
  markSubscriberAccess: (userId: number, expiresAt?: string | null) => Promise<void>;
  clearUserAccess: (userId: number) => Promise<void>;
  clearFishingDataForUser: (userId: number) => Promise<void>;
  clearUserDataCategories: (userId: number, categories: UserDataCleanupCategory[]) => Promise<void>;
  deleteAngler: (userId: number) => Promise<void>;
  archiveExperiment: (experimentId: number) => Promise<void>;
  deleteExperiment: (experimentId: number) => Promise<void>;
  cleanupExperimentsForCurrentUser: (filters: { from?: string; to?: string; outcome?: Experiment['outcome'] | 'all'; action: 'archive' | 'delete'; }) => Promise<number>;
  refresh: (targetUserId?: number | null) => Promise<void>;
  addSession: (payload: Omit<Session, 'id' | 'userId'>) => Promise<number>;
  updateSessionEntry: (sessionId: number, payload: Omit<Session, 'id' | 'userId'>) => Promise<void>;
  addSessionSegment: (payload: Omit<SessionSegment, 'id' | 'userId'>) => Promise<number>;
  updateSessionSegmentEntry: (segmentId: number, payload: Omit<SessionSegment, 'id' | 'userId'>) => Promise<void>;
  addCatchEvent: (payload: Omit<CatchEvent, 'id' | 'userId'>) => Promise<number>;
  addExperiment: (payload: Omit<Experiment, 'id' | 'userId'>) => Promise<number>;
  updateExperimentEntry: (experimentId: number, payload: Omit<Experiment, 'id' | 'userId'>) => Promise<void>;
  archiveInconclusiveExperiments: (range: { from?: string; to?: string }) => Promise<number>;
}

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

  const refresh = async (targetUserId?: number | null) => {
    const loaded = await loadLocalAppData(targetUserId ?? activeUserId);
    setUsers(loaded.users);
    setSessions(loaded.sessions);
    setAllSessions(loaded.allSessions);
    setSessionSegments(loaded.sessionSegments);
    setCatchEvents(loaded.catchEvents);
    setAllCatchEvents(loaded.allCatchEvents);
    setExperiments(loaded.experiments);
    setAllExperiments(loaded.allExperiments);
    setSavedFlies(loaded.savedFlies);
    setSavedLeaderFormulas(loaded.savedLeaderFormulas);
    setSavedRigPresets(loaded.savedRigPresets);
    setSavedRivers(loaded.savedRivers);
    setGroups(loaded.groups);
    setGroupMemberships(loaded.groupMemberships);
    setSharePreferences(loaded.sharePreferences);
    setCompetitions(loaded.competitions);
    setCompetitionGroups(loaded.competitionGroups);
    setCompetitionSessions(loaded.competitionSessions);
    setCompetitionParticipants(loaded.competitionParticipants);
    setCompetitionAssignments(loaded.competitionAssignments);
    setInvites(loaded.invites);
    setSponsoredAccess(loaded.sponsoredAccess);
    setSyncQueue(loaded.syncQueue);
    setAnglerComparisons(loaded.anglerComparisons);
    setTopFlyRecords(loaded.topFlyRecords);
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
      pendingCount,
      failedCount,
      syncedCount: syncedEntries.length,
      lastSyncedAt
    };
  }, [syncQueue]);

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
        authStatus,
        remoteSession,
        isSyncEnabled,
        activeUserId,
        setActiveUserId: selectActiveUser,
        signInWithMagicLink: async (email) => {
          if (!hasSupabaseConfig) {
            throw new Error('Supabase is not configured yet. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY first.');
          }
          setAuthStatus('authenticating');
          try {
            await requestMagicLink(email);
          } catch (error) {
            setAuthStatus(remoteSession ? 'authenticated' : 'anonymous');
            throw error;
          }
        },
        signOutRemote: async () => {
          await endRemoteSession();
          setRemoteSession(null);
          setAuthStatus('anonymous');
        },
        addUser: async (name) => {
          const id = await createUser(name);
          await trackSyncChange('profile', 'create', id, { name });
          await saveActiveUserId(id);
          setActiveUserId(id);
          await refresh(id);
          return id;
        },
        addSavedFly: async (payload) => {
          if (!activeUserId) throw new Error('No active user selected.');
          const id = await createSavedFly({ ...payload, userId: activeUserId });
          await trackSyncChange('saved_setup', 'create', id, payload);
          await refresh(activeUserId);
          return id;
        },
        addSavedLeaderFormula: async (payload) => {
          if (!activeUserId) throw new Error('No active user selected.');
          const id = await createSavedLeaderFormula({ ...payload, userId: activeUserId });
          await trackSyncChange('saved_setup', 'create', id, payload);
          await refresh(activeUserId);
          return id;
        },
        deleteSavedLeaderFormula: async (formulaId) => {
          await deleteSavedLeaderFormula(formulaId);
          await trackSyncChange('saved_setup', 'delete', formulaId, { formulaId });
          await refresh(activeUserId);
        },
        addSavedRigPreset: async (payload) => {
          if (!activeUserId) throw new Error('No active user selected.');
          const id = await createSavedRigPreset({ ...payload, userId: activeUserId });
          await trackSyncChange('saved_setup', 'create', id, payload);
          await refresh(activeUserId);
          return id;
        },
        deleteSavedRigPreset: async (presetId) => {
          await deleteSavedRigPreset(presetId);
          await trackSyncChange('saved_setup', 'delete', presetId, { presetId });
          await refresh(activeUserId);
        },
        addSavedRiver: async (name) => {
          if (!activeUserId) throw new Error('No active user selected.');
          const id = await createSavedRiver({ userId: activeUserId, name });
          await trackSyncChange('saved_setup', 'create', id, { name });
          await refresh(activeUserId);
          return id;
        },
        createGroup: async (name) => {
          if (!activeUserId) throw new Error('No active user selected.');
          const group = await createLocalGroupWithDefaults(activeUserId, name);
          await trackSyncChange('group', 'create', group.id, group);
          const refreshed = await loadLocalAppData(activeUserId);
          const membership = refreshed.groupMemberships.find((entry) => entry.groupId === group.id && entry.userId === activeUserId);
          if (membership) {
            await trackSyncChange('group_membership', 'create', membership.id, membership);
          }
          await refresh(activeUserId);
          return group;
        },
        joinGroup: async (joinCode) => {
          if (!activeUserId) throw new Error('No active user selected.');
          const membership = await joinLocalGroupByCode(activeUserId, joinCode, groups, groupMemberships);
          await trackSyncChange('group_membership', 'join', membership.id, { joinCode, membership });
          await refresh(activeUserId);
          return membership;
        },
        updateSharePreference: async (groupId, updates) => {
          if (!activeUserId) throw new Error('No active user selected.');
          await updateLocalSharePreference(activeUserId, groupId, updates);
          const refreshed = await loadLocalAppData(activeUserId);
          const preference = refreshed.sharePreferences.find((entry) => entry.groupId === groupId && entry.userId === activeUserId);
          if (preference) {
            await trackSyncChange('share_preference', 'update', preference.id, { groupId, preferenceId: preference.id, updates });
          }
          await refresh(activeUserId);
        },
        createCompetition: async (payload) => {
          if (!activeUserId) throw new Error('No active user selected.');
          const competition = await createLocalCompetitionWithParticipant(activeUserId, payload);
          await trackSyncChange('competition', 'create', competition.id, competition);
          const refreshed = await loadLocalAppData(activeUserId);
          for (const group of refreshed.competitionGroups.filter((entry) => entry.competitionId === competition.id)) {
            await trackSyncChange('competition_group', 'create', group.id, group);
          }
          for (const session of refreshed.competitionSessions.filter((entry) => entry.competitionId === competition.id)) {
            await trackSyncChange('competition_session', 'create', session.id, session);
          }
          for (const participant of refreshed.competitionParticipants.filter((entry) => entry.competitionId === competition.id)) {
            await trackSyncChange('competition_participant', participant.userId === activeUserId ? 'join' : 'create', participant.id, participant);
          }
          await refresh(activeUserId);
          return competition;
        },
        joinCompetition: async (joinCode) => {
          if (!activeUserId) throw new Error('No active user selected.');
          const participant = await joinLocalCompetitionByCode(activeUserId, joinCode, competitions, competitionParticipants);
          await trackSyncChange('competition_participant', 'join', participant.id, { joinCode, participant });
          await refresh(activeUserId);
          return participant;
        },
        createInvite: async (payload) => {
          if (!activeUserId) throw new Error('No active user selected.');
          const invite = await createLocalInvite(activeUserId, payload);
          await trackSyncChange('invite', 'create', invite.id, invite);
          await refresh(activeUserId);
          return invite;
        },
        acceptInvite: async (inviteCode) => {
          if (!activeUserId) throw new Error('No active user selected.');
          const invite = await acceptLocalInvite(activeUserId, inviteCode, invites, groupMemberships);
          await trackSyncChange('invite', 'accept', invite.id, { inviteCode, inviteId: invite.id });
          const refreshed = await loadLocalAppData(activeUserId);
          const membership = refreshed.groupMemberships.find(
            (entry) => entry.userId === activeUserId && entry.groupId === invite.targetGroupId
          );
          if (membership) {
            await trackSyncChange('group_membership', 'join', membership.id, membership);
          }
          const sponsored = refreshed.sponsoredAccess.find(
            (entry) => entry.sponsoredUserId === activeUserId && entry.targetGroupId === invite.targetGroupId && entry.active
          );
          if (sponsored) {
            await trackSyncChange('sponsored_access', 'create', sponsored.id, sponsored);
          }
          await refresh(activeUserId);
          return invite;
        },
        revokeSponsoredAccess: async (sponsoredAccessId) => {
          await revokeLocalSponsoredAccess(sponsoredAccessId);
          await trackSyncChange('sponsored_access', 'revoke', sponsoredAccessId, { sponsoredAccessId });
          await refresh(activeUserId);
        },
        upsertCompetitionAssignment: async (payload) => {
          if (!activeUserId) throw new Error('No active user selected.');
          const assignment = await saveLocalCompetitionAssignment(activeUserId, payload);
          await trackSyncChange('competition_assignment', 'update', assignment.id, assignment);
          await refresh(activeUserId);
          return assignment;
        },
        upsertCompetitionAssignmentForUser: async (userId, payload) => {
          const assignment = await saveLocalCompetitionAssignment(userId, payload);
          await trackSyncChange('competition_assignment', 'update', assignment.id, assignment);
          await refresh(activeUserId);
          return assignment;
        },
        flushSyncQueue: async () => {
          await flushSyncQueue();
        },
        updateUserAccess,
        startTrialForUser: async (userId) => {
          const trialWindow = createTrialWindow();
          await updateUserAccess(userId, {
            accessLevel: 'trial',
            subscriptionStatus: 'trialing',
            trialStartedAt: trialWindow.trialStartedAt,
            trialEndsAt: trialWindow.trialEndsAt,
            subscriptionExpiresAt: null,
            grantedByUserId: activeUserId
          });
        },
        grantPowerUserAccess: async (userId) => {
          await updateUserAccess(userId, {
            accessLevel: 'power_user',
            subscriptionStatus: 'power_user',
            trialStartedAt: null,
            trialEndsAt: null,
            subscriptionExpiresAt: null,
            grantedByUserId: activeUserId
          });
        },
        markSubscriberAccess: async (userId, expiresAt = null) => {
          await updateUserAccess(userId, {
            accessLevel: 'subscriber',
            subscriptionStatus: 'active',
            trialStartedAt: null,
            trialEndsAt: null,
            subscriptionExpiresAt: expiresAt,
            grantedByUserId: activeUserId
          });
        },
        clearUserAccess: async (userId) => {
          const target = users.find((user) => user.id === userId);
          await updateUserAccess(userId, {
            accessLevel: target?.role === 'owner' ? 'power_user' : 'free',
            subscriptionStatus: target?.role === 'owner' ? 'power_user' : 'not_started',
            trialStartedAt: null,
            trialEndsAt: null,
            subscriptionExpiresAt: null,
            grantedByUserId: activeUserId
          });
        },
        clearFishingDataForUser: async (userId) => {
          await clearLocalFishingDataForUser(userId);
          await refresh(activeUserId);
        },
        clearUserDataCategories: async (userId, categories) => {
          await clearLocalUserDataCategories(userId, categories);
          await refresh(activeUserId);
        },
        deleteAngler: async (userId) => {
          const target = users.find((user) => user.id === userId);
          if (!target || target.role === 'owner') {
            throw new Error('Owner profile cannot be deleted.');
          }

          await deleteLocalAnglerData(userId);

          const remainingUsers = (await listUsers()).filter((user) => user.id !== userId);
          const fallbackUserId = remainingUsers.find((user) => user.role === 'owner')?.id ?? remainingUsers[0]?.id ?? null;

          if (activeUserId === userId && fallbackUserId) {
            await selectActiveUser(fallbackUserId);
            await refresh(fallbackUserId);
            return;
          }

          await refresh(fallbackUserId ?? activeUserId);
        },
        archiveExperiment: async (experimentId) => {
          await archiveExperiments([experimentId]);
          await refresh(activeUserId);
        },
        deleteExperiment: async (experimentId) => {
          await deleteExperiments([experimentId]);
          await refresh(activeUserId);
        },
        cleanupExperimentsForCurrentUser: async ({ from, to, outcome = 'all', action }) => {
          const experimentIds = experiments
            .filter((experiment) => {
              const session = sessionMap.get(experiment.sessionId);
              if (!session) return false;
              if (outcome !== 'all' && experiment.outcome !== outcome) return false;
              return isWithinDateRange(session.date, { from, to });
            })
            .map((experiment) => experiment.id);

          if (!experimentIds.length) return 0;

          if (action === 'archive') {
            await archiveExperiments(experimentIds);
          } else {
            await deleteExperiments(experimentIds);
          }

          await refresh(activeUserId);
          return experimentIds.length;
        },
        refresh,
        addSession: async (payload) => {
          if (!activeUserId) throw new Error('No active user selected.');
          const id = await createSession({ ...payload, userId: activeUserId });
          await trackSyncChange('session', 'create', id, payload);
          await refresh();
          return id;
        },
        updateSessionEntry: async (sessionId, payload) => {
          await updateSession(sessionId, payload);
          await trackSyncChange('session', 'update', sessionId, payload);
          await refresh(activeUserId);
        },
        addSessionSegment: async (payload) => {
          if (!activeUserId) throw new Error('No active user selected.');
          const id = await createSessionSegment({ ...payload, userId: activeUserId });
          await trackSyncChange('session_segment', 'create', id, payload);
          await refresh(activeUserId);
          return id;
        },
        updateSessionSegmentEntry: async (segmentId, payload) => {
          await updateSessionSegment(segmentId, payload);
          await trackSyncChange('session_segment', 'update', segmentId, payload);
          await refresh(activeUserId);
        },
        addCatchEvent: async (payload) => {
          if (!activeUserId) throw new Error('No active user selected.');
          const id = await createCatchEvent({ ...payload, userId: activeUserId });
          await trackSyncChange('catch_event', 'create', id, payload);
          await refresh(activeUserId);
          return id;
        },
        addExperiment: async (payload) => {
          if (!activeUserId) throw new Error('No active user selected.');
          const id = await createExperiment({ ...payload, userId: activeUserId });
          await trackSyncChange('experiment', 'create', id, payload);
          await refresh();
          return id;
        },
        updateExperimentEntry: async (experimentId, payload) => {
          await updateExperiment(experimentId, payload);
          await trackSyncChange('experiment', 'update', experimentId, payload);
          await refresh(activeUserId);
        },
        archiveInconclusiveExperiments: async ({ from, to }) => {
          const experimentIds = experiments
            .filter((experiment) => {
              if (experiment.outcome !== 'inconclusive') return false;
              const session = sessionMap.get(experiment.sessionId);
              if (!session) return false;
              return isWithinDateRange(session.date, { from, to });
            })
            .map((experiment) => experiment.id);

          await archiveExperiments(experimentIds);
          await refresh(activeUserId);
          return experimentIds.length;
        }
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
