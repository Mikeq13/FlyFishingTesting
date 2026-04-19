import { deriveExperimentStatus } from './experimentStatus';
import { Experiment } from '@/types/experiment';
import { Session } from '@/types/session';
import { getExperimentEntries } from '@/utils/experimentEntries';

export interface ExperimentComparisonRecord {
  experimentId: number;
  sessionId: number;
  date: string;
  waterType?: string;
  technique?: string;
  outcome: Experiment['outcome'];
  winner: Experiment['winner'];
  confidenceScore: number;
  summary: string;
  baselineLabel: string;
  testLabel: string;
  baselineRate: number;
  testRate: number;
  baselineCasts: number;
  testCasts: number;
}

export const buildExperimentComparisonRecords = (sessions: Session[], experiments: Experiment[]): ExperimentComparisonRecord[] => {
  const sessionMap = new Map(sessions.map((session) => [session.id, session]));

  return experiments
    .map((experiment) => {
      const session = sessionMap.get(experiment.sessionId);
      const status = deriveExperimentStatus(getExperimentEntries(experiment));
      return {
        experimentId: experiment.id,
        sessionId: experiment.sessionId,
        date: session?.date ?? new Date().toISOString(),
        waterType: experiment.waterType ?? session?.waterType,
        technique: experiment.technique ?? session?.startingTechnique,
        outcome: status.outcome,
        winner: status.winner,
        confidenceScore: status.confidenceScore,
        summary: status.comparison.summary,
        baselineLabel: status.comparison.baselineLabel,
        testLabel: status.comparison.testLabel,
        baselineRate: status.comparison.baselineRate,
        testRate: status.comparison.testRate,
        baselineCasts: status.comparison.baselineCasts,
        testCasts: status.comparison.testCasts
      };
    })
    .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
};
