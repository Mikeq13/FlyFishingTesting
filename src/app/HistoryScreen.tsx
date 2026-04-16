import React, { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { OptionChips } from '@/components/OptionChips';
import { DEPTH_RANGES, MONTHS, WATER_TYPES } from '@/constants/options';
import { useAppStore } from './store';
import { isWithinDateRange } from '@/utils/dateRange';
import { getExperimentEntries } from '@/utils/experimentEntries';
import { ScreenBackground } from '@/components/ScreenBackground';

const inputStyle = {
  borderWidth: 1,
  borderColor: 'rgba(202,240,248,0.18)',
  padding: 12,
  borderRadius: 12,
  backgroundColor: 'rgba(245,252,255,0.96)',
  color: '#102a43'
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
        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 28, fontWeight: '800', color: '#f7fdff' }}>History</Text>
          <Text style={{ color: '#d7f3ff', lineHeight: 20 }}>Filter past sessions, review experiments, and clean up inconclusive results when needed.</Text>
          <Text style={{ fontWeight: '700', color: '#dbf5ff' }}>Angler: {activeUser?.name ?? 'Loading...'}</Text>
        </View>
        <View style={{ gap: 8, backgroundColor: 'rgba(6, 27, 44, 0.70)', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: 'rgba(202,240,248,0.16)' }}>
          {!!riverOptions.length && (
            <>
              <Pressable onPress={() => setShowRiverChoices((current) => !current)} style={{ backgroundColor: '#1d3557', padding: 12, borderRadius: 12 }}>
                <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>
                  {showRiverChoices ? 'Hide Rivers' : 'Choose River'}
                </Text>
              </Pressable>
              {showRiverChoices && (
                <ScrollView style={{ maxHeight: 180, borderWidth: 1, borderColor: 'rgba(202,240,248,0.18)', borderRadius: 12, backgroundColor: 'rgba(245,252,255,0.96)' }}>
                  <Pressable onPress={() => { setRiverFilter(''); setShowRiverChoices(false); }} style={{ paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#d8e2eb' }}>
                    <Text style={{ color: '#0b3d3a', fontWeight: '700' }}>All rivers</Text>
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
                      <Text style={{ color: '#0b3d3a', fontWeight: '600' }}>{river}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            </>
          )}
          <OptionChips label="Month" options={MONTHS} value={monthFilter || null} onChange={setMonthFilter} />
          <Pressable onPress={() => setMonthFilter('')} style={{ backgroundColor: 'rgba(255,255,255,0.12)', padding: 10, borderRadius: 12 }}>
            <Text style={{ color: '#f7fdff', textAlign: 'center', fontWeight: '700' }}>Clear Month Filter</Text>
          </Pressable>
          <OptionChips label="Water Type" options={WATER_TYPES} value={waterFilter || null} onChange={setWaterFilter} />
          <Pressable onPress={() => setWaterFilter('')} style={{ backgroundColor: 'rgba(255,255,255,0.12)', padding: 10, borderRadius: 12 }}>
            <Text style={{ color: '#f7fdff', textAlign: 'center', fontWeight: '700' }}>Clear Water Filter</Text>
          </Pressable>
          <OptionChips label="Depth Range" options={DEPTH_RANGES} value={depthFilter || null} onChange={setDepthFilter} />
          <Pressable onPress={() => setDepthFilter('')} style={{ backgroundColor: 'rgba(255,255,255,0.12)', padding: 10, borderRadius: 12 }}>
            <Text style={{ color: '#f7fdff', textAlign: 'center', fontWeight: '700' }}>Clear Depth Filter</Text>
          </Pressable>
        </View>

        <View style={{ borderWidth: 1, borderColor: 'rgba(202,240,248,0.18)', borderRadius: 18, padding: 14, gap: 8, backgroundColor: 'rgba(245,252,255,0.96)' }}>
          <Text style={{ fontWeight: '800', fontSize: 16, color: '#102a43' }}>Cleanup Experiments</Text>
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
          <Pressable
            onPress={runCleanup}
            disabled={!cleanupCount}
            style={{ backgroundColor: cleanupCount ? '#8d0801' : '#adb5bd', borderRadius: 12, padding: 12 }}
          >
            <Text style={{ color: 'white', fontWeight: '700', textAlign: 'center' }}>
              {cleanupAction === 'archive' ? 'Archive Filtered Experiments' : 'Delete Filtered Experiments'}
            </Text>
          </Pressable>
        </View>

      {!filteredSessions.length ? <Text style={{ color: '#f7fdff' }}>No sessions found for current filters.</Text> : null}

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
          <View key={session.id} style={{ borderWidth: 1, borderColor: 'rgba(202,240,248,0.18)', borderRadius: 18, padding: 14, gap: 6, backgroundColor: 'rgba(245,252,255,0.96)' }}>
            <Text style={{ fontWeight: '800', fontSize: 16, color: '#102a43' }}>{new Date(session.date).toLocaleString()}</Text>
            <Text style={{ color: '#334e68' }}>Month: {new Date(session.date).toLocaleString('en-US', { month: 'long' })}</Text>
            {session.riverName ? <Text style={{ color: '#334e68' }}>River: {session.riverName}</Text> : null}
            <Text style={{ color: '#334e68' }}>Water: {session.waterType}</Text>
            <Text style={{ color: '#334e68' }}>Depth: {session.depthRange}</Text>
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
                    <View key={experiment.id} style={{ backgroundColor: '#e9f5fb', borderRadius: 12, padding: 10 }}>
                      <Text style={{ color: '#102a43' }}>Hypothesis: {experiment.hypothesis}</Text>
                      <Text style={{ color: '#334e68' }}>Control focus: {experiment.controlFocus}</Text>
                      <Text style={{ color: '#334e68' }}>Status: {experiment.status === 'draft' ? 'Draft' : 'Complete'}</Text>
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
                        <Pressable
                          onPress={() => navigation.navigate('Experiment', { sessionId: session.id, experimentId: experiment.id })}
                          style={{ backgroundColor: '#1d3557', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10, flex: 1 }}
                        >
                          <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Edit</Text>
                        </Pressable>
                        {experiment.status !== 'draft' ? (
                          <Pressable
                            onPress={() => runSingleExperimentCleanup(experiment.id, 'archive')}
                            style={{ backgroundColor: '#6c584c', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10, flex: 1 }}
                          >
                            <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Archive</Text>
                          </Pressable>
                        ) : null}
                        <Pressable
                          onPress={() => runSingleExperimentCleanup(experiment.id, 'delete')}
                          style={{ backgroundColor: '#8d0801', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10, flex: 1 }}
                        >
                          <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>
                            {experiment.status === 'draft' ? 'Delete Draft' : 'Delete'}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        );
      })}
      </ScrollView>
    </ScreenBackground>
  );
};
