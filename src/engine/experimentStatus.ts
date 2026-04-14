import { ExperimentFlyEntry, ExperimentOutcome, ExperimentWinner } from '@/types/experiment';
import { catchRate, rateDiff } from '@/utils/calculations';

const MIN_DECISIVE_CASTS = 20;
const MIN_DECISIVE_RATE_DIFF = 0.08;

export interface ExperimentStatusResult {
  winner: ExperimentWinner;
  outcome: ExperimentOutcome;
  confidenceScore: number;
}

export const deriveExperimentStatus = (entries: ExperimentFlyEntry[]): ExperimentStatusResult => {
  const rankedEntries = [...entries]
    .map((entry) => ({
      ...entry,
      rate: catchRate(entry.catches, entry.casts)
    }))
    .sort((left, right) => right.rate - left.rate);

  const leader = rankedEntries[0];
  const runnerUp = rankedEntries[1];
  const totalCasts = entries.reduce((sum, entry) => sum + entry.casts, 0);

  if (!leader) {
    return {
      winner: 'inconclusive',
      outcome: 'inconclusive',
      confidenceScore: 0
    };
  }

  if (!runnerUp) {
    return {
      winner: totalCasts >= MIN_DECISIVE_CASTS ? leader.role === 'baseline' ? 'baseline' : leader.label : 'inconclusive',
      outcome: totalCasts >= MIN_DECISIVE_CASTS ? 'decisive' : 'inconclusive',
      confidenceScore: Math.min(1, totalCasts / 100)
    };
  }

  if (leader.rate === runnerUp.rate) {
    return {
      winner: totalCasts >= MIN_DECISIVE_CASTS ? 'tie' : 'inconclusive',
      outcome: totalCasts >= MIN_DECISIVE_CASTS ? 'tie' : 'inconclusive',
      confidenceScore: Math.min(1, totalCasts / 100)
    };
  }

  const outcome: ExperimentOutcome = totalCasts >= MIN_DECISIVE_CASTS && rateDiff(leader.rate, runnerUp.rate) >= MIN_DECISIVE_RATE_DIFF ? 'decisive' : 'inconclusive';

  return {
    winner: outcome === 'decisive' ? (leader.role === 'baseline' ? 'baseline' : leader.label) : 'inconclusive',
    outcome,
    confidenceScore: Math.min(1, totalCasts / 100)
  };
};
