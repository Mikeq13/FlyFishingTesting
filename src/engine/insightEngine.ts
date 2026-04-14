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
