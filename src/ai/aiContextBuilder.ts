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
  if (lowSampleExperiments > 0) {
    anomalies.push(`${lowSampleExperiments} experiments have <10 casts, so confidence is weak.`);
  }
  if (lowSampleExperiments > 0) anomalies.push(`${lowSampleExperiments} experiments have <10 casts, so confidence is weak.`);

  return {
    recentSessions: sessions.slice(0, 10),
    aggregatedStats,
    topInsights: insights.slice(0, 5),
    anomalies,
    activeSession
  };
};
