import { Experiment } from '@/types/experiment';
import { Session } from '@/types/session';
import { catchRate } from '@/utils/calculations';
import { getExperimentEntries } from '@/utils/experimentEntries';

interface BucketStat {
  casts: number;
  catches: number;
}

export interface AggregatedStats {
  byWaterType: Record<string, BucketStat>;
  byDepthRange: Record<string, BucketStat>;
  byFlyIntent: Record<string, BucketStat>;
  byInsectStage: Record<string, BucketStat>;
  byRiverName: Record<string, BucketStat>;
  byMonth: Record<string, BucketStat>;
  byRiverMonth: Record<string, BucketStat>;
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
  const byRiverName: Record<string, BucketStat> = {};
  const byMonth: Record<string, BucketStat> = {};
  const byRiverMonth: Record<string, BucketStat> = {};

  const sessionMap = new Map(sessions.map((s) => [s.id, s]));

  for (const e of experiments) {
    const session = sessionMap.get(e.sessionId);
    if (!session) continue;

    const entries = getExperimentEntries(e);
    const totalCasts = entries.reduce((sum, entry) => sum + entry.casts, 0);
    const totalCatches = entries.reduce((sum, entry) => sum + entry.catches, 0);

    add(byWaterType, session.waterType, totalCasts, totalCatches);
    add(byDepthRange, session.depthRange, totalCasts, totalCatches);
    entries.forEach((entry) => add(byFlyIntent, entry.fly.intent, entry.casts, entry.catches));
    entries.forEach((entry) => add(byInsectStage, entry.fly.bugStage, entry.casts, entry.catches));
    const monthLabel = new Date(session.date).toLocaleString('en-US', { month: 'long' });
    const riverLabel = session.riverName?.trim();
    if (riverLabel) {
      add(byRiverName, riverLabel, totalCasts, totalCatches);
      add(byRiverMonth, `${riverLabel} in ${monthLabel}`, totalCasts, totalCatches);
    }
    add(byMonth, monthLabel, totalCasts, totalCatches);
  }

  return { byWaterType, byDepthRange, byFlyIntent, byInsectStage, byRiverName, byMonth, byRiverMonth };
};

export const bucketRates = (bucket: Record<string, BucketStat>): Record<string, number> =>
  Object.fromEntries(Object.entries(bucket).map(([k, v]) => [k, catchRate(v.catches, v.casts)]));
