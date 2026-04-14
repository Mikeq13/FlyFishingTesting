import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Experiment, Insight } from '@/types/experiment';
import { SavedRiver, Session } from '@/types/session';
import { UserProfile } from '@/types/user';
import { FlySetup, SavedFly } from '@/types/fly';
import { createSession, listSessions } from '@/db/sessionRepo';
import { archiveExperiments, createExperiment, listExperiments } from '@/db/experimentRepo';
import { createUser, listUsers } from '@/db/userRepo';
import { createSavedFly, listSavedFlies } from '@/db/savedFlyRepo';
import { createSavedRiver, listSavedRivers } from '@/db/savedRiverRepo';
import { getActiveUserId as loadActiveUserId, setActiveUserId as saveActiveUserId } from '@/db/settingsRepo';
import { initDb } from '@/db/schema';
import { buildAggregates } from '@/engine/aggregationEngine';
import { generateAnglerComparisons } from '@/engine/anglerComparisonEngine';
import { generateInsights } from '@/engine/insightEngine';
import { buildTopFlyInsights, buildTopFlyRecords, TopFlyRecord } from '@/engine/topFlyEngine';
import { isWithinDateRange } from '@/utils/dateRange';

interface AppStore {
  sessions: Session[];
  experiments: Experiment[];
  insights: Insight[];
  anglerComparisons: Insight[];
  topFlyRecords: TopFlyRecord[];
  topFlyInsights: Insight[];
  users: UserProfile[];
  savedFlies: SavedFly[];
  savedRivers: SavedRiver[];
  activeUserId: number | null;
  setActiveUserId: (id: number) => Promise<void>;
  addUser: (name: string) => Promise<number>;
  addSavedFly: (payload: FlySetup) => Promise<number>;
  addSavedRiver: (name: string) => Promise<number>;
  refresh: (targetUserId?: number | null) => Promise<void>;
  addSession: (payload: Omit<Session, 'id' | 'userId'>) => Promise<number>;
  addExperiment: (payload: Omit<Experiment, 'id' | 'userId'>) => Promise<number>;
  archiveInconclusiveExperiments: (range: { from?: string; to?: string }) => Promise<number>;
}

const Ctx = createContext<AppStore | null>(null);

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

  const selectActiveUser = async (id: number) => {
    setActiveUserId(id);
    await saveActiveUserId(id);
  };

  const bootstrap = async () => {
    await initDb();
    const existingUsers = await listUsers();
    if (!existingUsers.length) {
      const id = await createUser('Primary Angler');
      await saveActiveUserId(id);
      setActiveUserId(id);
      setUsers([{ id, name: 'Primary Angler', createdAt: new Date().toISOString() }]);
    } else {
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
