import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Experiment, Insight } from '@/types/experiment';
import { SavedRiver, Session } from '@/types/session';
import { UserProfile } from '@/types/user';
import { FlySetup, SavedFly } from '@/types/fly';
import { createSession, deleteSessionsForUser, listSessions } from '@/db/sessionRepo';
import { archiveExperiments, createExperiment, deleteExperimentsForUser, listExperiments } from '@/db/experimentRepo';
import { createUser, deleteUser, listUsers, updateUser } from '@/db/userRepo';
import { createSavedFly, deleteSavedFliesForUser, listSavedFlies } from '@/db/savedFlyRepo';
import { createSavedRiver, deleteSavedRiversForUser, listSavedRivers } from '@/db/savedRiverRepo';
import { getActiveUserId as loadActiveUserId, setActiveUserId as saveActiveUserId } from '@/db/settingsRepo';
import { initDb } from '@/db/schema';
import { buildAggregates } from '@/engine/aggregationEngine';
import { generateAnglerComparisons } from '@/engine/anglerComparisonEngine';
import { createTrialWindow, getEntitlementLabel, hasPremiumAccess } from '@/engine/entitlementEngine';
import { generateInsights } from '@/engine/insightEngine';
import { buildTopFlyInsights, buildTopFlyRecords, TopFlyRecord } from '@/engine/topFlyEngine';
import { isWithinDateRange } from '@/utils/dateRange';
import { AccessLevel, SubscriptionStatus } from '@/types/user';

interface AppStore {
  sessions: Session[];
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
  savedRivers: SavedRiver[];
  activeUserId: number | null;
  setActiveUserId: (id: number) => Promise<void>;
  addUser: (name: string) => Promise<number>;
  addSavedFly: (payload: FlySetup) => Promise<number>;
  addSavedRiver: (name: string) => Promise<number>;
  updateUserAccess: (userId: number, next: { accessLevel: AccessLevel; subscriptionStatus: SubscriptionStatus; trialStartedAt?: string | null; trialEndsAt?: string | null; subscriptionExpiresAt?: string | null; grantedByUserId?: number | null; }) => Promise<void>;
  startTrialForUser: (userId: number) => Promise<void>;
  grantPowerUserAccess: (userId: number) => Promise<void>;
  markSubscriberAccess: (userId: number, expiresAt?: string | null) => Promise<void>;
  clearUserAccess: (userId: number) => Promise<void>;
  clearFishingDataForUser: (userId: number) => Promise<void>;
  deleteAngler: (userId: number) => Promise<void>;
  refresh: (targetUserId?: number | null) => Promise<void>;
  addSession: (payload: Omit<Session, 'id' | 'userId'>) => Promise<number>;
  addExperiment: (payload: Omit<Experiment, 'id' | 'userId'>) => Promise<number>;
  archiveInconclusiveExperiments: (range: { from?: string; to?: string }) => Promise<number>;
}

const Ctx = createContext<AppStore | null>(null);
const TESTING_PREMIUM_OVERRIDE = true;

export const AppStoreProvider = ({ children }: { children: React.ReactNode }) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [anglerComparisons, setAnglerComparisons] = useState<Insight[]>([]);
  const [topFlyRecords, setTopFlyRecords] = useState<TopFlyRecord[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [savedFlies, setSavedFlies] = useState<SavedFly[]>([]);
  const [savedRivers, setSavedRivers] = useState<SavedRiver[]>([]);
  const [activeUserId, setActiveUserId] = useState<number | null>(null);
  const sessionMap = useMemo(() => new Map(sessions.map((session) => [session.id, session])), [sessions]);
  const currentUser = useMemo(() => users.find((user) => user.id === activeUserId) ?? null, [activeUserId, users]);
  const ownerUser = useMemo(() => users.find((user) => user.role === 'owner') ?? null, [users]);

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
        const ownerId = existingUsers.some((user) => user.id === storedActiveUserId) ? storedActiveUserId : existingUsers[0].id;
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
      setExperiments([]);
      setSavedFlies([]);
      setSavedRivers([]);
      setAnglerComparisons([]);
      setTopFlyRecords([]);
      return;
    }
    const [s, e, flies, rivers] = await Promise.all([listSessions(uid), listExperiments(uid), listSavedFlies(uid), listSavedRivers(uid)]);
    const allSessionLists = await Promise.all(allUsers.map((user) => listSessions(user.id)));
    const allExperimentLists = await Promise.all(allUsers.map((user) => listExperiments(user.id)));
    setSessions(s);
    setExperiments(e);
    setSavedFlies(flies);
    setSavedRivers(rivers);
    setAnglerComparisons(generateAnglerComparisons(allUsers, allSessionLists.flat(), allExperimentLists.flat()));
    setTopFlyRecords(buildTopFlyRecords(s, e));
  };

  useEffect(() => {
    bootstrap().catch(console.error);
  }, []);

  useEffect(() => {
    refresh().catch(console.error);
  }, [activeUserId]);

  const insights = useMemo(() => generateInsights(buildAggregates(sessions, experiments)), [sessions, experiments]);
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
        canManageAccess: !!ownerUser,
        savedFlies,
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
          await deleteExperimentsForUser(userId);
          await deleteSessionsForUser(userId);
          await deleteSavedFliesForUser(userId);
          await deleteSavedRiversForUser(userId);
          await refresh(activeUserId);
        },
        deleteAngler: async (userId) => {
          const target = users.find((user) => user.id === userId);
          if (!target || target.role === 'owner') {
            throw new Error('Owner profile cannot be deleted.');
          }

          await deleteExperimentsForUser(userId);
          await deleteSessionsForUser(userId);
          await deleteSavedFliesForUser(userId);
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
        refresh,
        addSession: async (payload) => {
          if (!activeUserId) throw new Error('No active user selected.');
          const id = await createSession({ ...payload, userId: activeUserId });
          await refresh();
          return id;
        },
        addExperiment: async (payload) => {
          if (!activeUserId) throw new Error('No active user selected.');
          const id = await createExperiment({ ...payload, userId: activeUserId });
          await refresh();
          return id;
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
