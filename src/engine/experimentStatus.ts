import { ExperimentComparisonSummary, ExperimentFlyEntry, ExperimentOutcome, ExperimentWinner } from '@/types/experiment';
import { catchRate, rateDiff } from '@/utils/calculations';

const MIN_DECISIVE_CASTS_PER_FLY = 20;
const MIN_DECISIVE_RATE_DIFF = 0.08;
const TIE_RATE_DIFF = 0.02;

const deriveConfidenceScore = (totalCasts: number) => Math.min(1, totalCasts / (MIN_DECISIVE_CASTS_PER_FLY * 4));

const formatRatePercent = (value: number) => `${Math.round(value * 100)}%`;

const getDisplayFlyName = (entry: ExperimentFlyEntry) => entry.fly.name.trim() || entry.label;

export interface ExperimentStatusResult {
  winner: ExperimentWinner;
  outcome: ExperimentOutcome;
  confidenceScore: number;
  comparison: ExperimentComparisonSummary;
}

export const deriveExperimentStatus = (entries: ExperimentFlyEntry[]): ExperimentStatusResult => {
  const baselineEntry = entries.find((entry) => entry.role === 'baseline') ?? entries[0];
  const rankedTests = entries
    .filter((entry) => entry.slotId !== baselineEntry?.slotId)
    .map((entry) => ({
      ...entry,
      rate: catchRate(entry.catches, entry.casts)
    }))
    .sort((left, right) => right.rate - left.rate || right.casts - left.casts);
  const challenger = rankedTests[0];
  const totalCasts = entries.reduce((sum, entry) => sum + entry.casts, 0);

  if (!baselineEntry) {
    return {
      winner: 'inconclusive',
      outcome: 'inconclusive',
      confidenceScore: 0,
      comparison: {
        baselineLabel: 'Baseline',
        testLabel: 'Test',
        baselineCasts: 0,
        testCasts: 0,
        baselineRate: 0,
        testRate: 0,
        rateGap: 0,
        baselineMeetsMinimumSample: false,
        testMeetsMinimumSample: false,
        summary: 'Add a baseline fly and a test fly to run a direct comparison.'
      }
    };
  }

  if (!challenger) {
    return {
      winner: 'inconclusive',
      outcome: 'inconclusive',
      confidenceScore: deriveConfidenceScore(totalCasts),
      comparison: {
        baselineLabel: getDisplayFlyName(baselineEntry),
        testLabel: 'Test fly',
        baselineCasts: baselineEntry.casts,
        testCasts: 0,
        baselineRate: catchRate(baselineEntry.catches, baselineEntry.casts),
        testRate: 0,
        rateGap: 0,
        baselineMeetsMinimumSample: baselineEntry.casts >= MIN_DECISIVE_CASTS_PER_FLY,
        testMeetsMinimumSample: false,
        summary: 'Add at least one test fly to run a direct comparison.'
      }
    };
  }

  const baselineRate = catchRate(baselineEntry.catches, baselineEntry.casts);
  const testRate = challenger.rate;
  const gap = rateDiff(baselineRate, testRate);
  const baselineMeetsMinimumSample = baselineEntry.casts >= MIN_DECISIVE_CASTS_PER_FLY;
  const testMeetsMinimumSample = challenger.casts >= MIN_DECISIVE_CASTS_PER_FLY;
  const bothMeetMinimumSample = baselineMeetsMinimumSample && testMeetsMinimumSample;
  const baselineLabel = getDisplayFlyName(baselineEntry);
  const testLabel = getDisplayFlyName(challenger);

  if (!bothMeetMinimumSample) {
    const leaderLabel = testRate > baselineRate ? testLabel : baselineRate > testRate ? baselineLabel : `${baselineLabel} and ${testLabel}`;
    return {
      winner: 'inconclusive',
      outcome: 'inconclusive',
      confidenceScore: deriveConfidenceScore(totalCasts),
      comparison: {
        baselineLabel,
        testLabel,
        baselineCasts: baselineEntry.casts,
        testCasts: challenger.casts,
        baselineRate,
        testRate,
        rateGap: gap,
        baselineMeetsMinimumSample,
        testMeetsMinimumSample,
        summary:
          gap <= TIE_RATE_DIFF
            ? `${baselineLabel} and ${testLabel} are effectively tied so far at ${formatRatePercent(baselineRate)} vs ${formatRatePercent(testRate)}, but the comparison still needs more casts.`
            : `${leaderLabel} leads ${formatRatePercent(Math.max(baselineRate, testRate))} vs ${formatRatePercent(Math.min(baselineRate, testRate))}, but this comparison is still inconclusive.`
      }
    };
  }

  if (gap <= TIE_RATE_DIFF) {
    return {
      winner: 'tie',
      outcome: 'tie',
      confidenceScore: deriveConfidenceScore(totalCasts),
      comparison: {
        baselineLabel,
        testLabel,
        baselineCasts: baselineEntry.casts,
        testCasts: challenger.casts,
        baselineRate,
        testRate,
        rateGap: gap,
        baselineMeetsMinimumSample,
        testMeetsMinimumSample,
        summary: `${baselineLabel} and ${testLabel} are effectively tied at ${formatRatePercent(baselineRate)} vs ${formatRatePercent(testRate)}.`
      }
    };
  }

  if (gap < MIN_DECISIVE_RATE_DIFF) {
    const leaderLabel = testRate > baselineRate ? testLabel : baselineLabel;
    return {
      winner: 'inconclusive',
      outcome: 'inconclusive',
      confidenceScore: deriveConfidenceScore(totalCasts),
      comparison: {
        baselineLabel,
        testLabel,
        baselineCasts: baselineEntry.casts,
        testCasts: challenger.casts,
        baselineRate,
        testRate,
        rateGap: gap,
        baselineMeetsMinimumSample,
        testMeetsMinimumSample,
        summary: `${leaderLabel} leads ${formatRatePercent(Math.max(baselineRate, testRate))} vs ${formatRatePercent(Math.min(baselineRate, testRate))}, but the gap is still too thin to call this decisive.`
      }
    };
  }

  const winner = testRate > baselineRate ? testLabel : baselineLabel;
  const winnerLabel = testRate > baselineRate ? testLabel : baselineLabel;
  const loserLabel = testRate > baselineRate ? baselineLabel : testLabel;
  const winnerRate = testRate > baselineRate ? testRate : baselineRate;
  const loserRate = testRate > baselineRate ? baselineRate : testRate;

  return {
    winner,
    outcome: 'decisive',
    confidenceScore: deriveConfidenceScore(totalCasts),
    comparison: {
      baselineLabel,
      testLabel,
      baselineCasts: baselineEntry.casts,
      testCasts: challenger.casts,
      baselineRate,
      testRate,
      rateGap: gap,
      baselineMeetsMinimumSample,
      testMeetsMinimumSample,
      summary: `${winnerLabel} wins decisively at ${formatRatePercent(winnerRate)} vs ${formatRatePercent(loserRate)} over ${baselineEntry.casts} vs ${challenger.casts} casts.`
    }
  };
};
