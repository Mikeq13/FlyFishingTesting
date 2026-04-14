import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Experiment, Insight } from '@/types/experiment';
import { Session } from '@/types/session';
import { UserProfile } from '@/types/user';
import { FlySetup, SavedFly } from '@/types/fly';
import { createSession, listSessions } from '@/db/sessionRepo';
import { createExperiment, listExperiments } from '@/db/experimentRepo';
import { createUser, listUsers } from '@/db/userRepo';
import { createSavedFly, listSavedFlies } from '@/db/savedFlyRepo';
import { getActiveUserId as loadActiveUserId, setActiveUserId as saveActiveUserId } from '@/db/settingsRepo';
import { initDb } from '@/db/schema';
import { buildAggregates } from '@/engine/aggregationEngine';
import { generateInsights } from '@/engine/insightEngine';

interface AppStore {
  sessions: Session[];
  experiments: Experiment[];
  insights: Insight[];
  users: UserProfile[];
  savedFlies: SavedFly[];
  activeUserId: number | null;
  setActiveUserId: (id: number) => Promise<void>;
  addUser: (name: string) => Promise<number>;
  addSavedFly: (payload: FlySetup) => Promise<number>;
  refresh: (targetUserId?: number | null) => Promise<void>;
  addSession: (payload: Omit<Session, 'id' | 'userId'>) => Promise<number>;
  addExperiment: (payload: Omit<Experiment, 'id' | 'userId'>) => Promise<number>;
}

const Ctx = createContext<AppStore | null>(null);

export const AppStoreProvider = ({ children }: { children: React.ReactNode }) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [savedFlies, setSavedFlies] = useState<SavedFly[]>([]);
  const [activeUserId, setActiveUserId] = useState<number | null>(null);

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
      return;
    }
    const [s, e, flies] = await Promise.all([listSessions(uid), listExperiments(uid), listSavedFlies(uid)]);
    setSessions(s);
    setExperiments(e);
    setSavedFlies(flies);
  };

  useEffect(() => {
    bootstrap().catch(console.error);
  }, []);

  useEffect(() => {
    refresh().catch(console.error);
  }, [activeUserId]);

  const insights = useMemo(() => generateInsights(buildAggregates(sessions, experiments)), [sessions, experiments]);

  return (
    <Ctx.Provider
      value={{
        sessions,
        experiments,
        insights,
        users,
        savedFlies,
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
