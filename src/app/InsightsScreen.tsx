import React, { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { InsightCard } from '@/components/InsightCard';
import { InsightsFilterPanel } from '@/components/InsightsFilterPanel';
import { PremiumFeatureGate } from '@/components/PremiumFeatureGate';
import { ScreenBackground } from '@/components/ScreenBackground';
import { buildAggregates } from '@/engine/aggregationEngine';
import { generateInsights } from '@/engine/insightEngine';
import { buildTopFlyInsights, buildTopFlyRecords } from '@/engine/topFlyEngine';
import { getExperimentEntries } from '@/utils/experimentEntries';
import { useAppStore } from './store';

const sizeBandLabel = (size: number): string => {
  if (size < 12) return '8-11"';
  if (size < 16) return '12-15"';
  if (size < 20) return '16-19"';
  return '20-24"';
};

const formatExactFlyOption = (flyName: string, hookSize: number, beadSizeMm: number, beadColor: string, bugFamily: string, bugStage: string) =>
  `${flyName} | #${hookSize} | ${beadColor} ${beadSizeMm} bead | ${bugFamily} | ${bugStage}`;

const toExactFlyKey = (flyName: string, hookSize: number, beadSizeMm: number, beadColor: string, bugFamily: string, bugStage: string) =>
  formatExactFlyOption(flyName.trim(), hookSize, beadSizeMm, beadColor, bugFamily, bugStage).toLowerCase();

const renderChartRow = (label: string, value: number, max: number, color: string) => (
  <View key={label} style={{ gap: 4 }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={{ color: '#f7fdff', fontWeight: '700' }}>{label}</Text>
      <Text style={{ color: '#d7f3ff' }}>{value}</Text>
    </View>
    <View style={{ height: 10, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}>
      <View style={{ width: `${max ? (value / max) * 100 : 0}%`, height: '100%', backgroundColor: color }} />
    </View>
  </View>
);

export const InsightsScreen = ({ navigation }: any) => {
  const { width } = useWindowDimensions();
  const { sessions, experiments, anglerComparisons, currentHasPremiumAccess, savedFlies } = useAppStore();
  const [riverFilter, setRiverFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [waterFilter, setWaterFilter] = useState('');
  const [depthFilter, setDepthFilter] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState('');
  const [flyFilter, setFlyFilter] = useState('');
  const [flyFilterMode, setFlyFilterMode] = useState<'pattern' | 'exact'>('pattern');
  const [hypothesisFilter, setHypothesisFilter] = useState('');
  const [minimumSizeFilter, setMinimumSizeFilter] = useState('');
  const [showRiverChoices, setShowRiverChoices] = useState(false);
  const [showFlyChoices, setShowFlyChoices] = useState(false);
  const [showHypothesisChoices, setShowHypothesisChoices] = useState(false);
  const contentMaxWidth = Platform.OS === 'web' ? Math.min(width - 24, 980) : undefined;

  const normalizedFilters = {
    river: riverFilter.trim().toLowerCase(),
    month: monthFilter.trim().toLowerCase(),
    water: waterFilter.trim().toLowerCase(),
    depth: depthFilter.trim().toLowerCase(),
    species: speciesFilter.trim().toLowerCase(),
    fly: flyFilter.trim().toLowerCase(),
    hypothesis: hypothesisFilter.trim().toLowerCase(),
    minimumSize: Number(minimumSizeFilter || '0') || 0
  };

  const filteredSessions = useMemo(
    () =>
      sessions.filter((session) => {
        const river = session.riverName?.toLowerCase() ?? '';
        const month = new Date(session.date).toLocaleString('en-US', { month: 'long' }).toLowerCase();
        const water = session.waterType.toLowerCase();
        const depth = session.depthRange.toLowerCase();

        return (
          (!normalizedFilters.river || river.includes(normalizedFilters.river)) &&
          (!normalizedFilters.month || month.includes(normalizedFilters.month)) &&
          (!normalizedFilters.water || water.includes(normalizedFilters.water)) &&
          (!normalizedFilters.depth || depth.includes(normalizedFilters.depth))
        );
      }),
    [normalizedFilters.depth, normalizedFilters.month, normalizedFilters.river, normalizedFilters.water, sessions]
  );

  const filteredSessionIds = useMemo(() => new Set(filteredSessions.map((session) => session.id)), [filteredSessions]);
  const riverOptions = useMemo(
    () =>
      [...new Set(sessions.map((session) => session.riverName?.trim()).filter((river): river is string => !!river))]
        .sort((left, right) => left.localeCompare(right)),
    [sessions]
  );
  const speciesOptions = useMemo(
    () =>
      [
        'All',
        ...[...new Set(experiments.flatMap((experiment) => getExperimentEntries(experiment).flatMap((entry) => entry.fishSpecies)))]
          .sort((left, right) => left.localeCompare(right))
      ] as string[],
    [experiments]
  );
  const flyOptions = useMemo(
    () =>
      [
        'All',
        ...[...new Set(savedFlies.map((fly) => fly.name.trim()).filter((name) => !!name))]
          .sort((left, right) => left.localeCompare(right))
      ] as string[],
    [savedFlies]
  );
  const exactFlyOptions = useMemo(
    () =>
      [
        'All',
        ...[
          ...new Set(
            savedFlies
              .map((fly) => formatExactFlyOption(fly.name.trim(), fly.hookSize, fly.beadSizeMm, fly.beadColor, fly.bugFamily, fly.bugStage))
              .filter((label) => !!label)
          )
        ].sort((left, right) => left.localeCompare(right))
      ] as string[],
    [savedFlies]
  );
  const hypothesisOptions = useMemo(
    () =>
      [
        'All',
        ...[
          ...new Set(
            experiments
              .map((experiment) => experiment.hypothesis.trim())
              .filter((hypothesis) => !!hypothesis)
          )
        ].sort((left, right) => left.localeCompare(right))
      ] as string[],
    [experiments]
  );

  const filteredExperiments = useMemo(
    () =>
      experiments.filter((experiment) => {
        if (!filteredSessionIds.has(experiment.sessionId)) return false;

        const entries = getExperimentEntries(experiment);
        const matchesFly =
          !normalizedFilters.fly ||
          entries.some((entry) =>
            flyFilterMode === 'exact'
              ? toExactFlyKey(entry.fly.name || entry.label, entry.fly.hookSize, entry.fly.beadSizeMm, entry.fly.beadColor, entry.fly.bugFamily, entry.fly.bugStage) === normalizedFilters.fly
              : (entry.fly.name || '').trim().toLowerCase() === normalizedFilters.fly
          );
        const matchesSpecies =
          !normalizedFilters.species ||
          entries.some((entry) => entry.fishSpecies.some((species) => species.toLowerCase().includes(normalizedFilters.species)));
        const matchesSize =
          !normalizedFilters.minimumSize ||
          entries.some((entry) => entry.fishSizesInches.some((size) => size >= normalizedFilters.minimumSize));
        const matchesHypothesis =
          !normalizedFilters.hypothesis ||
          experiment.hypothesis.trim().toLowerCase() === normalizedFilters.hypothesis;

        return matchesFly && matchesSpecies && matchesSize && matchesHypothesis;
      }),
    [experiments, filteredSessionIds, flyFilterMode, normalizedFilters.fly, normalizedFilters.hypothesis, normalizedFilters.minimumSize, normalizedFilters.species]
  );

  const filteredInsights = useMemo(
    () => generateInsights(buildAggregates(filteredSessions, filteredExperiments)),
    [filteredExperiments, filteredSessions]
  );
  const filteredTopFlyRecords = useMemo(
    () => buildTopFlyRecords(filteredSessions, filteredExperiments),
    [filteredExperiments, filteredSessions]
  );
  const filteredTopFlyInsights = useMemo(
    () => buildTopFlyInsights(filteredTopFlyRecords),
    [filteredTopFlyRecords]
  );

  const analytics = useMemo(() => {
    const speciesCounts = new Map<string, number>();
    const sizeBandCounts = new Map<string, number>();

    filteredExperiments.forEach((experiment) => {
      getExperimentEntries(experiment).forEach((entry) => {
        entry.fishSpecies.forEach((species) => {
          speciesCounts.set(species, (speciesCounts.get(species) ?? 0) + 1);
        });
        entry.fishSizesInches.forEach((size) => {
          const band = sizeBandLabel(size);
          sizeBandCounts.set(band, (sizeBandCounts.get(band) ?? 0) + 1);
        });
      });
    });

    const topSpecies = [...speciesCounts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
    const sizeBands = ['8-11"', '12-15"', '16-19"', '20-24"']
      .map((band) => [band, sizeBandCounts.get(band) ?? 0] as const)
      .filter(([, count]) => count > 0);

    return {
      topSpecies,
      sizeBands,
      maxSpeciesCount: topSpecies[0]?.[1] ?? 0,
      totalSpeciesCount: topSpecies.reduce((sum, [, count]) => sum + count, 0),
      maxSizeBandCount: sizeBands.reduce((max, [, count]) => Math.max(max, count), 0)
    };
  }, [filteredExperiments]);

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10, width: '100%', alignSelf: 'center', maxWidth: contentMaxWidth }}>
        {!currentHasPremiumAccess ? (
          <PremiumFeatureGate
            title="Premium Insights"
            description="River-specific trends, top flies, and cross-angler comparisons are part of the premium research experience."
          />
        ) : (
          <>
            <View style={{ gap: 4 }}>
              <Text style={{ fontSize: 28, fontWeight: '800', color: '#f7fdff' }}>Insights</Text>
              <Text style={{ color: '#d7f3ff', lineHeight: 20 }}>
                Review the strongest patterns in your data, your best flies, and where anglers overlap.
              </Text>
            </View>

            <InsightsFilterPanel
              riverOptions={riverOptions}
              riverFilter={riverFilter}
              showRiverChoices={showRiverChoices}
              onToggleRiverChoices={() => setShowRiverChoices((current) => !current)}
              onSelectRiver={(river) => {
                setRiverFilter(river);
                setShowRiverChoices(false);
              }}
              onClearRiver={() => {
                setRiverFilter('');
                setShowRiverChoices(false);
              }}
              hypothesisOptions={hypothesisOptions}
              hypothesisFilter={hypothesisFilter}
              showHypothesisChoices={showHypothesisChoices}
              onToggleHypothesisChoices={() => setShowHypothesisChoices((current) => !current)}
              onSelectHypothesis={(value) => {
                setHypothesisFilter(value);
                setShowHypothesisChoices(false);
              }}
              onClearHypothesis={() => {
                setHypothesisFilter('');
                setShowHypothesisChoices(false);
              }}
              monthFilter={monthFilter}
              onMonthChange={setMonthFilter}
              onClearMonth={() => setMonthFilter('')}
              waterFilter={waterFilter}
              onWaterChange={setWaterFilter}
              depthFilter={depthFilter}
              onDepthChange={setDepthFilter}
              flyFilterMode={flyFilterMode}
              onFlyFilterModeChange={(value) => {
                setFlyFilterMode(value);
                setFlyFilter('');
                setShowFlyChoices(false);
              }}
              flyOptions={flyOptions}
              exactFlyOptions={exactFlyOptions}
              flyFilter={flyFilter}
              showFlyChoices={showFlyChoices}
              onToggleFlyChoices={() => setShowFlyChoices((current) => !current)}
              onSelectFly={(value) => {
                setFlyFilter(value);
                setShowFlyChoices(false);
              }}
              onClearFly={() => {
                setFlyFilter('');
                setShowFlyChoices(false);
              }}
              speciesOptions={speciesOptions}
              speciesFilter={speciesFilter}
              onSpeciesChange={setSpeciesFilter}
              minimumSizeFilter={minimumSizeFilter}
              onMinimumSizeChange={setMinimumSizeFilter}
              filteredExperimentCount={filteredExperiments.length}
              filteredSessionCount={filteredSessions.length}
            />

            <View style={{ gap: 10, backgroundColor: 'rgba(6, 27, 44, 0.70)', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: 'rgba(202,240,248,0.16)' }}>
              <Text style={{ color: '#f7fdff', fontWeight: '800', fontSize: 18 }}>Catch Analytics</Text>
              {!!analytics.topSpecies.length ? (
                <View style={{ gap: 8 }}>
                  <Text style={{ color: '#d7f3ff', fontWeight: '700' }}>All species breakdown</Text>
                  {analytics.topSpecies.slice(0, 6).map(([species, count]) =>
                    renderChartRow(
                      `${species} (${analytics.totalSpeciesCount ? ((count / analytics.totalSpeciesCount) * 100).toFixed(0) : 0}%)`,
                      count,
                      analytics.maxSpeciesCount,
                      '#2a9d8f'
                    )
                  )}
                </View>
              ) : (
                <Text style={{ color: '#d7f3ff' }}>No species data matches the current filters yet.</Text>
              )}

              {!!analytics.sizeBands.length && (
                <View style={{ gap: 8 }}>
                  <Text style={{ color: '#d7f3ff', fontWeight: '700' }}>Fish size bands</Text>
                  {analytics.sizeBands.map(([band, count]) => renderChartRow(band, count, analytics.maxSizeBandCount, '#4ea8de'))}
                </View>
              )}
            </View>

            {filteredInsights.map((insight, idx) => (
              <InsightCard key={`${insight.type}-${idx}`} insight={insight} />
            ))}

            {!!filteredTopFlyInsights.length && (
              <>
                <Text style={{ fontSize: 20, fontWeight: '800', marginTop: 4, marginBottom: 2, color: '#f7fdff' }}>Top Flies</Text>
                {filteredTopFlyInsights.map((insight, idx) => (
                  <InsightCard key={`top-fly-${idx}`} insight={insight} />
                ))}
                <View style={{ gap: 8 }}>
                  {filteredTopFlyRecords.slice(0, 5).map((record) => (
                    (() => {
                      const selectedSpeciesCount = normalizedFilters.species
                        ? record.speciesBreakdown.find((item) => item.species.toLowerCase() === normalizedFilters.species)?.count ?? 0
                        : 0;
                      const selectedSpeciesTotal = normalizedFilters.species
                        ? filteredTopFlyRecords.reduce(
                            (sum, flyRecord) =>
                              sum +
                              (flyRecord.speciesBreakdown.find((item) => item.species.toLowerCase() === normalizedFilters.species)?.count ?? 0),
                            0
                          )
                        : 0;
                      const selectedSpeciesPercent = selectedSpeciesTotal ? (selectedSpeciesCount / selectedSpeciesTotal) * 100 : 0;

                      return (
                        <View
                          key={`${record.name}-${record.hookSize}-${record.beadSizeMm}`}
                          style={{ backgroundColor: 'rgba(6, 27, 44, 0.70)', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: 'rgba(202,240,248,0.16)' }}
                        >
                          <Text style={{ color: '#f7fdff', fontWeight: '700', fontSize: 16 }}>{record.name}</Text>
                          <Text style={{ color: '#d7f3ff' }}>
                            #{record.hookSize} | {record.beadColor} bead {record.beadSizeMm} | {(record.rate * 100).toFixed(1)}% catch rate
                          </Text>
                          <Text style={{ color: '#bde6f6', fontSize: 12 }}>{record.casts} casts logged</Text>
                          {record.averageSizeInches ? (
                            <Text style={{ color: '#bde6f6', fontSize: 12 }}>
                              Avg fish size: {record.averageSizeInches}"{record.largestFishInches ? ` | Largest: ${record.largestFishInches}"` : ''}
                            </Text>
                          ) : null}
                          {!!record.topSpecies.length && !normalizedFilters.species && (
                            <Text style={{ color: '#bde6f6', fontSize: 12 }}>
                              Common species: {record.topSpecies.join(', ')}
                            </Text>
                          )}
                          {!!record.speciesBreakdown.length && !normalizedFilters.species && (
                            <Text style={{ color: '#bde6f6', fontSize: 12 }}>
                              Species breakdown: {record.speciesBreakdown.map((item) => `${item.species} ${(item.percent * 100).toFixed(0)}%`).join(' | ')}
                            </Text>
                          )}
                          {!!normalizedFilters.species && (
                            <Text style={{ color: '#bde6f6', fontSize: 12 }}>
                              {selectedSpeciesCount} {speciesFilter} caught | {selectedSpeciesPercent.toFixed(0)}% of filtered {speciesFilter} catches
                            </Text>
                          )}
                        </View>
                      );
                    })()
                  ))}
                </View>
              </>
            )}

            {!!anglerComparisons.length && (
              <>
                <Text style={{ fontSize: 20, fontWeight: '800', marginTop: 4, marginBottom: 2, color: '#f7fdff' }}>Across Anglers</Text>
                {anglerComparisons.map((insight, idx) => (
                  <InsightCard key={`comparison-${idx}`} insight={insight} />
                ))}
              </>
            )}

            <Pressable onPress={() => navigation.navigate('Session')} style={{ backgroundColor: '#2a9d8f', borderRadius: 14, padding: 14, marginTop: 6 }}>
              <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Back to Session Setup</Text>
            </Pressable>
            <Pressable onPress={() => navigation.navigate('History')} style={{ backgroundColor: '#1d3557', borderRadius: 14, padding: 14 }}>
              <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>View History</Text>
            </Pressable>
            <Pressable onPress={() => navigation.navigate('Home')} style={{ backgroundColor: '#264653', borderRadius: 14, padding: 14 }}>
              <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Go Home</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </ScreenBackground>
  );
};
