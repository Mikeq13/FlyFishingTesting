import { Experiment, Insight } from '@/types/experiment';
import { Session } from '@/types/session';
import { confidenceFromSamples, catchRate } from '@/utils/calculations';
import { getExperimentEntries } from '@/utils/experimentEntries';

interface TopFlyStat {
  name: string;
  hookSize: number;
  beadSizeMm: number;
  bugFamily: string;
  bugStage: string;
  casts: number;
  catches: number;
  rate: number;
  fishCount: number;
  averageSizeInches: number | null;
  largestFishInches: number | null;
  speciesCounts: Map<string, number>;
  rivers: Set<string>;
  months: Set<string>;
}

export interface TopFlyRecord {
  name: string;
  hookSize: number;
  beadSizeMm: number;
  bugFamily: string;
  bugStage: string;
  casts: number;
  catches: number;
  rate: number;
  fishCount: number;
  averageSizeInches: number | null;
  largestFishInches: number | null;
  topSpecies: string[];
  speciesBreakdown: Array<{ species: string; count: number; percent: number }>;
  rivers: string[];
  months: string[];
}

const MIN_CASTS_FOR_TOP_FLY = 15;

const toKey = (name: string, hookSize: number, beadSizeMm: number, bugFamily: string, bugStage: string): string =>
  `${name.trim().toLowerCase()}|${hookSize}|${beadSizeMm}|${bugFamily}|${bugStage}`;

export const buildTopFlyRecords = (sessions: Session[], experiments: Experiment[]): TopFlyRecord[] => {
  const sessionMap = new Map(sessions.map((session) => [session.id, session]));
  const stats = new Map<string, TopFlyStat>();

  experiments.forEach((experiment) => {
    const session = sessionMap.get(experiment.sessionId);
    getExperimentEntries(experiment).forEach((entry) => {
      const flyName = entry.fly.name.trim() || entry.label;
      const key = toKey(flyName, entry.fly.hookSize, entry.fly.beadSizeMm, entry.fly.bugFamily, entry.fly.bugStage);
      const current =
        stats.get(key) ??
        {
          name: flyName,
          hookSize: entry.fly.hookSize,
          beadSizeMm: entry.fly.beadSizeMm,
          bugFamily: entry.fly.bugFamily,
          bugStage: entry.fly.bugStage,
          casts: 0,
          catches: 0,
          rate: 0,
          fishCount: 0,
          averageSizeInches: null,
          largestFishInches: null,
          speciesCounts: new Map<string, number>(),
          rivers: new Set<string>(),
          months: new Set<string>()
        };

      current.casts += entry.casts;
      current.catches += entry.catches;
      const fishSizes = entry.fishSizesInches ?? [];
      if (fishSizes.length) {
        const totalKnownSize = (current.averageSizeInches ?? 0) * current.fishCount + fishSizes.reduce((sum, size) => sum + size, 0);
        current.fishCount += fishSizes.length;
        current.averageSizeInches = totalKnownSize / current.fishCount;
        current.largestFishInches = Math.max(current.largestFishInches ?? 0, ...fishSizes);
      }
      (entry.fishSpecies ?? []).forEach((species) => {
        current.speciesCounts.set(species, (current.speciesCounts.get(species) ?? 0) + 1);
      });
      if (session?.riverName) current.rivers.add(session.riverName);
      if (session) current.months.add(new Date(session.date).toLocaleString('en-US', { month: 'long' }));
      current.rate = catchRate(current.catches, current.casts);
      stats.set(key, current);
    });
  });

  return [...stats.values()]
    .filter((stat) => stat.casts >= MIN_CASTS_FOR_TOP_FLY)
    .sort((left, right) => right.rate - left.rate || right.casts - left.casts)
    .map((stat) => ({
      name: stat.name,
      hookSize: stat.hookSize,
      beadSizeMm: stat.beadSizeMm,
      bugFamily: stat.bugFamily,
      bugStage: stat.bugStage,
      casts: stat.casts,
      catches: stat.catches,
      rate: stat.rate,
      fishCount: stat.fishCount,
      averageSizeInches: stat.averageSizeInches ? Number(stat.averageSizeInches.toFixed(1)) : null,
      largestFishInches: stat.largestFishInches,
      topSpecies: [...stat.speciesCounts.entries()]
        .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
        .slice(0, 3)
        .map(([species]) => species),
      speciesBreakdown: [...stat.speciesCounts.entries()]
        .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
        .map(([species, count]) => ({
          species,
          count,
          percent: stat.fishCount ? count / stat.fishCount : 0
        })),
      rivers: [...stat.rivers].sort(),
      months: [...stat.months].sort()
    }));
};

export const buildTopFlyInsights = (records: TopFlyRecord[]): Insight[] =>
  records.slice(0, 3).map((record, index) => ({
    type: index === 0 ? 'recommendation' : 'pattern',
    message: `${record.name} (${record.bugFamily}, ${record.bugStage}, #${record.hookSize}, bead ${record.beadSizeMm}) is a top performer at ${(record.rate * 100).toFixed(1)}% over ${record.casts} casts${record.averageSizeInches ? `, averaging ${record.averageSizeInches}" fish` : ''}${record.speciesBreakdown.length ? `, led by ${record.speciesBreakdown[0].species} at ${(record.speciesBreakdown[0].percent * 100).toFixed(0)}%` : ''}.`,
    confidence: confidenceFromSamples(record.casts),
    supportingData: record
  }));
