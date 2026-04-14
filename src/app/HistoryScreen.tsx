import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useAppStore } from './store';
import { isWithinDateRange } from '@/utils/dateRange';
import { getExperimentEntries } from '@/utils/experimentEntries';
import { ScreenBackground } from '@/components/ScreenBackground';

const inputStyle = { borderWidth: 1, padding: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.95)' };

export const HistoryScreen = () => {
  const { sessions, experiments, users, activeUserId, archiveInconclusiveExperiments } = useAppStore();
  const activeUser = users.find((user) => user.id === activeUserId);
  const [riverFilter, setRiverFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [waterFilter, setWaterFilter] = useState('');
  const [depthFilter, setDepthFilter] = useState('');
  const [archiveFrom, setArchiveFrom] = useState('');
  const [archiveTo, setArchiveTo] = useState('');

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
      <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }} keyboardShouldPersistTaps="handled">
      <Text style={{ fontSize: 20, fontWeight: '700', color: 'white' }}>History</Text>
      <Text style={{ fontWeight: '700', color: '#dbf5ff' }}>Angler: {activeUser?.name ?? 'Loading...'}</Text>
      <TextInput value={riverFilter} onChangeText={setRiverFilter} placeholder="filter river" style={inputStyle} />
      <TextInput value={monthFilter} onChangeText={setMonthFilter} placeholder="filter month" style={inputStyle} />
      <TextInput value={waterFilter} onChangeText={setWaterFilter} placeholder="filter water type" style={inputStyle} />
      <TextInput value={depthFilter} onChangeText={setDepthFilter} placeholder="filter depth" style={inputStyle} />

      <View style={{ borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', borderRadius: 8, padding: 12, gap: 8, backgroundColor: 'rgba(255,255,255,0.92)' }}>
        <Text style={{ fontWeight: '700' }}>Cleanup Inconclusive Results</Text>
        <TextInput value={archiveFrom} onChangeText={setArchiveFrom} placeholder="from date (YYYY-MM-DD)" style={inputStyle} />
        <TextInput value={archiveTo} onChangeText={setArchiveTo} placeholder="to date (YYYY-MM-DD)" style={inputStyle} />
        <Text>Matching inconclusive experiments: {inconclusiveCount}</Text>
        <Pressable
          onPress={runArchive}
          disabled={!inconclusiveCount}
          style={{ backgroundColor: inconclusiveCount ? '#8d0801' : '#adb5bd', borderRadius: 8, padding: 10 }}
        >
          <Text style={{ color: 'white', fontWeight: '700', textAlign: 'center' }}>Archive Inconclusive Experiments</Text>
        </Pressable>
      </View>

      {!filteredSessions.length ? <Text style={{ color: 'white' }}>No sessions found for current filters.</Text> : null}

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
          <View key={session.id} style={{ borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', borderRadius: 8, padding: 12, gap: 6, backgroundColor: 'rgba(255,255,255,0.92)' }}>
            <Text style={{ fontWeight: '700' }}>{new Date(session.date).toLocaleString()}</Text>
            <Text>Month: {new Date(session.date).toLocaleString('en-US', { month: 'long' })}</Text>
            {session.riverName ? <Text>River: {session.riverName}</Text> : null}
            <Text>Water: {session.waterType}</Text>
            <Text>Depth: {session.depthRange}</Text>
            <Text>Session catch rate: {(rate * 100).toFixed(1)}%</Text>
            <Text>Experiments logged: {sessionExperiments.length}</Text>

            {!!sessionExperiments.length && (
              <View style={{ marginTop: 4, gap: 4 }}>
                <Text style={{ fontWeight: '600' }}>Experiment history</Text>
                {sessionExperiments.map((experiment) => {
                  const entries = getExperimentEntries(experiment);
                  const experimentCasts = entries.reduce((sum, entry) => sum + entry.casts, 0);
                  const experimentCatches = entries.reduce((sum, entry) => sum + entry.catches, 0);
                  const experimentRate = experimentCasts ? (experimentCatches / experimentCasts) * 100 : 0;

                  return (
                    <View key={experiment.id} style={{ backgroundColor: '#f5f5f5', borderRadius: 8, padding: 8 }}>
                      <Text>Hypothesis: {experiment.hypothesis}</Text>
                      <Text>Outcome: {experiment.outcome}</Text>
                      <Text>Winner: {experiment.winner}</Text>
                      <Text>Flies: {entries.map((entry) => `${entry.fly.name || entry.label} (#${entry.fly.hookSize})`).join(', ')}</Text>
                      <Text>Catch rate: {experimentRate.toFixed(1)}%</Text>
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
