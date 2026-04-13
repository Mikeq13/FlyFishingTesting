import React, { useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { useAppStore } from './store';

export const HistoryScreen = () => {
  const { sessions, experiments } = useAppStore();
  const [waterFilter, setWaterFilter] = useState('');
  const [insectFilter, setInsectFilter] = useState('');
  const [depthFilter, setDepthFilter] = useState('');

  const filtered = useMemo(
    () =>
      sessions.filter(
        (s) =>
          (!waterFilter || s.waterType.includes(waterFilter)) &&
          (!insectFilter || s.insectType.includes(insectFilter)) &&
          (!depthFilter || s.depthRange.includes(depthFilter))
      ),
    [sessions, waterFilter, insectFilter, depthFilter]
  );

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
      <Text style={{ fontSize: 20, fontWeight: '700' }}>History</Text>
      <TextInput value={waterFilter} onChangeText={setWaterFilter} placeholder="filter water type" style={{ borderWidth: 1, padding: 8, borderRadius: 8 }} />
      <TextInput value={insectFilter} onChangeText={setInsectFilter} placeholder="filter insect type" style={{ borderWidth: 1, padding: 8, borderRadius: 8 }} />
      <TextInput value={depthFilter} onChangeText={setDepthFilter} placeholder="filter depth" style={{ borderWidth: 1, padding: 8, borderRadius: 8 }} />

      {filtered.map((s) => {
        const sessionExperiments = experiments.filter((e) => e.sessionId === s.id);
        const totalCasts = sessionExperiments.reduce((sum, e) => sum + e.controlCasts + e.variantCasts, 0);
        const totalCatches = sessionExperiments.reduce((sum, e) => sum + e.controlCatches + e.variantCatches, 0);
        const rate = totalCasts ? totalCatches / totalCasts : 0;
        const best = sessionExperiments[0]?.winner ?? 'n/a';

        return (
          <View key={s.id} style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12 }}>
            <Text>{new Date(s.date).toLocaleString()}</Text>
            <Text>Water: {s.waterType}</Text>
            <Text>Catch rate: {(rate * 100).toFixed(1)}%</Text>
            <Text>Best experiment result: {best}</Text>
          </View>
        );
      })}
    </ScrollView>
  );
};
