import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Experiment, Insight } from '@/types/experiment';
import { Session } from '@/types/session';
import { createSession, listSessions } from '@/db/sessionRepo';
import { createExperiment, listExperiments } from '@/db/experimentRepo';
import { initDb } from '@/db/schema';
import { buildAggregates } from '@/engine/aggregationEngine';
import { generateInsights } from '@/engine/insightEngine';

interface AppStore {
  sessions: Session[];
  experiments: Experiment[];
  insights: Insight[];
  refresh: () => Promise<void>;
  addSession: (payload: Omit<Session, 'id'>) => Promise<number>;
  addExperiment: (payload: Omit<Experiment, 'id'>) => Promise<number>;
}

const Ctx = createContext<AppStore | null>(null);

export const AppStoreProvider = ({ children }: { children: React.ReactNode }) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [experiments, setExperiments] = useState<Experiment[]>([]);

  const refresh = async () => {
    const [s, e] = await Promise.all([listSessions(), listExperiments()]);
    setSessions(s);
    setExperiments(e);
  };

  useEffect(() => {
    initDb().then(refresh).catch(console.error);
  }, []);

  const insights = useMemo(() => generateInsights(buildAggregates(sessions, experiments)), [sessions, experiments]);

  return (
    <Ctx.Provider
      value={{
        sessions,
        experiments,
        insights,
        refresh,
        addSession: async (payload) => {
          const id = await createSession(payload);
          await refresh();
          return id;
        },
        addExperiment: async (payload) => {
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
