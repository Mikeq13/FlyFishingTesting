import React, { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { OptionChips } from '@/components/OptionChips';
import { DEPTH_RANGES, MONTHS, WATER_TYPES } from '@/constants/options';
import { useAppStore } from './store';
import { isWithinDateRange } from '@/utils/dateRange';
import { getExperimentEntries } from '@/utils/experimentEntries';
import { ScreenBackground } from '@/components/ScreenBackground';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { AppButton } from '@/components/ui/AppButton';
import { StatusBanner } from '@/components/ui/StatusBanner';
import { appTheme } from '@/design/theme';

const inputStyle = {
  borderWidth: 1,
  borderColor: appTheme.colors.borderStrong,
  padding: 12,
  borderRadius: appTheme.radius.md,
  backgroundColor: appTheme.colors.inputBg,
  color: appTheme.colors.textDark
};

export const HistoryScreen = ({ navigation }: any) => {
  const { width } = useWindowDimensions();
  const { sessions, experiments, users, activeUserId, archiveExperiment, deleteExperiment, cleanupExperimentsForCurrentUser } = useAppStore();
  const activeUser = users.find((user) => user.id === activeUserId);
  const [riverFilter, setRiverFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [waterFilter, setWaterFilter] = useState('');
  const [depthFilter, setDepthFilter] = useState('');
  const [showRiverChoices, setShowRiverChoices] = useState(false);
  const [cleanupFrom, setCleanupFrom] = useState('');
  const [cleanupTo, setCleanupTo] = useState('');
  const [cleanupOutcome, setCleanupOutcome] = useState<'all' | 'decisive' | 'tie' | 'inconclusive'>('inconclusive');
  const [cleanupAction, setCleanupAction] = useState<'archive' | 'delete'>('archive');
  const contentMaxWidth = Platform.OS === 'web' ? Math.min(width - 24, 980) : undefined;

  const normalizedFilters = {
    river: riverFilter.trim().toLowerCase(),
    month: monthFilter.trim().toLowerCase(),
    water: waterFilter.trim().toLowerCase(),
    depth: depthFilter.trim().toLowerCase()
  };

  const sessionMap = useMemo(() => new Map(sessions.map((session) => [session.id, session])), [sessions]);
  const riverOptions = useMemo(
    () =>
      [...new Set(sessions.map((session) => session.riverName?.trim()).filter((river): river is string => !!river))]
        .sort((left, right) => left.localeCompare(right)),
    [sessions]
  );

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
    [sessions, normalizedFilters.river, normalizedFilters.month, normalizedFilters.water, normalizedFilters.depth]
  );

  const cleanupCount = useMemo(
    () =>
      experiments.filter((experiment) => {
        const session = sessionMap.get(experiment.sessionId);
        if (!session) return false;
        if (cleanupOutcome !== 'all' && experiment.outcome !== cleanupOutcome) return false;
        return isWithinDateRange(session.date, { from: cleanupFrom || undefined, to: cleanupTo || undefined });
      }).length,
    [cleanupFrom, cleanupOutcome, cleanupTo, experiments, sessionMap]
  );

  const runCleanup = () => {
    Alert.alert(
      cleanupAction === 'archive' ? 'Archive filtered experiments' : 'Delete filtered experiments',
      `${cleanupAction === 'archive' ? 'Hide' : 'Delete'} ${cleanupCount} ${cleanupOutcome === 'all' ? '' : cleanupOutcome + ' '}experiment${cleanupCount === 1 ? '' : 's'} for this angler?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: cleanupAction === 'archive' ? 'Archive' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            const count = await cleanupExperimentsForCurrentUser({
              from: cleanupFrom || undefined,
              to: cleanupTo || undefined,
              outcome: cleanupOutcome,
              action: cleanupAction
            });
            Alert.alert('Cleanup complete', `${count} experiment${count === 1 ? '' : 's'} ${cleanupAction === 'archive' ? 'archived' : 'deleted'}.`);
          }
        }
      ]
    );
  };

  const runSingleExperimentCleanup = (experimentId: number, action: 'archive' | 'delete') => {
    Alert.alert(
      action === 'archive' ? 'Archive this experiment?' : 'Delete this experiment?',
      action === 'archive'
        ? 'This experiment will be hidden from normal history and insights.'
        : 'This experiment will be permanently removed from this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action === 'archive' ? 'Archive' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (action === 'archive') {
              await archiveExperiment(experimentId);
            } else {
              await deleteExperiment(experimentId);
            }
            Alert.alert('Cleanup complete', `Experiment ${action === 'archive' ? 'archived' : 'deleted'}.`);
          }
        }
      ]
    );
  };

  return (
    <ScreenBackground>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 8, width: '100%', alignSelf: 'center', maxWidth: contentMaxWidth }}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader
          title="History"
          subtitle="Filter past sessions, review experiment history, and clean up old noise when needed."
          eyebrow={`Angler: ${activeUser?.name ?? 'Loading...'}`}
        />
        <SectionCard title="Filters" subtitle="Tighten the session list without burying the important controls.">
          {!!riverOptions.length && (
            <>
              <AppButton label={showRiverChoices ? 'Hide Rivers' : 'Choose River'} onPress={() => setShowRiverChoices((current) => !current)} variant="secondary" />
              {showRiverChoices && (
                <ScrollView style={{ maxHeight: 180, borderWidth: 1, borderColor: appTheme.colors.borderStrong, borderRadius: appTheme.radius.md, backgroundColor: appTheme.colors.surfaceLight }}>
                  <Pressable onPress={() => { setRiverFilter(''); setShowRiverChoices(false); }} style={{ paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#d8e2eb' }}>
                    <Text style={{ color: appTheme.colors.textDark, fontWeight: '700' }}>All rivers</Text>
                  </Pressable>
                  {riverOptions.map((river) => (
                    <Pressable
                      key={river}
                      onPress={() => {
                        setRiverFilter(river);
                        setShowRiverChoices(false);
                      }}
                      style={{ paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#d8e2eb' }}
                    >
                      <Text style={{ color: appTheme.colors.textDark, fontWeight: '600' }}>{river}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            </>
          )}
          <OptionChips label="Month" options={MONTHS} value={monthFilter || null} onChange={setMonthFilter} />
          <AppButton label="Clear Month Filter" onPress={() => setMonthFilter('')} variant="ghost" />
          <OptionChips label="Water Type" options={WATER_TYPES} value={waterFilter || null} onChange={setWaterFilter} />
          <AppButton label="Clear Water Filter" onPress={() => setWaterFilter('')} variant="ghost" />
          <OptionChips label="Depth Range" options={DEPTH_RANGES} value={depthFilter || null} onChange={setDepthFilter} />
          <AppButton label="Clear Depth Filter" onPress={() => setDepthFilter('')} variant="ghost" />
        </SectionCard>

        <SectionCard title="Cleanup Experiments" subtitle="Archive or delete old results without making the rest of history harder to scan." tone="light">
          <TextInput value={cleanupFrom} onChangeText={setCleanupFrom} placeholder="From date (YYYY-MM-DD)" placeholderTextColor="#5a6c78" style={inputStyle} />
          <TextInput value={cleanupTo} onChangeText={setCleanupTo} placeholder="To date (YYYY-MM-DD)" placeholderTextColor="#5a6c78" style={inputStyle} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {(['inconclusive', 'tie', 'decisive', 'all'] as const).map((outcome) => (
              <Pressable
                key={outcome}
                onPress={() => setCleanupOutcome(outcome)}
                style={{ backgroundColor: cleanupOutcome === outcome ? '#1d3557' : 'rgba(29,53,87,0.12)', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12 }}
              >
                <Text style={{ color: cleanupOutcome === outcome ? 'white' : '#102a43', fontWeight: '700', textTransform: 'capitalize' }}>{outcome}</Text>
              </Pressable>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['archive', 'delete'] as const).map((action) => (
              <Pressable
                key={action}
                onPress={() => setCleanupAction(action)}
                style={{ backgroundColor: cleanupAction === action ? '#8d0801' : 'rgba(141,8,1,0.12)', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, flex: 1 }}
              >
                <Text style={{ color: cleanupAction === action ? 'white' : '#8d0801', fontWeight: '700', textAlign: 'center', textTransform: 'capitalize' }}>{action}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={{ color: '#334e68' }}>Matching experiments: {cleanupCount}</Text>
          <AppButton label={cleanupAction === 'archive' ? 'Archive Filtered Experiments' : 'Delete Filtered Experiments'} onPress={runCleanup} disabled={!cleanupCount} variant="danger" />
        </SectionCard>

      {!filteredSessions.length ? <StatusBanner tone="info" text="No sessions found for the current filters." /> : null}

      {filteredSessions.map((session) => {
        const sessionExperiments = experiments.filter((experiment) => experiment.sessionId === session.id);
        const totalCasts = sessionExperiments.reduce(
          (sum, experiment) => sum + getExperimentEntries(experiment).reduce((entrySum, entry) => entrySum + entry.casts, 0),
          0
        );
        const totalCatches = sessionExperiments.reduce(
          (sum, experiment) => sum + getExperimentEntries(experiment).reduce((entrySum, entry) => entrySum + entry.catches, 0),
          0
        );
        const rate = totalCasts ? totalCatches / totalCasts : 0;

        return (
          <SectionCard key={session.id} title={new Date(session.date).toLocaleString()} subtitle={`${session.waterType} water • ${session.depthRange}`} tone="light">
            <Text style={{ color: '#334e68' }}>Month: {new Date(session.date).toLocaleString('en-US', { month: 'long' })}</Text>
            {session.riverName ? <Text style={{ color: '#334e68' }}>River: {session.riverName}</Text> : null}
            {session.hypothesis ? <Text style={{ color: '#334e68' }}>Session hypothesis: {session.hypothesis}</Text> : null}
            <Text style={{ color: '#334e68' }}>Session catch rate: {(rate * 100).toFixed(1)}%</Text>
            <Text style={{ color: '#334e68' }}>Experiments logged: {sessionExperiments.length}</Text>

            {!!sessionExperiments.length && (
              <View style={{ marginTop: 4, gap: 4 }}>
                <Text style={{ fontWeight: '700', color: '#102a43' }}>Experiment history</Text>
                {sessionExperiments.map((experiment) => {
                  const entries = getExperimentEntries(experiment);
                  const experimentCasts = entries.reduce((sum, entry) => sum + entry.casts, 0);
                  const experimentCatches = entries.reduce((sum, entry) => sum + entry.catches, 0);
                  const experimentRate = experimentCasts ? (experimentCatches / experimentCasts) * 100 : 0;

                  return (
                    <View key={experiment.id} style={{ backgroundColor: '#e9f5fb', borderRadius: appTheme.radius.md, padding: 10, gap: 4 }}>
                      <Text style={{ color: '#102a43' }}>Hypothesis: {experiment.hypothesis}</Text>
                      <Text style={{ color: '#334e68' }}>Control focus: {experiment.controlFocus}</Text>
                      <Text style={{ color: '#334e68' }}>
                        Status: {experiment.status === 'draft' ? 'Incomplete Entry' : 'Complete'}
                      </Text>
                      <Text style={{ color: '#334e68' }}>Outcome: {experiment.outcome}</Text>
                      <Text style={{ color: '#334e68' }}>Winner: {experiment.winner}</Text>
                      <Text style={{ color: '#334e68' }}>Flies: {entries.map((entry) => `${entry.fly.name || entry.label} (#${entry.fly.hookSize}, ${entry.fly.beadColor}, ${entry.fly.beadSizeMm})`).join(', ')}</Text>
                      <Text style={{ color: '#334e68' }}>Catch rate: {experimentRate.toFixed(1)}%</Text>
                      {entries.some((entry) => entry.fishSizesInches.length) ? (
                        <Text style={{ color: '#334e68' }}>
                          Fish log: {entries
                            .flatMap((entry) =>
                              entry.fishSizesInches.map(
                                (size, fishIndex) => `${size}" ${entry.fishSpecies[fishIndex] ?? 'Trout'}`
                              )
                            )
                            .join(', ')}
                        </Text>
                      ) : null}
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                        <View style={{ flex: 1 }}>
                          <AppButton label="Edit" onPress={() => navigation.navigate('Experiment', { sessionId: session.id, experimentId: experiment.id })} variant="secondary" />
                        </View>
                        {experiment.status !== 'draft' ? (
                          <View style={{ flex: 1 }}>
                            <AppButton label="Archive" onPress={() => runSingleExperimentCleanup(experiment.id, 'archive')} variant="neutral" />
                          </View>
                        ) : null}
                        <View style={{ flex: 1 }}>
                          <AppButton label={experiment.status === 'draft' ? 'Delete Incomplete' : 'Delete'} onPress={() => runSingleExperimentCleanup(experiment.id, 'delete')} variant="danger" />
                        </View>
                      </View>
                      {experiment.status === 'draft' ? (
                        <Text style={{ color: '#6b7280', marginTop: 6 }}>
                          Incomplete entries can be edited if you remember the missing details, or removed if they are no longer useful.
                        </Text>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            )}
          </SectionCard>
        );
      })}
      </ScrollView>
    </ScreenBackground>
  );
};
