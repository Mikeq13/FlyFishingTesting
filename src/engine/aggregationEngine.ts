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
