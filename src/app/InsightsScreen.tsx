import React, { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { InsightCard } from '@/components/InsightCard';
import { InsightsFilterPanel } from '@/components/InsightsFilterPanel';
import { OptionChips } from '@/components/OptionChips';
import { PremiumFeatureGate } from '@/components/PremiumFeatureGate';
import { ScreenBackground } from '@/components/ScreenBackground';
import { AppButton } from '@/components/ui/AppButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { StatusBanner } from '@/components/ui/StatusBanner';
import { buildAggregates } from '@/engine/aggregationEngine';
import { generateAnglerComparisons } from '@/engine/anglerComparisonEngine';
import { generateInsights } from '@/engine/insightEngine';
import { buildTopFlyInsights, buildTopFlyRecords } from '@/engine/topFlyEngine';
import { buildExperimentComparisonRecords } from '@/engine/experimentComparisonEngine';
import { getExperimentEntries } from '@/utils/experimentEntries';
import { useAppStore } from './store';
import { InsightsContextMode } from '@/types/group';
import { formatExactFlyOption, sizeBandLabel, toExactFlyKey } from './insightsHelpers';
import { useResponsiveLayout } from '@/design/layout';
import { useTheme } from '@/design/theme';
import {
  filterExperimentsForInsightsContext,
  filterSessionsForInsightsContext,
  getJoinedGroupsForUser,
  getVisibleFriendOptions
} from '@/services/remoteInsightsService';

export const InsightsScreen = ({ navigation }: any) => {
  const { theme } = useTheme();
  const layout = useResponsiveLayout();
  const {
    sessions,
    allSessions,
    experiments,
    allExperiments,
    allCatchEvents,
    groups,
    groupMemberships,
    sharePreferences,
    users,
    currentUser,
    currentHasPremiumAccess,
    sharedDataStatus,
    syncStatus,
    remoteSession,
    savedFlies,
    getSessionIntegrity,
    getExperimentIntegrity
  } = useAppStore();
  const [insightsContext, setInsightsContext] = useState<InsightsContextMode>('mine');
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedFriendUserId, setSelectedFriendUserId] = useState<number | null>(null);
  const [riverFilter, setRiverFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [waterFilter, setWaterFilter] = useState('');
  const [depthFilter, setDepthFilter] = useState('');
  const [techniqueFilter, setTechniqueFilter] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState('');
  const [flyFilter, setFlyFilter] = useState('');
  const [flyFilterMode, setFlyFilterMode] = useState<'pattern' | 'exact'>('pattern');
  const [hypothesisFilter, setHypothesisFilter] = useState('');
  const [minimumSizeFilter, setMinimumSizeFilter] = useState('');
  const [showRiverChoices, setShowRiverChoices] = useState(false);
  const [showFlyChoices, setShowFlyChoices] = useState(false);
  const [showHypothesisChoices, setShowHypothesisChoices] = useState(false);
  const modeSummaryLabel = (mode: 'practice' | 'experiment' | 'competition') =>
    mode === 'practice' ? 'Practice scouting' : mode === 'experiment' ? 'Experiment comparison' : 'Competition scorekeeping';
  const sharedDataSettling = !!remoteSession && sharedDataStatus === 'loading';
  const joinedGroups = useMemo(
    () => (sharedDataSettling ? [] : getJoinedGroupsForUser(currentUser?.id, groups, groupMemberships)),
    [currentUser?.id, groupMemberships, groups, sharedDataSettling]
  );

  React.useEffect(() => {
    if (!joinedGroups.length) return;
    setSelectedGroupId((current) => (current && joinedGroups.some((group) => group.id === current) ? current : joinedGroups[0].id));
  }, [joinedGroups]);

  const visibleFriendOptions = useMemo(
    () => getVisibleFriendOptions(currentUser?.id, selectedGroupId, groupMemberships, users),
    [currentUser?.id, groupMemberships, selectedGroupId, users]
  );

  React.useEffect(() => {
    if (!visibleFriendOptions.length) {
      setSelectedFriendUserId(null);
      return;
    }
    setSelectedFriendUserId((current) =>
      current && visibleFriendOptions.some((user) => user.id === current) ? current : visibleFriendOptions[0].id
    );
  }, [visibleFriendOptions]);

  const normalizedFilters = {
    river: riverFilter.trim().toLowerCase(),
    month: monthFilter.trim().toLowerCase(),
    water: waterFilter.trim().toLowerCase(),
    depth: depthFilter.trim().toLowerCase(),
    technique: techniqueFilter.trim().toLowerCase(),
    species: speciesFilter.trim().toLowerCase(),
    fly: flyFilter.trim().toLowerCase(),
    hypothesis: hypothesisFilter.trim().toLowerCase(),
    minimumSize: Number(minimumSizeFilter || '0') || 0
  };

  const sourceSessions = insightsContext === 'mine' ? sessions : allSessions;
  const sourceExperiments = insightsContext === 'mine' ? experiments : allExperiments;
  const cleanSourceSessions = useMemo(
    () => sourceSessions.filter((session) => getSessionIntegrity(session.id).analyticsEligible),
    [getSessionIntegrity, sourceSessions]
  );
  const cleanSourceExperiments = useMemo(
    () => sourceExperiments.filter((experiment) => getExperimentIntegrity(experiment.id).analyticsEligible),
    [getExperimentIntegrity, sourceExperiments]
  );
  const excludedSessionCount = sourceSessions.length - cleanSourceSessions.length;
  const excludedExperimentCount = sourceExperiments.length - cleanSourceExperiments.length;

  const contextSessions = useMemo(
    () =>
      filterSessionsForInsightsContext({
        currentUserId: currentUser?.id,
        mode: insightsContext,
        selectedGroupId,
        selectedFriendUserId,
        sessions: cleanSourceSessions,
        sharePreferences
      }),
    [cleanSourceSessions, currentUser?.id, insightsContext, selectedFriendUserId, selectedGroupId, sharePreferences]
  );

  const filteredSessions = useMemo(
    () =>
      contextSessions.filter((session) => {
        const river = session.riverName?.toLowerCase() ?? '';
        const month = new Date(session.date).toLocaleString('en-US', { month: 'long' }).toLowerCase();
        const water = session.waterType.toLowerCase();
        const depth = session.depthRange.toLowerCase();
        const technique = session.startingTechnique?.toLowerCase() ?? '';

        return (
          (!normalizedFilters.river || river.includes(normalizedFilters.river)) &&
          (!normalizedFilters.month || month.includes(normalizedFilters.month)) &&
          (!normalizedFilters.water || water.includes(normalizedFilters.water)) &&
          (!normalizedFilters.depth || depth.includes(normalizedFilters.depth)) &&
          (!normalizedFilters.technique || technique === normalizedFilters.technique)
        );
      }),
    [contextSessions, normalizedFilters.depth, normalizedFilters.month, normalizedFilters.river, normalizedFilters.technique, normalizedFilters.water]
  );

  const filteredSessionIds = useMemo(() => new Set(filteredSessions.map((session) => session.id)), [filteredSessions]);
  const riverOptions = useMemo(
    () =>
      [...new Set(contextSessions.map((session) => session.riverName?.trim()).filter((river): river is string => !!river))]
        .sort((left, right) => left.localeCompare(right)),
    [contextSessions]
  );
  const speciesOptions = useMemo(
    () =>
      [
        'All',
        ...[...new Set(cleanSourceExperiments.flatMap((experiment) => getExperimentEntries(experiment).flatMap((entry) => entry.fishSpecies)))]
          .sort((left, right) => left.localeCompare(right))
      ] as string[],
    [cleanSourceExperiments]
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
            cleanSourceExperiments
              .map((experiment) => experiment.hypothesis.trim())
              .filter((hypothesis) => !!hypothesis)
          )
        ].sort((left, right) => left.localeCompare(right))
      ] as string[],
    [cleanSourceExperiments]
  );

  const contextualExperiments = useMemo(
    () => filterExperimentsForInsightsContext(cleanSourceExperiments, filteredSessionIds),
    [cleanSourceExperiments, filteredSessionIds]
  );

  const filteredExperiments = useMemo(
    () =>
      contextualExperiments.filter((experiment) => {
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
        const matchesTechnique =
          !normalizedFilters.technique ||
          (experiment.technique ?? contextSessions.find((session) => session.id === experiment.sessionId)?.startingTechnique ?? '')
            .trim()
            .toLowerCase() === normalizedFilters.technique;

        return matchesFly && matchesSpecies && matchesSize && matchesHypothesis && matchesTechnique;
      }),
    [contextSessions, contextualExperiments, filteredSessionIds, flyFilterMode, normalizedFilters.fly, normalizedFilters.hypothesis, normalizedFilters.minimumSize, normalizedFilters.species, normalizedFilters.technique]
  );

  const filteredCatchEvents = useMemo(
    () => allCatchEvents.filter((event) => filteredSessionIds.has(event.sessionId)),
    [allCatchEvents, filteredSessionIds]
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
  const comparisonRecords = useMemo(
    () => buildExperimentComparisonRecords(filteredSessions, filteredExperiments),
    [filteredExperiments, filteredSessions]
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

    filteredCatchEvents.forEach((event) => {
      if (event.species) {
        speciesCounts.set(event.species, (speciesCounts.get(event.species) ?? 0) + 1);
      }
      if (typeof event.lengthValue === 'number' && Number.isFinite(event.lengthValue) && event.lengthUnit === 'in') {
        const band = sizeBandLabel(event.lengthValue);
        sizeBandCounts.set(band, (sizeBandCounts.get(band) ?? 0) + 1);
      }
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
  }, [filteredCatchEvents, filteredExperiments]);

  const contextComparisons = useMemo(() => {
    if (insightsContext === 'mine') {
      return [];
    }
    const relevantUsers = insightsContext === 'friend'
      ? users.filter((user) => user.id === currentUser?.id || user.id === selectedFriendUserId)
      : users.filter((user) =>
          groupMemberships.some((membership) => membership.groupId === selectedGroupId && membership.userId === user.id)
        );
    return generateAnglerComparisons(relevantUsers, filteredSessions, filteredExperiments);
  }, [currentUser?.id, filteredExperiments, filteredSessions, groupMemberships, insightsContext, selectedFriendUserId, selectedGroupId, users]);

  const renderChartRow = (label: string, value: number, max: number, color: string) => (
    <View key={label} style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ color: theme.colors.text, fontWeight: '700' }}>{label}</Text>
        <Text style={{ color: theme.colors.textSoft }}>{value}</Text>
      </View>
      <View style={{ height: 10, borderRadius: 999, backgroundColor: theme.colors.surfaceMuted, overflow: 'hidden' }}>
        <View style={{ width: `${max ? (value / max) * 100 : 0}%`, height: '100%', backgroundColor: color }} />
      </View>
    </View>
  );

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={layout.buildScrollContentStyle({ gap: 10, bottomPadding: 40 })}>
        {!currentHasPremiumAccess ? (
          <PremiumFeatureGate
            title="Premium Insights"
            description="River-specific trends, top flies, and cross-angler comparisons are part of the premium research experience."
          />
        ) : (
          <>
            <ScreenHeader
              title="Insights"
              subtitle="Review the strongest patterns in your data, compare anglers with context, and keep technique in view only where it sharpens the read."
              eyebrow="Shared Learning"
            />
            {sharedDataSettling ? (
              <StatusBanner tone="info" text="Shared groups and friend comparisons are still loading. Group filters will unlock as soon as shared data is ready." />
            ) : null}
            {!sharedDataSettling && sharedDataStatus === 'error' ? (
              <StatusBanner
                tone="warning"
                text={
                  syncStatus.lastError
                    ? `Shared insights are temporarily unavailable: ${syncStatus.lastError}`
                    : 'Shared insights are temporarily unavailable right now. Your local insight history is still safe.'
                }
              />
            ) : null}

            <SectionCard title="View Context" subtitle="Switch between your own data, a shared group, or a friend comparison without losing trust in the numbers.">
              <OptionChips
                label="Insights Context"
                options={['mine', 'group', 'friend'] as const}
                value={insightsContext}
                onChange={(value) => setInsightsContext(value as InsightsContextMode)}
              />
              {insightsContext !== 'mine' && joinedGroups.length ? (
                <OptionChips
                  label="Shared Group"
                  options={joinedGroups.map((group) => group.name)}
                  value={joinedGroups.find((group) => group.id === selectedGroupId)?.name ?? joinedGroups[0]?.name}
                  onChange={(value) => {
                    const selected = joinedGroups.find((group) => group.name === value);
                    setSelectedGroupId(selected?.id ?? null);
                  }}
                />
              ) : null}
              {insightsContext === 'friend' && visibleFriendOptions.length ? (
                <OptionChips
                  label="Specific Friend"
                  options={visibleFriendOptions.map((user) => user.name)}
                  value={visibleFriendOptions.find((user) => user.id === selectedFriendUserId)?.name ?? visibleFriendOptions[0]?.name}
                  onChange={(value) => {
                    const selected = visibleFriendOptions.find((user) => user.name === value);
                    setSelectedFriendUserId(selected?.id ?? null);
                  }}
                />
              ) : null}
            </SectionCard>

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
              techniqueFilter={techniqueFilter}
              onTechniqueChange={setTechniqueFilter}
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

            <SectionCard title="Catch Analytics" subtitle="See what is actually surfacing in the selected context right now.">
              <Text style={{ color: theme.colors.textSoft }}>
                Sessions in view: {filteredSessions.length} | Catch records in view: {filteredCatchEvents.length}
              </Text>
              {(excludedSessionCount > 0 || excludedExperimentCount > 0) ? (
                <Text style={{ color: theme.colors.textSoft }}>
                  Integrity filter excluded {excludedSessionCount} session{excludedSessionCount === 1 ? '' : 's'} and {excludedExperimentCount} experiment{excludedExperimentCount === 1 ? '' : 's'} that are legacy, incomplete, orphaned, archived, or pending cleanup.
                </Text>
              ) : null}
              {!!filteredSessions.length && (
                <View style={{ gap: 6 }}>
                  <Text style={{ color: theme.colors.text, fontWeight: '700' }}>Shared Sessions</Text>
                  {filteredSessions.slice(0, 5).map((session) => {
                    const owner = users.find((user) => user.id === session.userId);
                    const sessionCatchCount = filteredCatchEvents.filter((event) => event.sessionId === session.id).length;
                    return (
                      <Text key={session.id} style={{ color: theme.colors.textSoft }}>
                        {(owner?.name ?? 'Angler')} | {modeSummaryLabel(session.mode)} | {session.startingTechnique ?? 'Technique not set'} | {session.riverName ?? 'Unknown river'} | {sessionCatchCount} catches
                      </Text>
                    );
                  })}
                </View>
              )}
              {!!analytics.topSpecies.length ? (
                <View style={{ gap: 8 }}>
                  <Text style={{ color: theme.colors.text, fontWeight: '700' }}>All species breakdown</Text>
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
                <Text style={{ color: theme.colors.textSoft }}>No clean catch data matches the current filters yet.</Text>
              )}

              {!!analytics.sizeBands.length && (
                <View style={{ gap: 8 }}>
                  <Text style={{ color: theme.colors.text, fontWeight: '700' }}>Fish size bands</Text>
                  {analytics.sizeBands.map(([band, count]) => renderChartRow(band, count, analytics.maxSizeBandCount, '#4ea8de'))}
                </View>
              )}
            </SectionCard>

            {filteredInsights.map((insight, idx) => (
              <InsightCard key={`${insight.type}-${idx}`} insight={insight} />
            ))}

            {!!comparisonRecords.length && (
              <SectionCard
                title="Direct Experiment Comparisons"
                subtitle="Keep head-to-head fly tests separate from broad top-fly rankings so direct winners do not blur into aggregate performance."
                tone="light"
              >
                <View style={{ gap: 10 }}>
                  {comparisonRecords.slice(0, 5).map((record) => (
                    <View
                      key={`comparison-${record.experimentId}`}
                      style={{
                        backgroundColor: theme.colors.nestedSurface,
                        borderRadius: theme.radius.md,
                        padding: 12,
                        borderWidth: 1,
                        borderColor: theme.colors.nestedSurfaceBorder,
                        gap: 6
                      }}
                    >
                      <Text style={{ color: theme.colors.textDark, fontWeight: '800' }}>
                        {record.outcome === 'decisive'
                          ? 'Decisive comparison'
                          : record.outcome === 'tie'
                            ? 'Tie comparison'
                            : 'Inconclusive comparison'}
                      </Text>
                      <Text style={{ color: theme.colors.textDarkSoft }}>{record.summary}</Text>
                      <Text style={{ color: theme.colors.textDarkSoft, fontSize: 12 }}>
                        {record.baselineLabel}: {(record.baselineRate * 100).toFixed(1)}% over {record.baselineCasts} casts | {record.testLabel}: {(record.testRate * 100).toFixed(1)}% over {record.testCasts} casts
                      </Text>
                      <Text style={{ color: theme.colors.textDarkSoft, fontSize: 12 }}>
                        {record.waterType ?? 'Water not set'} | {record.technique ?? 'Technique not set'}
                      </Text>
                    </View>
                  ))}
                </View>
              </SectionCard>
            )}

            {!!filteredTopFlyInsights.length && (
              <>
                <Text style={{ fontSize: 20, fontWeight: '800', marginTop: 4, marginBottom: 2, color: theme.colors.text }}>Top Flies</Text>
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
                          style={{ backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, padding: 12, borderWidth: 1, borderColor: theme.colors.border }}
                        >
                          <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 16 }}>{record.name}</Text>
                          <Text style={{ color: theme.colors.textSoft }}>
                            #{record.hookSize} | {record.beadColor} bead {record.beadSizeMm} | {(record.rate * 100).toFixed(1)}% catch rate
                          </Text>
                          <Text style={{ color: theme.colors.textSoft, fontSize: 12 }}>{record.casts} casts logged</Text>
                          {record.averageSizeInches ? (
                            <Text style={{ color: theme.colors.textSoft, fontSize: 12 }}>
                              Avg fish size: {record.averageSizeInches}"{record.largestFishInches ? ` | Largest: ${record.largestFishInches}"` : ''}
                            </Text>
                          ) : null}
                          {!!record.topSpecies.length && !normalizedFilters.species && (
                            <Text style={{ color: theme.colors.textSoft, fontSize: 12 }}>
                              Common species: {record.topSpecies.join(', ')}
                            </Text>
                          )}
                          {!!record.speciesBreakdown.length && !normalizedFilters.species && (
                            <Text style={{ color: theme.colors.textSoft, fontSize: 12 }}>
                              Species breakdown: {record.speciesBreakdown.map((item) => `${item.species} ${(item.percent * 100).toFixed(0)}%`).join(' | ')}
                            </Text>
                          )}
                          {!!normalizedFilters.species && (
                            <Text style={{ color: theme.colors.textSoft, fontSize: 12 }}>
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

            {!!contextComparisons.length && (
              <>
                <Text style={{ fontSize: 20, fontWeight: '800', marginTop: 4, marginBottom: 2, color: theme.colors.text }}>Across Anglers</Text>
                {contextComparisons.map((insight, idx) => (
                  <InsightCard key={`comparison-${idx}`} insight={insight} />
                ))}
              </>
            )}

            <AppButton label="Back to Session Setup" onPress={() => navigation.navigate('Session')} />
            <AppButton label="View History" onPress={() => navigation.navigate('History')} variant="secondary" />
            <AppButton label="Go Home" onPress={() => navigation.navigate('Home')} variant="tertiary" />
          </>
        )}
      </ScrollView>
    </ScreenBackground>
  );
};
