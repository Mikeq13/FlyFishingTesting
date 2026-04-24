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
  const riverRates = bucketRates(stats.byRiverName);
  const monthRates = bucketRates(stats.byMonth);
  const riverMonthRates = bucketRates(stats.byRiverMonth);

  const experimentalCandidates: Array<{ label: string; rates: Record<string, number>; castsByKey: Record<string, { casts: number }> }> = [
    { label: 'depth range', rates: depthRates, castsByKey: stats.byDepthRange },
    { label: 'fly type', rates: intentRates, castsByKey: stats.byFlyIntent }
  ];

  for (const c of experimentalCandidates) {
    if (Object.keys(c.rates).length < 2) continue;
    const { top, bottom } = topAndBottom(c.rates);
    if (!top || !bottom) continue;
    const topCasts = c.castsByKey[top[0]]?.casts || 0;
    const bottomCasts = c.castsByKey[bottom[0]]?.casts || 0;
    if (topCasts < 20 || bottomCasts < 20) continue;
    const diff = percentDiff(bottom[1], top[1]);
    if (diff > 0.25) {
      const sampleCount = topCasts + bottomCasts;
      insights.push({
        type: 'pattern',
        message: `Strong test signal: ${c.label} '${top[0]}' is outperforming '${bottom[0]}' in clean logged data by ${(diff * 100).toFixed(0)}%.`,
        confidence: confidenceFromSamples(sampleCount),
        supportingData: { dimension: c.label, top, bottom, diff, sampleCount }
      });
    }

    if (bottom[1] < 0.08) {
      const sampleCount = bottomCasts;
      insights.push({
        type: 'warning',
        message: `Weak zone identified in ${c.label} '${bottom[0]}' (catch rate ${(bottom[1] * 100).toFixed(1)}%).`,
        confidence: confidenceFromSamples(sampleCount),
        supportingData: { dimension: c.label, value: bottom[0], rate: bottom[1], sampleCount }
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

  if (Object.keys(riverMonthRates).length >= 2) {
    const { top } = topAndBottom(riverMonthRates);
    if (top && stats.byRiverMonth[top[0]]?.casts >= 20) {
      insights.push({
        type: 'recommendation',
        message: `River-season signal detected: '${top[0]}' is currently your strongest stored context for catch rate performance.`,
        confidence: confidenceFromSamples(stats.byRiverMonth[top[0]].casts),
        supportingData: { dimension: 'river-month', top, sampleCount: stats.byRiverMonth[top[0]].casts }
      });
    }
  }

  const contextualCandidates: Array<{ label: string; rates: Record<string, number>; castsByKey: Record<string, { casts: number }> }> = [
    { label: 'water type', rates: waterRates, castsByKey: stats.byWaterType },
    { label: 'river', rates: riverRates, castsByKey: stats.byRiverName },
    { label: 'month', rates: monthRates, castsByKey: stats.byMonth }
  ];

  for (const c of contextualCandidates) {
    if (Object.keys(c.rates).length < 1) continue;
    const { top } = topAndBottom(c.rates);
    if (!top) continue;
    const sampleCount = c.castsByKey[top[0]]?.casts || 0;
    if (sampleCount < 20) continue;
    insights.push({
      type: 'recommendation',
      message: `Strongest stored ${c.label} context: '${top[0]}' is returning ${(top[1] * 100).toFixed(1)}% catch rate over ${sampleCount} casts.`,
      confidence: confidenceFromSamples(sampleCount),
      supportingData: { dimension: c.label, top, sampleCount }
    });
  }

  if (!insights.length) {
    insights.push({
      type: 'recommendation',
      message: 'Not enough clean signal yet. Add more complete sessions and isolate one variable per experiment.',
      confidence: 'low',
      supportingData: {}
    });
  }

  return insights;
};
