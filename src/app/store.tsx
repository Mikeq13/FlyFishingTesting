import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Experiment, Insight } from '@/types/experiment';
import { Session } from '@/types/session';
import { UserProfile } from '@/types/user';
import { createSession, listSessions } from '@/db/sessionRepo';
import { createExperiment, listExperiments } from '@/db/experimentRepo';
import { createUser, listUsers } from '@/db/userRepo';
import { createSession, listSessions } from '@/db/sessionRepo';
import { createExperiment, listExperiments } from '@/db/experimentRepo';
import { initDb } from '@/db/schema';
import { buildAggregates } from '@/engine/aggregationEngine';
import { generateInsights } from '@/engine/insightEngine';

interface AppStore {
  sessions: Session[];
  experiments: Experiment[];
  insights: Insight[];
  users: UserProfile[];
  activeUserId: number | null;
  setActiveUserId: (id: number) => void;
  addUser: (name: string) => Promise<number>;
  refresh: () => Promise<void>;
  addSession: (payload: Omit<Session, 'id' | 'userId'>) => Promise<number>;
  addExperiment: (payload: Omit<Experiment, 'id' | 'userId'>) => Promise<number>;
  refresh: () => Promise<void>;
  addSession: (payload: Omit<Session, 'id'>) => Promise<number>;
  addExperiment: (payload: Omit<Experiment, 'id'>) => Promise<number>;
}

const Ctx = createContext<AppStore | null>(null);

export const AppStoreProvider = ({ children }: { children: React.ReactNode }) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [activeUserId, setActiveUserId] = useState<number | null>(null);

  const bootstrap = async () => {
    await initDb();
    const existingUsers = await listUsers();
    if (!existingUsers.length) {
      const id = await createUser('Primary Angler');
      setActiveUserId(id);
      setUsers([{ id, name: 'Primary Angler', createdAt: new Date().toISOString() }]);
    } else {
      setUsers(existingUsers);
      setActiveUserId(existingUsers[0].id);
    }
  };

  const refresh = async () => {
    const allUsers = await listUsers();
    setUsers(allUsers);
    const uid = activeUserId ?? allUsers[0]?.id;
    if (!uid) return;
    const [s, e] = await Promise.all([listSessions(uid), listExperiments(uid)]);

  const refresh = async () => {
    const [s, e] = await Promise.all([listSessions(), listExperiments()]);
    setSessions(s);
    setExperiments(e);
  };

  useEffect(() => {
    bootstrap().catch(console.error);
  }, []);

  useEffect(() => {
    refresh().catch(console.error);
  }, [activeUserId]);

    initDb().then(refresh).catch(console.error);
  }, []);

  const insights = useMemo(() => generateInsights(buildAggregates(sessions, experiments)), [sessions, experiments]);

  return (
    <Ctx.Provider
      value={{
        sessions,
        experiments,
        insights,
        users,
        activeUserId,
        setActiveUserId,
        addUser: async (name) => {
          const id = await createUser(name);
          await refresh();
          return id;
        },
        refresh,
        addSession: async (payload) => {
          if (!activeUserId) throw new Error('No active user selected.');
          const id = await createSession({ ...payload, userId: activeUserId });
        refresh,
        addSession: async (payload) => {
          const id = await createSession(payload);
          await refresh();
          return id;
        },
        addExperiment: async (payload) => {
          if (!activeUserId) throw new Error('No active user selected.');
          const id = await createExperiment({ ...payload, userId: activeUserId });
          const id = await createExperiment(payload);
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
