import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useAppStore } from './store';
import { ScreenBackground } from '@/components/ScreenBackground';
import { catchRate } from '@/utils/calculations';

export const SessionDetailScreen = ({ route, navigation }: any) => {
  const { sessions, experiments, users, activeUserId } = useAppStore();
  const sessionId = route?.params?.sessionId as number;
  const activeUser = users.find((user) => user.id === activeUserId);

  const session = sessions.find((s) => s.id === sessionId);
  const sessionExperiments = experiments.filter((e) => e.sessionId === sessionId);

  const totalCasts = sessionExperiments.reduce((sum, e) => sum + e.controlCasts + e.variantCasts, 0);
  const totalCatches = sessionExperiments.reduce((sum, e) => sum + e.controlCatches + e.variantCatches, 0);

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
        <Text style={{ fontSize: 24, color: 'white', fontWeight: '700' }}>Session Continuity</Text>
        <Text style={{ color: '#dbf5ff', fontWeight: '700' }}>Angler: {activeUser?.name ?? 'Loading...'}</Text>
        {session ? (
          <View style={{ backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 10, padding: 12, gap: 4 }}>
            <Text>Date: {new Date(session.date).toLocaleString()}</Text>
            {session.riverName ? <Text>River: {session.riverName}</Text> : null}
            <Text>Water: {session.waterType}</Text>
            <Text>Depth: {session.depthRange}</Text>
            <Text>Catch rate: {(catchRate(totalCatches, totalCasts) * 100).toFixed(1)}%</Text>
          </View>
        ) : (
          <Text style={{ color: 'white' }}>Session not found.</Text>
        )}

        <Text style={{ color: 'white', fontWeight: '700' }}>Experiments in this session: {sessionExperiments.length}</Text>
        {sessionExperiments.map((e) => (
          <View key={e.id} style={{ backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 10, padding: 12 }}>
            <Text style={{ fontWeight: '700' }}>#{e.id} Outcome: {e.outcome}</Text>
            <Text>Winner: {e.winner}</Text>
            <Text>Hypothesis: {e.hypothesis}</Text>
            <Text>Control {e.controlFly.name || 'Unnamed'}: {e.controlCatches}/{e.controlCasts}</Text>
            <Text>Variant {e.variantFly.name || 'Unnamed'}: {e.variantCatches}/{e.variantCasts}</Text>
          </View>
        ))}

        <Pressable onPress={() => navigation.navigate('Experiment', { sessionId })} style={{ backgroundColor: '#2a9d8f', borderRadius: 8, padding: 12 }}>
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Add Another Experiment</Text>
        </Pressable>
        <Pressable onPress={() => navigation.navigate('Insights')} style={{ backgroundColor: '#1d3557', borderRadius: 8, padding: 12 }}>
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>View Insights</Text>
        </Pressable>
        <Pressable onPress={() => navigation.navigate('Home')} style={{ backgroundColor: '#264653', borderRadius: 8, padding: 12 }}>
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Back Home</Text>
        </Pressable>
      </ScrollView>
    </ScreenBackground>
  );
};
