import React, { useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { useAppStore } from './store';

export const HistoryScreen = () => {
  const { sessions, experiments } = useAppStore();
  const [riverFilter, setRiverFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [waterFilter, setWaterFilter] = useState('');
  const [insectFilter, setInsectFilter] = useState('');
  const [depthFilter, setDepthFilter] = useState('');

  const normalizedFilters = {
    river: riverFilter.trim().toLowerCase(),
    month: monthFilter.trim().toLowerCase(),
    water: waterFilter.trim().toLowerCase(),
    insect: insectFilter.trim().toLowerCase(),
    depth: depthFilter.trim().toLowerCase()
  };

  const filteredSessions = useMemo(
    () =>
      sessions.filter((s) => {
        const river = s.riverName?.toLowerCase() ?? '';
        const month = new Date(s.date).toLocaleString('en-US', { month: 'long' }).toLowerCase();
        const water = s.waterType.toLowerCase();
        const insect = s.insectType.toLowerCase();
        const depth = s.depthRange.toLowerCase();

        return (
          (!normalizedFilters.river || river.includes(normalizedFilters.river)) &&
          (!normalizedFilters.month || month.includes(normalizedFilters.month)) &&
          (!normalizedFilters.water || water.includes(normalizedFilters.water)) &&
          (!normalizedFilters.insect || insect.includes(normalizedFilters.insect)) &&
          (!normalizedFilters.depth || depth.includes(normalizedFilters.depth))
        );
      }),
    [sessions, normalizedFilters.river, normalizedFilters.month, normalizedFilters.water, normalizedFilters.insect, normalizedFilters.depth]
  );

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
      <Text style={{ fontSize: 20, fontWeight: '700' }}>History</Text>
      <TextInput value={riverFilter} onChangeText={setRiverFilter} placeholder="filter river" style={{ borderWidth: 1, padding: 8, borderRadius: 8 }} />
      <TextInput value={monthFilter} onChangeText={setMonthFilter} placeholder="filter month" style={{ borderWidth: 1, padding: 8, borderRadius: 8 }} />
      <TextInput value={waterFilter} onChangeText={setWaterFilter} placeholder="filter water type" style={{ borderWidth: 1, padding: 8, borderRadius: 8 }} />
      <TextInput value={insectFilter} onChangeText={setInsectFilter} placeholder="filter insect type" style={{ borderWidth: 1, padding: 8, borderRadius: 8 }} />
      <TextInput value={depthFilter} onChangeText={setDepthFilter} placeholder="filter depth" style={{ borderWidth: 1, padding: 8, borderRadius: 8 }} />

      {!filteredSessions.length ? <Text>No sessions found for current filters.</Text> : null}

      {filteredSessions.map((s) => {
        const sessionExperiments = experiments.filter((e) => e.sessionId === s.id);
        const totalCasts = sessionExperiments.reduce((sum, e) => sum + e.controlCasts + e.variantCasts, 0);
        const totalCatches = sessionExperiments.reduce((sum, e) => sum + e.controlCatches + e.variantCatches, 0);
        const rate = totalCasts ? totalCatches / totalCasts : 0;

        return (
          <View key={s.id} style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, gap: 6 }}>
            <Text style={{ fontWeight: '700' }}>{new Date(s.date).toLocaleString()}</Text>
            <Text>Month: {new Date(s.date).toLocaleString('en-US', { month: 'long' })}</Text>
            {s.riverName ? <Text>River: {s.riverName}</Text> : null}
            <Text>Water: {s.waterType}</Text>
            <Text>Depth: {s.depthRange}</Text>
            <Text>Session catch rate: {(rate * 100).toFixed(1)}%</Text>
            <Text>Experiments logged: {sessionExperiments.length}</Text>

            {!!sessionExperiments.length && (
              <View style={{ marginTop: 4, gap: 4 }}>
                <Text style={{ fontWeight: '600' }}>Experiment history</Text>
                {sessionExperiments.map((experiment) => {
                  const experimentCasts = experiment.controlCasts + experiment.variantCasts;
                  const experimentCatches = experiment.controlCatches + experiment.variantCatches;
                  const experimentRate = experimentCasts ? (experimentCatches / experimentCasts) * 100 : 0;

                  return (
                    <View key={experiment.id} style={{ backgroundColor: '#f5f5f5', borderRadius: 8, padding: 8 }}>
                      <Text>Hypothesis: {experiment.hypothesis}</Text>
                      <Text>Winner: {experiment.winner}</Text>
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
  );
};
