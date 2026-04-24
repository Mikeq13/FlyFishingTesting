import { Experiment, Insight } from '@/types/experiment';
import { Session } from '@/types/session';
import { confidenceFromSamples, catchRate } from '@/utils/calculations';
import { getExperimentEntries } from '@/utils/experimentEntries';

export interface ExactSetupInsightRecord {
  label: string;
  flyLabel: string;
  technique: string;
  waterType: string;
  depthRange: string;
  rigLabel: string;
  casts: number;
  catches: number;
  rate: number;
  sessionCount: number;
  rivers: string[];
}

export interface ContextPerformanceRecord {
  label: string;
  waterType: string;
  depthRange: string;
  technique: string;
  rigLabel: string;
  casts: number;
  catches: number;
  rate: number;
  flyLabels: string[];
}

type ExactSetupAccumulator = ExactSetupInsightRecord & {
  riverSet: Set<string>;
  sessionIds: Set<number>;
};

type ContextAccumulator = ContextPerformanceRecord & {
  flySet: Set<string>;
};

const MIN_CASTS_FOR_SETUP = 12;
const MIN_CASTS_FOR_CONTEXT = 18;

const describeRig = (rigSetup?: Experiment['rigSetup']) => {
  if (!rigSetup) return 'Rig not logged';
  const leader = rigSetup.leaderFormulaName?.trim() || 'Custom leader';
  const flyCount = rigSetup.assignments.length || 0;
  return `${leader} · ${flyCount} ${flyCount === 1 ? 'fly' : 'flies'}`;
};

const describeFly = (entry: ReturnType<typeof getExperimentEntries>[number]) =>
  `${entry.fly.name || entry.label} · ${entry.fly.bugFamily}/${entry.fly.bugStage} · #${entry.fly.hookSize} · ${entry.fly.beadColor} ${entry.fly.beadSizeMm}`;

export const buildExactSetupInsightRecords = (sessions: Session[], experiments: Experiment[]): ExactSetupInsightRecord[] => {
  const sessionMap = new Map(sessions.map((session) => [session.id, session]));
  const stats = new Map<string, ExactSetupAccumulator>();

  for (const experiment of experiments) {
    const session = sessionMap.get(experiment.sessionId);
    if (!session) continue;
    const technique = experiment.technique ?? session.startingTechnique ?? 'Technique not set';
    const waterType = experiment.waterType ?? session.waterType;
    const depthRange = session.depthRange;
    const rigLabel = describeRig(experiment.rigSetup);

    for (const entry of getExperimentEntries(experiment)) {
      const flyLabel = describeFly(entry);
      const key = [flyLabel.toLowerCase(), technique.toLowerCase(), waterType.toLowerCase(), depthRange.toLowerCase(), rigLabel.toLowerCase()].join('|');
      const current =
        stats.get(key) ??
        {
          label: `${flyLabel} · ${technique} · ${waterType} · ${depthRange}`,
          flyLabel,
          technique,
          waterType,
          depthRange,
          rigLabel,
          casts: 0,
          catches: 0,
          rate: 0,
          sessionCount: 0,
          rivers: [],
          riverSet: new Set<string>(),
          sessionIds: new Set<number>()
        };

      current.casts += entry.casts;
      current.catches += entry.catches;
      current.rate = catchRate(current.catches, current.casts);
      current.sessionIds.add(session.id);
      if (session.riverName) {
        current.riverSet.add(session.riverName);
      }
      current.sessionCount = current.sessionIds.size;
      current.rivers = [...current.riverSet].sort();
      stats.set(key, current);
    }
  }

  return [...stats.values()]
    .filter((record) => record.casts >= MIN_CASTS_FOR_SETUP)
    .sort((left, right) => right.rate - left.rate || right.casts - left.casts)
    .map(({ riverSet: _riverSet, sessionIds: _sessionIds, ...record }) => record);
};

export const buildContextPerformanceRecords = (sessions: Session[], experiments: Experiment[]): ContextPerformanceRecord[] => {
  const sessionMap = new Map(sessions.map((session) => [session.id, session]));
  const stats = new Map<string, ContextAccumulator>();

  for (const experiment of experiments) {
    const session = sessionMap.get(experiment.sessionId);
    if (!session) continue;
    const technique = experiment.technique ?? session.startingTechnique ?? 'Technique not set';
    const waterType = experiment.waterType ?? session.waterType;
    const depthRange = session.depthRange;
    const rigLabel = describeRig(experiment.rigSetup);
    const key = [waterType.toLowerCase(), depthRange.toLowerCase(), technique.toLowerCase(), rigLabel.toLowerCase()].join('|');
    const current =
      stats.get(key) ??
      {
        label: `${waterType} · ${depthRange} · ${technique} · ${rigLabel}`,
        waterType,
        depthRange,
        technique,
        rigLabel,
        casts: 0,
        catches: 0,
        rate: 0,
        flyLabels: [],
        flySet: new Set<string>()
      };

    for (const entry of getExperimentEntries(experiment)) {
      current.casts += entry.casts;
      current.catches += entry.catches;
      current.flySet.add(entry.fly.name || entry.label);
    }
    current.rate = catchRate(current.catches, current.casts);
    current.flyLabels = [...current.flySet].sort();
    stats.set(key, current);
  }

  return [...stats.values()]
    .filter((record) => record.casts >= MIN_CASTS_FOR_CONTEXT)
    .sort((left, right) => right.rate - left.rate || right.casts - left.casts)
    .map(({ flySet: _flySet, ...record }) => record);
};

export const buildSetupInsights = (
  exactSetupRecords: ExactSetupInsightRecord[],
  contextRecords: ContextPerformanceRecord[]
): Insight[] => {
  const insights: Insight[] = [];
  const topExact = exactSetupRecords[0];
  const topContext = contextRecords[0];

  if (topExact) {
    insights.push({
      type: 'recommendation',
      message: `Best current bet: ${topExact.flyLabel} is producing ${(topExact.rate * 100).toFixed(1)}% in ${topExact.waterType} / ${topExact.depthRange} with ${topExact.technique}.`,
      confidence: confidenceFromSamples(topExact.casts),
      supportingData: {
        sampleCount: topExact.casts,
        signalType: 'exact_setup',
        ...topExact
      }
    });
  }

  if (topContext) {
    insights.push({
      type: 'pattern',
      message: `Strongest setup context: ${topContext.waterType} / ${topContext.depthRange} with ${topContext.technique} is returning ${(topContext.rate * 100).toFixed(1)}% across ${topContext.casts} casts.`,
      confidence: confidenceFromSamples(topContext.casts),
      supportingData: {
        sampleCount: topContext.casts,
        signalType: 'context_combo',
        ...topContext
      }
    });
  }

  return insights;
};
