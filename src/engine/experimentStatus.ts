import { ExperimentOutcome, ExperimentWinner } from '@/types/experiment';
import { catchRate, rateDiff } from '@/utils/calculations';

const MIN_DECISIVE_CASTS = 20;
const MIN_DECISIVE_RATE_DIFF = 0.08;

interface ExperimentStatusInput {
  controlCasts: number;
  controlCatches: number;
  variantCasts: number;
  variantCatches: number;
}

export interface ExperimentStatusResult {
  winner: ExperimentWinner;
  outcome: ExperimentOutcome;
  confidenceScore: number;
}

export const deriveExperimentStatus = ({
  controlCasts,
  controlCatches,
  variantCasts,
  variantCatches
}: ExperimentStatusInput): ExperimentStatusResult => {
  const controlRate = catchRate(controlCatches, controlCasts);
  const variantRate = catchRate(variantCatches, variantCasts);
  const totalCasts = controlCasts + variantCasts;
  const rateGap = rateDiff(controlRate, variantRate);

  if (controlRate === variantRate) {
    return {
      winner: totalCasts >= MIN_DECISIVE_CASTS ? 'tie' : 'inconclusive',
      outcome: totalCasts >= MIN_DECISIVE_CASTS ? 'tie' : 'inconclusive',
      confidenceScore: Math.min(1, totalCasts / 100)
    };
  }

  const winner: ExperimentWinner = controlRate > variantRate ? 'control' : 'variant';
  const outcome: ExperimentOutcome = totalCasts >= MIN_DECISIVE_CASTS && rateGap >= MIN_DECISIVE_RATE_DIFF ? 'decisive' : 'inconclusive';

  return {
    winner: outcome === 'decisive' ? winner : 'inconclusive',
    outcome,
    confidenceScore: Math.min(1, totalCasts / 100)
  };
};
