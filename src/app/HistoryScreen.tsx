import React, { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
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

export const HistoryScreen = () => {
  const { width } = useWindowDimensions();
  const { sessions, experiments, users, activeUserId, archiveInconclusiveExperiments } = useAppStore();
  const activeUser = users.find((user) => user.id === activeUserId);
  const [riverFilter, setRiverFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [waterFilter, setWaterFilter] = useState('');
  const [depthFilter, setDepthFilter] = useState('');
  const [archiveFrom, setArchiveFrom] = useState('');
  const [archiveTo, setArchiveTo] = useState('');
  const contentMaxWidth = Platform.OS === 'web' ? Math.min(width - 24, 980) : undefined;

  const normalizedFilters = {
    river: riverFilter.trim().toLowerCase(),
    month: monthFilter.trim().toLowerCase(),
    water: waterFilter.trim().toLowerCase(),
    depth: depthFilter.trim().toLowerCase()
  };

  const sessionMap = useMemo(() => new Map(sessions.map((session) => [session.id, session])), [sessions]);

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

  const inconclusiveCount = useMemo(
    () =>
      experiments.filter((experiment) => {
        if (experiment.outcome !== 'inconclusive') return false;
        const session = sessionMap.get(experiment.sessionId);
        if (!session) return false;
        return isWithinDateRange(session.date, { from: archiveFrom || undefined, to: archiveTo || undefined });
      }).length,
    [archiveFrom, archiveTo, experiments, sessionMap]
  );

  const runArchive = () => {
    Alert.alert(
      'Archive inconclusive experiments',
      `Hide ${inconclusiveCount} inconclusive experiment${inconclusiveCount === 1 ? '' : 's'} from history and insights?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: async () => {
            const count = await archiveInconclusiveExperiments({ from: archiveFrom || undefined, to: archiveTo || undefined });
            Alert.alert('Cleanup complete', `${count} inconclusive experiment${count === 1 ? '' : 's'} archived.`);
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
          <TextInput value={riverFilter} onChangeText={setRiverFilter} placeholder="Filter river" placeholderTextColor="#5a6c78" style={inputStyle} />
          <TextInput value={monthFilter} onChangeText={setMonthFilter} placeholder="Filter month" placeholderTextColor="#5a6c78" style={inputStyle} />
          <TextInput value={waterFilter} onChangeText={setWaterFilter} placeholder="Filter water type" placeholderTextColor="#5a6c78" style={inputStyle} />
          <TextInput value={depthFilter} onChangeText={setDepthFilter} placeholder="Filter depth" placeholderTextColor="#5a6c78" style={inputStyle} />
        </View>

        <View style={{ borderWidth: 1, borderColor: 'rgba(202,240,248,0.18)', borderRadius: 18, padding: 14, gap: 8, backgroundColor: 'rgba(245,252,255,0.96)' }}>
          <Text style={{ fontWeight: '800', fontSize: 16, color: '#102a43' }}>Cleanup Inconclusive Results</Text>
          <TextInput value={archiveFrom} onChangeText={setArchiveFrom} placeholder="From date (YYYY-MM-DD)" placeholderTextColor="#5a6c78" style={inputStyle} />
          <TextInput value={archiveTo} onChangeText={setArchiveTo} placeholder="To date (YYYY-MM-DD)" placeholderTextColor="#5a6c78" style={inputStyle} />
          <Text style={{ color: '#334e68' }}>Matching inconclusive experiments: {inconclusiveCount}</Text>
          <Pressable
            onPress={runArchive}
            disabled={!inconclusiveCount}
            style={{ backgroundColor: inconclusiveCount ? '#8d0801' : '#adb5bd', borderRadius: 12, padding: 12 }}
          >
            <Text style={{ color: 'white', fontWeight: '700', textAlign: 'center' }}>Archive Inconclusive Experiments</Text>
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
                      <Text style={{ color: '#334e68' }}>Outcome: {experiment.outcome}</Text>
                      <Text style={{ color: '#334e68' }}>Winner: {experiment.winner}</Text>
                      <Text style={{ color: '#334e68' }}>Flies: {entries.map((entry) => `${entry.fly.name || entry.label} (#${entry.fly.hookSize})`).join(', ')}</Text>
                      <Text style={{ color: '#334e68' }}>Catch rate: {experimentRate.toFixed(1)}%</Text>
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
