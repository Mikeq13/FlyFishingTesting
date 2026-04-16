import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Experiment, Insight } from '@/types/experiment';
import { SavedRiver, Session } from '@/types/session';
import { UserProfile } from '@/types/user';
import { FlySetup, SavedFly } from '@/types/fly';
import { CatchEvent, SessionSegment } from '@/types/activity';
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
import { getActiveUserId as loadActiveUserId, setActiveUserId as saveActiveUserId } from '@/db/settingsRepo';
import { initDb } from '@/db/schema';
import { buildAggregates } from '@/engine/aggregationEngine';
import { generateAnglerComparisons } from '@/engine/anglerComparisonEngine';
import { createTrialWindow, getEntitlementLabel, hasPremiumAccess } from '@/engine/entitlementEngine';
import { generateInsights } from '@/engine/insightEngine';
import { buildTopFlyInsights, buildTopFlyRecords, TopFlyRecord } from '@/engine/topFlyEngine';
import { isWithinDateRange } from '@/utils/dateRange';
import { AccessLevel, SubscriptionStatus } from '@/types/user';

export type UserDataCleanupCategory = 'drafts' | 'experiments' | 'sessions' | 'flies' | 'formulas' | 'rig_presets' | 'rivers' | 'all';

interface AppStore {
  sessions: Session[];
  sessionSegments: SessionSegment[];
  catchEvents: CatchEvent[];
  experiments: Experiment[];
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
  activeUserId: number | null;
  setActiveUserId: (id: number) => Promise<void>;
  addUser: (name: string) => Promise<number>;
  addSavedFly: (payload: FlySetup) => Promise<number>;
  addSavedLeaderFormula: (payload: Omit<LeaderFormula, 'id' | 'userId' | 'createdAt'>) => Promise<number>;
  deleteSavedLeaderFormula: (formulaId: number) => Promise<void>;
  addSavedRigPreset: (payload: Omit<RigPreset, 'id' | 'userId' | 'createdAt'>) => Promise<number>;
  deleteSavedRigPreset: (presetId: number) => Promise<void>;
  addSavedRiver: (name: string) => Promise<number>;
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
  const [sessionSegments, setSessionSegments] = useState<SessionSegment[]>([]);
  const [catchEvents, setCatchEvents] = useState<CatchEvent[]>([]);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [anglerComparisons, setAnglerComparisons] = useState<Insight[]>([]);
  const [topFlyRecords, setTopFlyRecords] = useState<TopFlyRecord[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [savedFlies, setSavedFlies] = useState<SavedFly[]>([]);
  const [savedLeaderFormulas, setSavedLeaderFormulas] = useState<LeaderFormula[]>([]);
  const [savedRigPresets, setSavedRigPresets] = useState<RigPreset[]>([]);
  const [savedRivers, setSavedRivers] = useState<SavedRiver[]>([]);
  const [activeUserId, setActiveUserId] = useState<number | null>(null);
  const sessionMap = useMemo(() => new Map(sessions.map((session) => [session.id, session])), [sessions]);
  const currentUser = useMemo(() => users.find((user) => user.id === activeUserId) ?? null, [activeUserId, users]);
  const completeExperiments = useMemo(() => experiments.filter((experiment) => experiment.status !== 'draft'), [experiments]);
  const storedOwnerUser = useMemo(() => users.find((user) => user.role === 'owner') ?? null, [users]);
  const ownerUser = useMemo(
    () => storedOwnerUser ?? (TESTING_ADMIN_OVERRIDE ? currentUser : null),
    [currentUser, storedOwnerUser]
  );

  const selectActiveUser = async (id: number) => {
    setActiveUserId(id);
    await saveActiveUserId(id);
  };

  const bootstrap = async () => {
    await initDb();
    let existingUsers = await listUsers();
    if (!existingUsers.length) {
      const id = await createUser({ name: 'Primary Angler', role: 'owner', accessLevel: 'power_user', subscriptionStatus: 'power_user' });
      await saveActiveUserId(id);
      setActiveUserId(id);
      existingUsers = await listUsers();
      setUsers(existingUsers);
    } else {
      const owner = existingUsers.find((user) => user.role === 'owner');
      if (!owner && existingUsers[0]) {
        const storedActiveUserId = await loadActiveUserId();
        const ownerId = storedActiveUserId && existingUsers.some((user) => user.id === storedActiveUserId) ? storedActiveUserId : existingUsers[0].id;
        await updateUser(ownerId, { role: 'owner', accessLevel: 'power_user', subscriptionStatus: 'power_user' });
        existingUsers = await listUsers();
      }
      const storedActiveUserId = await loadActiveUserId();
      const nextActiveUserId = existingUsers.some((user) => user.id === storedActiveUserId) ? storedActiveUserId : existingUsers[0].id;
      if (nextActiveUserId) {
        await saveActiveUserId(nextActiveUserId);
      }
      setUsers(existingUsers);
      setActiveUserId(nextActiveUserId);
    }
  };

  const refresh = async (targetUserId?: number | null) => {
    const allUsers = await listUsers();
    setUsers(allUsers);
    const uid = targetUserId ?? activeUserId ?? allUsers[0]?.id;
    if (!uid) {
      setSessions([]);
      setSessionSegments([]);
      setCatchEvents([]);
      setExperiments([]);
      setSavedFlies([]);
      setSavedLeaderFormulas([]);
      setSavedRigPresets([]);
      setSavedRivers([]);
      setAnglerComparisons([]);
      setTopFlyRecords([]);
      return;
    }
    const [s, segments, catches, e, flies, leaderFormulas, rigPresets, rivers] = await Promise.all([
      listSessions(uid),
      listSessionSegments(uid),
      listCatchEvents(uid),
      listExperiments(uid),
      listSavedFlies(uid),
      listSavedLeaderFormulas(uid),
      listSavedRigPresets(uid),
      listSavedRivers(uid)
    ]);
    const allSessionLists = await Promise.all(allUsers.map((user) => listSessions(user.id)));
    const allExperimentLists = await Promise.all(allUsers.map((user) => listExperiments(user.id)));
    setSessions(s);
    setSessionSegments(segments);
    setCatchEvents(catches);
    setExperiments(e);
    setSavedFlies(flies);
    setSavedLeaderFormulas(leaderFormulas);
    setSavedRigPresets(rigPresets);
    setSavedRivers(rivers);
    setAnglerComparisons(
      generateAnglerComparisons(
        allUsers,
        allSessionLists.flat(),
        allExperimentLists.flat().filter((experiment) => experiment.status !== 'draft')
      )
    );
    setTopFlyRecords(buildTopFlyRecords(s, e.filter((experiment) => experiment.status !== 'draft')));
  };

  useEffect(() => {
    bootstrap().catch(console.error);
  }, []);

  useEffect(() => {
    refresh().catch(console.error);
  }, [activeUserId]);

  const insights = useMemo(() => generateInsights(buildAggregates(sessions, completeExperiments)), [sessions, completeExperiments]);
  const topFlyInsights = useMemo(() => buildTopFlyInsights(topFlyRecords), [topFlyRecords]);

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
    await refresh(activeUserId);
  };

  return (
    <Ctx.Provider
      value={{
        sessions,
        sessionSegments,
        catchEvents,
        experiments,
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
        activeUserId,
        setActiveUserId: selectActiveUser,
        addUser: async (name) => {
          const id = await createUser(name);
          await saveActiveUserId(id);
          setActiveUserId(id);
          await refresh(id);
          return id;
        },
        addSavedFly: async (payload) => {
          if (!activeUserId) throw new Error('No active user selected.');
          const id = await createSavedFly({ ...payload, userId: activeUserId });
          await refresh(activeUserId);
          return id;
        },
        addSavedLeaderFormula: async (payload) => {
          if (!activeUserId) throw new Error('No active user selected.');
          const id = await createSavedLeaderFormula({ ...payload, userId: activeUserId });
          await refresh(activeUserId);
          return id;
        },
        deleteSavedLeaderFormula: async (formulaId) => {
          await deleteSavedLeaderFormula(formulaId);
          await refresh(activeUserId);
        },
        addSavedRigPreset: async (payload) => {
          if (!activeUserId) throw new Error('No active user selected.');
          const id = await createSavedRigPreset({ ...payload, userId: activeUserId });
          await refresh(activeUserId);
          return id;
        },
        deleteSavedRigPreset: async (presetId) => {
          await deleteSavedRigPreset(presetId);
          await refresh(activeUserId);
        },
        addSavedRiver: async (name) => {
          if (!activeUserId) throw new Error('No active user selected.');
          const id = await createSavedRiver({ userId: activeUserId, name });
          await refresh(activeUserId);
          return id;
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
          await deleteCatchEventsForUser(userId);
          await deleteSessionSegmentsForUser(userId);
          await deleteExperimentsForUser(userId);
          await deleteSessionsForUser(userId);
          await deleteSavedFliesForUser(userId);
          await deleteSavedLeaderFormulasForUser(userId);
          await deleteSavedRigPresetsForUser(userId);
          await deleteSavedRiversForUser(userId);
          await refresh(activeUserId);
        },
        clearUserDataCategories: async (userId, categories) => {
          const targets = categories.includes('all')
            ? ['experiments', 'sessions', 'flies', 'formulas', 'rig_presets', 'rivers']
            : categories;

          if (targets.includes('sessions')) {
            await deleteCatchEventsForUser(userId);
            await deleteSessionSegmentsForUser(userId);
            await deleteExperimentsForUser(userId);
            await deleteSessionsForUser(userId);
          } else if (targets.includes('experiments')) {
            await deleteExperimentsForUser(userId);
          }

          if (targets.includes('drafts')) {
            await deleteDraftExperimentsForUser(userId);
          }

          if (targets.includes('flies')) {
            await deleteSavedFliesForUser(userId);
          }

          if (targets.includes('formulas')) {
            await deleteSavedLeaderFormulasForUser(userId);
          }

          if (targets.includes('rig_presets')) {
            await deleteSavedRigPresetsForUser(userId);
          }

          if (targets.includes('rivers')) {
            await deleteSavedRiversForUser(userId);
          }

          await refresh(activeUserId);
        },
        deleteAngler: async (userId) => {
          const target = users.find((user) => user.id === userId);
          if (!target || target.role === 'owner') {
            throw new Error('Owner profile cannot be deleted.');
          }

          await deleteExperimentsForUser(userId);
          await deleteCatchEventsForUser(userId);
          await deleteSessionSegmentsForUser(userId);
          await deleteSessionsForUser(userId);
          await deleteSavedFliesForUser(userId);
          await deleteSavedLeaderFormulasForUser(userId);
          await deleteSavedRigPresetsForUser(userId);
          await deleteSavedRiversForUser(userId);
          await deleteUser(userId);

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
          await refresh();
          return id;
        },
        updateSessionEntry: async (sessionId, payload) => {
          await updateSession(sessionId, payload);
          await refresh(activeUserId);
        },
        addSessionSegment: async (payload) => {
          if (!activeUserId) throw new Error('No active user selected.');
          const id = await createSessionSegment({ ...payload, userId: activeUserId });
          await refresh(activeUserId);
          return id;
        },
        updateSessionSegmentEntry: async (segmentId, payload) => {
          await updateSessionSegment(segmentId, payload);
          await refresh(activeUserId);
        },
        addCatchEvent: async (payload) => {
          if (!activeUserId) throw new Error('No active user selected.');
          const id = await createCatchEvent({ ...payload, userId: activeUserId });
          await refresh(activeUserId);
          return id;
        },
        addExperiment: async (payload) => {
          if (!activeUserId) throw new Error('No active user selected.');
          const id = await createExperiment({ ...payload, userId: activeUserId });
          await refresh();
          return id;
        },
        updateExperimentEntry: async (experimentId, payload) => {
          await updateExperiment(experimentId, payload);
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
