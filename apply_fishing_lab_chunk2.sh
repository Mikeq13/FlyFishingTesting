#!/usr/bin/env bash
set -euo pipefail

mkdir -p src/{app,components,db,engine,ai}

cat > src/engine/rules.ts <<'TS'
import { FlySetup } from '@/types/fly';

export interface ExperimentRuleCheck {
  valid: boolean;
  warning?: string;
  differingMajorVariables: string[];
}

export const validateExperimentPair = (controlFly: FlySetup, variantFly: FlySetup): ExperimentRuleCheck => {
  const differingMajorVariables: string[] = [];

  if (controlFly.intent !== variantFly.intent) differingMajorVariables.push('intent');
  if (controlFly.beadSizeMm !== variantFly.beadSizeMm) differingMajorVariables.push('bead_size_mm');

  const valid = differingMajorVariables.length <= 1;

  return {
    valid,
    warning: valid
      ? undefined
      : `Control and variant differ in ${differingMajorVariables.length} major variables (${differingMajorVariables.join(', ')}). Limit to one major variable for clean inference.`,
    differingMajorVariables
  };
};
TS

cat > src/engine/aggregationEngine.ts <<'TS'
import { Experiment } from '@/types/experiment';
import { Session } from '@/types/session';
import { catchRate } from '@/utils/calculations';

interface BucketStat {
  casts: number;
  catches: number;
}

export interface AggregatedStats {
  byWaterType: Record<string, BucketStat>;
  byDepthRange: Record<string, BucketStat>;
  byFlyIntent: Record<string, BucketStat>;
  byInsectStage: Record<string, BucketStat>;
}

const add = (bucket: Record<string, BucketStat>, key: string, casts: number, catches: number): void => {
  bucket[key] = bucket[key] || { casts: 0, catches: 0 };
  bucket[key].casts += casts;
  bucket[key].catches += catches;
};

export const buildAggregates = (sessions: Session[], experiments: Experiment[]): AggregatedStats => {
  const byWaterType: Record<string, BucketStat> = {};
  const byDepthRange: Record<string, BucketStat> = {};
  const byFlyIntent: Record<string, BucketStat> = {};
  const byInsectStage: Record<string, BucketStat> = {};

  const sessionMap = new Map(sessions.map((s) => [s.id, s]));

  for (const e of experiments) {
    const session = sessionMap.get(e.sessionId);
    if (!session) continue;

    const totalCasts = e.controlCasts + e.variantCasts;
    const totalCatches = e.controlCatches + e.variantCatches;

    add(byWaterType, session.waterType, totalCasts, totalCatches);
    add(byDepthRange, session.depthRange, totalCasts, totalCatches);
    add(byFlyIntent, e.controlFly.intent, e.controlCasts, e.controlCatches);
    add(byFlyIntent, e.variantFly.intent, e.variantCasts, e.variantCatches);
    add(byInsectStage, session.insectStage, totalCasts, totalCatches);
  }

  return { byWaterType, byDepthRange, byFlyIntent, byInsectStage };
};

export const bucketRates = (bucket: Record<string, BucketStat>): Record<string, number> =>
  Object.fromEntries(Object.entries(bucket).map(([k, v]) => [k, catchRate(v.catches, v.casts)]));
TS

cat > src/engine/insightEngine.ts <<'TS'
import { AggregatedStats, bucketRates } from './aggregationEngine';
import { Insight } from '@/types/experiment';
import { confidenceFromSamples, percentDiff } from '@/utils/calculations';

const topAndBottom = (rates: Record<string, number>) => {
  const entries = Object.entries(rates).sort((a, b) => b[1] - a[1]);
  return { top: entries[0], bottom: entries[entries.length - 1], entries };
};

export const generateInsights = (stats: AggregatedStats): Insight[] => {
  const insights: Insight[] = [];

  const waterRates = bucketRates(stats.byWaterType);
  const depthRates = bucketRates(stats.byDepthRange);
  const intentRates = bucketRates(stats.byFlyIntent);

  const candidates: Array<{ label: string; rates: Record<string, number>; castsByKey: Record<string, { casts: number }> }> = [
    { label: 'water type', rates: waterRates, castsByKey: stats.byWaterType },
    { label: 'depth range', rates: depthRates, castsByKey: stats.byDepthRange },
    { label: 'fly intent', rates: intentRates, castsByKey: stats.byFlyIntent }
  ];

  for (const c of candidates) {
    if (Object.keys(c.rates).length < 2) continue;
    const { top, bottom } = topAndBottom(c.rates);
    if (!top || !bottom) continue;
    const diff = percentDiff(bottom[1], top[1]);
    if (diff > 0.25) {
      const sampleCount = (c.castsByKey[top[0]]?.casts || 0) + (c.castsByKey[bottom[0]]?.casts || 0);
      insights.push({
        type: 'pattern',
        message: `Strong pattern detected: ${c.label} '${top[0]}' outperforms '${bottom[0]}' by ${(diff * 100).toFixed(0)}%.`,
        confidence: confidenceFromSamples(sampleCount),
        supportingData: { dimension: c.label, top, bottom, diff }
      });
    }

    if (bottom[1] < 0.08) {
      insights.push({
        type: 'warning',
        message: `Weak zone identified in ${c.label} '${bottom[0]}' (catch rate ${(bottom[1] * 100).toFixed(1)}%).`,
        confidence: 'medium',
        supportingData: { dimension: c.label, value: bottom[0], rate: bottom[1] }
      });
    }
  }

  const depthEntries = Object.entries(depthRates);
  if (depthEntries.length >= 2) {
    const spread = Math.max(...depthEntries.map(([, r]) => r)) - Math.min(...depthEntries.map(([, r]) => r));
    if (spread > 0.2) {
      insights.push({
        type: 'recommendation',
        message: 'Depth sensitivity detected. Run a focused experiment where only depth changes.',
        confidence: 'medium',
        supportingData: { depthRates, spread }
      });
    }
  }

  if (!insights.length) {
    insights.push({
      type: 'recommendation',
      message: 'Not enough signal yet. Increase casts per condition and isolate one variable per experiment.',
      confidence: 'low',
      supportingData: {}
    });
  }

  return insights;
};
TS

cat > src/db/schema.ts <<'TS'
import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export const getDb = async (): Promise<SQLite.SQLiteDatabase> => {
  if (!db) db = await SQLite.openDatabaseAsync('fishing_lab.db');
  return db;
};

export const initDb = async (): Promise<void> => {
  const database = await getDb();
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      water_type TEXT NOT NULL,
      depth_range TEXT NOT NULL,
      insect_type TEXT NOT NULL,
      insect_stage TEXT NOT NULL,
      insect_confidence TEXT NOT NULL,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS experiments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      hypothesis TEXT NOT NULL,
      control_fly_json TEXT NOT NULL,
      variant_fly_json TEXT NOT NULL,
      control_casts INTEGER NOT NULL,
      control_catches INTEGER NOT NULL,
      variant_casts INTEGER NOT NULL,
      variant_catches INTEGER NOT NULL,
      winner TEXT NOT NULL,
      confidence_score REAL NOT NULL,
      FOREIGN KEY(session_id) REFERENCES sessions(id)
    );
  `);
};
TS

cat > src/db/sessionRepo.ts <<'TS'
import { getDb } from './schema';
import { Session } from '@/types/session';

export const createSession = async (payload: Omit<Session, 'id'>): Promise<number> => {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO sessions (date, water_type, depth_range, insect_type, insect_stage, insect_confidence, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    payload.date,
    payload.waterType,
    payload.depthRange,
    payload.insectType,
    payload.insectStage,
    payload.insectConfidence,
    payload.notes ?? null
  );
  return result.lastInsertRowId;
};

export const listSessions = async (): Promise<Session[]> => {
  const db = await getDb();
  const rows = await db.getAllAsync<any>('SELECT * FROM sessions ORDER BY date DESC');
  return rows.map((r) => ({
    id: r.id,
    date: r.date,
    waterType: r.water_type,
    depthRange: r.depth_range,
    insectType: r.insect_type,
    insectStage: r.insect_stage,
    insectConfidence: r.insect_confidence,
    notes: r.notes ?? undefined
  }));
};
TS

cat > src/db/experimentRepo.ts <<'TS'
import { getDb } from './schema';
import { Experiment } from '@/types/experiment';

export const createExperiment = async (payload: Omit<Experiment, 'id'>): Promise<number> => {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO experiments
      (session_id, hypothesis, control_fly_json, variant_fly_json, control_casts, control_catches, variant_casts, variant_catches, winner, confidence_score)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    payload.sessionId,
    payload.hypothesis,
    JSON.stringify(payload.controlFly),
    JSON.stringify(payload.variantFly),
    payload.controlCasts,
    payload.controlCatches,
    payload.variantCasts,
    payload.variantCatches,
    payload.winner,
    payload.confidenceScore
  );
  return result.lastInsertRowId;
};

export const listExperiments = async (): Promise<Experiment[]> => {
  const db = await getDb();
  const rows = await db.getAllAsync<any>('SELECT * FROM experiments ORDER BY id DESC');
  return rows.map((r) => ({
    id: r.id,
    sessionId: r.session_id,
    hypothesis: r.hypothesis,
    controlFly: JSON.parse(r.control_fly_json),
    variantFly: JSON.parse(r.variant_fly_json),
    controlCasts: r.control_casts,
    controlCatches: r.control_catches,
    variantCasts: r.variant_casts,
    variantCatches: r.variant_catches,
    winner: r.winner,
    confidenceScore: r.confidence_score
  }));
};
TS

cat > src/ai/aiContextBuilder.ts <<'TS'
import { Experiment, Insight } from '@/types/experiment';
import { Session } from '@/types/session';
import { AggregatedStats } from '@/engine/aggregationEngine';

export interface AIContext {
  recentSessions: Session[];
  aggregatedStats: AggregatedStats;
  topInsights: Insight[];
  anomalies: string[];
  activeSession?: Session;
}

export const buildAIContext = (
  sessions: Session[],
  aggregatedStats: AggregatedStats,
  insights: Insight[],
  experiments: Experiment[],
  activeSession?: Session
): AIContext => {
  const anomalies: string[] = [];
  const lowSampleExperiments = experiments.filter((e) => e.controlCasts + e.variantCasts < 10).length;
  if (lowSampleExperiments > 0) anomalies.push(`${lowSampleExperiments} experiments have <10 casts, so confidence is weak.`);

  return {
    recentSessions: sessions.slice(0, 10),
    aggregatedStats,
    topInsights: insights.slice(0, 5),
    anomalies,
    activeSession
  };
};
TS

cat > src/ai/aiPromptBuilder.ts <<'TS'
import { AIContext } from './aiContextBuilder';

export const systemPrompt = `You are Fishing Lab Coach, a deterministic analysis assistant.
Rules:
1) Use ONLY supplied app data; never use outside fishing facts.
2) If evidence is weak, explicitly say that confidence is low.
3) Never override deterministic insights; align with them.
4) Explain WHY using observed patterns and sample sizes.
5) Always end with a next-best experiment suggestion.`;

export const buildCoachPrompt = (userQuestion: string, context: AIContext): string =>
  [
    `USER_QUESTION: ${userQuestion}`,
    `CONTEXT_JSON: ${JSON.stringify(context)}`,
    `RESPONSE_FORMAT:`,
    `- summary: short grounded answer`,
    `- evidence: bullet list with values`,
    `- confidence: low|medium|high`,
    `- next_best_action: single controlled experiment`
  ].join('\n');
TS

cat > src/ai/coachEngine.ts <<'TS'
import { AIContext } from './aiContextBuilder';
import { buildCoachPrompt, systemPrompt } from './aiPromptBuilder';

export interface CoachResponse {
  summary: string;
  evidence: string[];
  confidence: 'low' | 'medium' | 'high';
  nextBestAction: string;
  rawPrompt: string;
}

export const runCoach = (question: string, context: AIContext): CoachResponse => {
  const topInsight = context.topInsights[0];
  const evidence = [
    ...context.topInsights.slice(0, 3).map((i) => `${i.type}: ${i.message}`),
    ...context.anomalies.map((a) => `anomaly: ${a}`)
  ];

  const confidence: 'low' | 'medium' | 'high' = topInsight?.confidence || 'low';
  const summary = topInsight
    ? `Based on your own data, the strongest signal is: ${topInsight.message}`
    : 'Your current dataset has limited signal. We can still improve by tightening experiment design.';

  return {
    summary,
    evidence,
    confidence,
    nextBestAction: 'Run 40 casts in one water type, keep fly constant, and change only depth range to isolate depth effect.',
    rawPrompt: `${systemPrompt}\n\n${buildCoachPrompt(question, context)}`
  };
};
TS

cat > src/components/CastCounter.tsx <<'TS'
import React from 'react';
import { Pressable, Text, View } from 'react-native';

export const CastCounter = ({ label, value, onIncrement }: { label: string; value: number; onIncrement: () => void }) => (
  <View style={{ gap: 8 }}>
    <Text>{label}: {value}</Text>
    <Pressable onPress={onIncrement} style={{ backgroundColor: '#26547c', padding: 10, borderRadius: 8 }}>
      <Text style={{ color: 'white', fontWeight: '700' }}>+ Cast</Text>
    </Pressable>
  </View>
);
TS

cat > src/components/CatchCounter.tsx <<'TS'
import React from 'react';
import { Pressable, Text, View } from 'react-native';

export const CatchCounter = ({ label, value, onIncrement }: { label: string; value: number; onIncrement: () => void }) => (
  <View style={{ gap: 8 }}>
    <Text>{label}: {value}</Text>
    <Pressable onPress={onIncrement} style={{ backgroundColor: '#2a9d8f', padding: 10, borderRadius: 8 }}>
      <Text style={{ color: 'white', fontWeight: '700' }}>+ Catch</Text>
    </Pressable>
  </View>
);
TS

cat > src/components/DepthSelector.tsx <<'TS'
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { DepthRange } from '@/types/session';

const options: DepthRange[] = ['surface', '1-3 ft', '3-6 ft', '6+ ft'];

export const DepthSelector = ({ value, onChange }: { value: DepthRange; onChange: (v: DepthRange) => void }) => (
  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
    {options.map((o) => (
      <Pressable key={o} onPress={() => onChange(o)} style={{ padding: 8, borderWidth: 1, borderColor: value === o ? '#2a9d8f' : '#aaa', borderRadius: 8 }}>
        <Text>{o}</Text>
      </Pressable>
    ))}
  </View>
);
TS

cat > src/components/FlySelector.tsx <<'TS'
import React from 'react';
import { Text, TextInput, View } from 'react-native';
import { FlySetup } from '@/types/fly';

export const FlySelector = ({ title, value, onChange }: { title: string; value: FlySetup; onChange: (v: FlySetup) => void }) => (
  <View style={{ gap: 8, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12 }}>
    <Text style={{ fontWeight: '700' }}>{title}</Text>
    <TextInput value={value.name} placeholder="Fly name" onChangeText={(name) => onChange({ ...value, name })} style={{ borderWidth: 1, padding: 8, borderRadius: 6 }} />
    <TextInput value={value.intent} placeholder="intent: imitative|attractor" onChangeText={(intent) => onChange({ ...value, intent: intent as FlySetup['intent'] })} style={{ borderWidth: 1, padding: 8, borderRadius: 6 }} />
    <TextInput keyboardType="numeric" value={String(value.beadSizeMm)} placeholder="bead size mm" onChangeText={(t) => onChange({ ...value, beadSizeMm: Number(t || 0) })} style={{ borderWidth: 1, padding: 8, borderRadius: 6 }} />
    <TextInput value={value.bodyType} placeholder="body type" onChangeText={(bodyType) => onChange({ ...value, bodyType: bodyType as FlySetup['bodyType'] })} style={{ borderWidth: 1, padding: 8, borderRadius: 6 }} />
    <TextInput value={value.collar} placeholder="collar" onChangeText={(collar) => onChange({ ...value, collar: collar as FlySetup['collar'] })} style={{ borderWidth: 1, padding: 8, borderRadius: 6 }} />
  </View>
);
TS

cat > src/components/InsightCard.tsx <<'TS'
import React from 'react';
import { Text, View } from 'react-native';
import { Insight } from '@/types/experiment';

export const InsightCard = ({ insight }: { insight: Insight }) => (
  <View style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 8 }}>
    <Text style={{ fontWeight: '700' }}>{insight.type.toUpperCase()} ({insight.confidence})</Text>
    <Text>{insight.message}</Text>
  </View>
);
TS

cat > src/app/store.tsx <<'TS'
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
TS

cat > src/app/HomeScreen.tsx <<'TS'
import React from 'react';
import { Pressable, Text, View } from 'react-native';

export const HomeScreen = ({ navigation }: any) => (
  <View style={{ flex: 1, justifyContent: 'center', padding: 20, gap: 12 }}>
    <Text style={{ fontSize: 28, fontWeight: '700' }}>Fishing Lab</Text>
    {[
      ['Start Session', 'Session'],
      ['View History', 'History'],
      ['View Insights', 'Insights'],
      ['Ask AI Coach', 'Coach']
    ].map(([label, route]) => (
      <Pressable key={route} onPress={() => navigation.navigate(route)} style={{ backgroundColor: '#264653', padding: 14, borderRadius: 10 }}>
        <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>{label}</Text>
      </Pressable>
    ))}
  </View>
);
TS

cat > src/app/SessionScreen.tsx <<'TS'
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput } from 'react-native';
import { DepthSelector } from '@/components/DepthSelector';
import { useAppStore } from './store';
import { Confidence, DepthRange, InsectStage, InsectType, WaterType } from '@/types/session';

export const SessionScreen = ({ navigation }: any) => {
  const { addSession } = useAppStore();
  const [waterType, setWaterType] = useState<WaterType>('run');
  const [depthRange, setDepthRange] = useState<DepthRange>('1-3 ft');
  const [insectType, setInsectType] = useState<InsectType>('mayfly');
  const [insectStage, setInsectStage] = useState<InsectStage>('emerger');
  const [insectConfidence, setInsectConfidence] = useState<Confidence>('medium');
  const [notes, setNotes] = useState('');

  const onStart = async () => {
    const id = await addSession({
      date: new Date().toISOString(),
      waterType,
      depthRange,
      insectType,
      insectStage,
      insectConfidence,
      notes
    });
    navigation.navigate('Experiment', { sessionId: id });
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: '700' }}>Active Session</Text>
      <TextInput value={waterType} onChangeText={(v) => setWaterType(v as WaterType)} placeholder="water type" style={{ borderWidth: 1, padding: 10, borderRadius: 8 }} />
      <DepthSelector value={depthRange} onChange={setDepthRange} />
      <TextInput value={insectType} onChangeText={(v) => setInsectType(v as InsectType)} placeholder="insect type" style={{ borderWidth: 1, padding: 10, borderRadius: 8 }} />
      <TextInput value={insectStage} onChangeText={(v) => setInsectStage(v as InsectStage)} placeholder="insect stage" style={{ borderWidth: 1, padding: 10, borderRadius: 8 }} />
      <TextInput value={insectConfidence} onChangeText={(v) => setInsectConfidence(v as Confidence)} placeholder="confidence" style={{ borderWidth: 1, padding: 10, borderRadius: 8 }} />
      <TextInput value={notes} onChangeText={setNotes} placeholder="notes" multiline style={{ borderWidth: 1, padding: 10, borderRadius: 8 }} />
      <Pressable onPress={onStart} style={{ backgroundColor: '#2a9d8f', padding: 12, borderRadius: 8 }}>
        <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Start Experiment</Text>
      </Pressable>
    </ScrollView>
  );
};
TS

cat > src/app/ExperimentScreen.tsx <<'TS'
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { CastCounter } from '@/components/CastCounter';
import { CatchCounter } from '@/components/CatchCounter';
import { FlySelector } from '@/components/FlySelector';
import { useAppStore } from './store';
import { FlySetup } from '@/types/fly';
import { validateExperimentPair } from '@/engine/rules';
import { catchRate } from '@/utils/calculations';

const emptyFly: FlySetup = { name: '', intent: 'imitative', beadSizeMm: 0, bodyType: 'thread', collar: 'none' };

export const ExperimentScreen = ({ route, navigation }: any) => {
  const { addExperiment } = useAppStore();
  const sessionId: number = route.params.sessionId;
  const [hypothesis, setHypothesis] = useState('');
  const [controlFly, setControlFly] = useState<FlySetup>(emptyFly);
  const [variantFly, setVariantFly] = useState<FlySetup>({ ...emptyFly, intent: 'attractor' });
  const [controlCasts, setControlCasts] = useState(0);
  const [controlCatches, setControlCatches] = useState(0);
  const [variantCasts, setVariantCasts] = useState(0);
  const [variantCatches, setVariantCatches] = useState(0);

  const save = async () => {
    const check = validateExperimentPair(controlFly, variantFly);
    if (!check.valid && check.warning) {
      Alert.alert('Design warning', check.warning);
      return;
    }

    const cRate = catchRate(controlCatches, controlCasts);
    const vRate = catchRate(variantCatches, variantCasts);
    const winner = cRate === vRate ? 'tie' : cRate > vRate ? 'control' : 'variant';

    await addExperiment({
      sessionId,
      hypothesis: hypothesis || 'No hypothesis provided',
      controlFly,
      variantFly,
      controlCasts,
      controlCatches,
      variantCasts,
      variantCatches,
      winner,
      confidenceScore: Math.min(1, (controlCasts + variantCasts) / 100)
    });

    navigation.navigate('Insights');
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: '700' }}>Experiment</Text>
      <TextInput value={hypothesis} onChangeText={setHypothesis} placeholder="Hypothesis" style={{ borderWidth: 1, padding: 10, borderRadius: 8 }} />
      <FlySelector title="Control" value={controlFly} onChange={setControlFly} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <CastCounter label="Control casts" value={controlCasts} onIncrement={() => setControlCasts((v) => v + 1)} />
        <CatchCounter label="Control catches" value={controlCatches} onIncrement={() => setControlCatches((v) => v + 1)} />
      </View>
      <FlySelector title="Variant" value={variantFly} onChange={setVariantFly} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <CastCounter label="Variant casts" value={variantCasts} onIncrement={() => setVariantCasts((v) => v + 1)} />
        <CatchCounter label="Variant catches" value={variantCatches} onIncrement={() => setVariantCatches((v) => v + 1)} />
      </View>
      <Pressable onPress={save} style={{ backgroundColor: '#264653', padding: 12, borderRadius: 8 }}>
        <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Save Experiment</Text>
      </Pressable>
    </ScrollView>
  );
};
TS

cat > src/app/InsightsScreen.tsx <<'TS'
import React from 'react';
import { ScrollView, Text } from 'react-native';
import { InsightCard } from '@/components/InsightCard';
import { useAppStore } from './store';

export const InsightsScreen = () => {
  const { insights } = useAppStore();

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: 8 }}>Insights</Text>
      {insights.map((insight, idx) => (
        <InsightCard key={`${insight.type}-${idx}`} insight={insight} />
      ))}
    </ScrollView>
  );
};
TS

cat > src/app/HistoryScreen.tsx <<'TS'
import React, { useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { useAppStore } from './store';

export const HistoryScreen = () => {
  const { sessions, experiments } = useAppStore();
  const [waterFilter, setWaterFilter] = useState('');
  const [insectFilter, setInsectFilter] = useState('');
  const [depthFilter, setDepthFilter] = useState('');

  const filtered = useMemo(
    () =>
      sessions.filter(
        (s) =>
          (!waterFilter || s.waterType.includes(waterFilter)) &&
          (!insectFilter || s.insectType.includes(insectFilter)) &&
          (!depthFilter || s.depthRange.includes(depthFilter))
      ),
    [sessions, waterFilter, insectFilter, depthFilter]
  );

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
      <Text style={{ fontSize: 20, fontWeight: '700' }}>History</Text>
      <TextInput value={waterFilter} onChangeText={setWaterFilter} placeholder="filter water type" style={{ borderWidth: 1, padding: 8, borderRadius: 8 }} />
      <TextInput value={insectFilter} onChangeText={setInsectFilter} placeholder="filter insect type" style={{ borderWidth: 1, padding: 8, borderRadius: 8 }} />
      <TextInput value={depthFilter} onChangeText={setDepthFilter} placeholder="filter depth" style={{ borderWidth: 1, padding: 8, borderRadius: 8 }} />

      {filtered.map((s) => {
        const sessionExperiments = experiments.filter((e) => e.sessionId === s.id);
        const totalCasts = sessionExperiments.reduce((sum, e) => sum + e.controlCasts + e.variantCasts, 0);
        const totalCatches = sessionExperiments.reduce((sum, e) => sum + e.controlCatches + e.variantCatches, 0);
        const rate = totalCasts ? totalCatches / totalCasts : 0;
        const best = sessionExperiments[0]?.winner ?? 'n/a';

        return (
          <View key={s.id} style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12 }}>
            <Text>{new Date(s.date).toLocaleString()}</Text>
            <Text>Water: {s.waterType}</Text>
            <Text>Catch rate: {(rate * 100).toFixed(1)}%</Text>
            <Text>Best experiment result: {best}</Text>
          </View>
        );
      })}
    </ScrollView>
  );
};
TS

cat > src/app/CoachScreen.tsx <<'TS'
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useAppStore } from './store';
import { buildAggregates } from '@/engine/aggregationEngine';
import { buildAIContext } from '@/ai/aiContextBuilder';
import { runCoach } from '@/ai/coachEngine';

export const CoachScreen = () => {
  const { sessions, experiments, insights } = useAppStore();
  const [question, setQuestion] = useState('What am I doing wrong in pools?');
  const [response, setResponse] = useState<ReturnType<typeof runCoach> | null>(null);

  const context = useMemo(
    () => buildAIContext(sessions, buildAggregates(sessions, experiments), insights, experiments, sessions[0]),
    [sessions, experiments, insights]
  );

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
      <Text style={{ fontSize: 20, fontWeight: '700' }}>AI Coach</Text>
      <TextInput value={question} onChangeText={setQuestion} style={{ borderWidth: 1, padding: 10, borderRadius: 8 }} />
      <Pressable onPress={() => setResponse(runCoach(question, context))} style={{ backgroundColor: '#264653', padding: 12, borderRadius: 8 }}>
        <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Ask AI Coach</Text>
      </Pressable>

      {response && (
        <View style={{ gap: 6, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12 }}>
          <Text style={{ fontWeight: '700' }}>Summary</Text>
          <Text>{response.summary}</Text>
          <Text style={{ fontWeight: '700' }}>Evidence</Text>
          {response.evidence.map((e, i) => <Text key={i}>• {e}</Text>)}
          <Text style={{ fontWeight: '700' }}>Confidence: {response.confidence}</Text>
          <Text style={{ fontWeight: '700' }}>Next best action</Text>
          <Text>{response.nextBestAction}</Text>
        </View>
      )}
    </ScrollView>
  );
};
TS

cat > src/App.tsx <<'TS'
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppStoreProvider } from './app/store';
import { HomeScreen } from './app/HomeScreen';
import { SessionScreen } from './app/SessionScreen';
import { ExperimentScreen } from './app/ExperimentScreen';
import { InsightsScreen } from './app/InsightsScreen';
import { HistoryScreen } from './app/HistoryScreen';
import { CoachScreen } from './app/CoachScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <AppStoreProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Home">
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Session" component={SessionScreen} />
          <Stack.Screen name="Experiment" component={ExperimentScreen} />
          <Stack.Screen name="Insights" component={InsightsScreen} />
          <Stack.Screen name="History" component={HistoryScreen} />
          <Stack.Screen name="Coach" component={CoachScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </AppStoreProvider>
  );
}
TS

echo "Chunk 2 applied."
