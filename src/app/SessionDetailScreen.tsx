import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useAppStore } from './store';
import { ScreenBackground } from '@/components/ScreenBackground';
import { catchRate } from '@/utils/calculations';
import { getExperimentEntries } from '@/utils/experimentEntries';

export const SessionDetailScreen = ({ route, navigation }: any) => {
  const { sessions, experiments, users, activeUserId } = useAppStore();
  const sessionId = route?.params?.sessionId as number;
  const activeUser = users.find((user) => user.id === activeUserId);

  const session = sessions.find((s) => s.id === sessionId);
  const sessionExperiments = experiments.filter((e) => e.sessionId === sessionId);

  const totalCasts = sessionExperiments.reduce(
    (sum, experiment) => sum + getExperimentEntries(experiment).reduce((entrySum, entry) => entrySum + entry.casts, 0),
    0
  );
  const totalCatches = sessionExperiments.reduce(
    (sum, experiment) => sum + getExperimentEntries(experiment).reduce((entrySum, entry) => entrySum + entry.catches, 0),
    0
  );

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 28, color: '#f7fdff', fontWeight: '800' }}>Session Detail</Text>
          <Text style={{ color: '#d7f3ff', lineHeight: 20 }}>Review the full session, then decide whether to keep testing or move into insights.</Text>
          <Text style={{ color: '#dbf5ff', fontWeight: '700' }}>Angler: {activeUser?.name ?? 'Loading...'}</Text>
        </View>
        {session ? (
          <View style={{ backgroundColor: 'rgba(245,252,255,0.96)', borderRadius: 18, padding: 14, gap: 6, borderWidth: 1, borderColor: 'rgba(202,240,248,0.18)' }}>
            <Text style={{ color: '#102a43', fontWeight: '800', fontSize: 16 }}>Date: {new Date(session.date).toLocaleString()}</Text>
            {session.riverName ? <Text style={{ color: '#334e68' }}>River: {session.riverName}</Text> : null}
            <Text style={{ color: '#334e68' }}>Water: {session.waterType}</Text>
            <Text style={{ color: '#334e68' }}>Depth: {session.depthRange}</Text>
            <Text style={{ color: '#334e68' }}>Catch rate: {(catchRate(totalCatches, totalCasts) * 100).toFixed(1)}%</Text>
          </View>
        ) : (
          <Text style={{ color: '#f7fdff' }}>Session not found.</Text>
        )}

        <Text style={{ color: '#f7fdff', fontWeight: '700', fontSize: 16 }}>Experiments in this session: {sessionExperiments.length}</Text>
        {sessionExperiments.map((e) => (
          <View key={e.id} style={{ backgroundColor: 'rgba(245,252,255,0.96)', borderRadius: 18, padding: 14, gap: 4, borderWidth: 1, borderColor: 'rgba(202,240,248,0.18)' }}>
            <Text style={{ fontWeight: '800', color: '#102a43' }}>#{e.id} Outcome: {e.outcome}</Text>
            <Text style={{ color: '#334e68' }}>Winner: {e.winner}</Text>
            <Text style={{ color: '#334e68' }}>Hypothesis: {e.hypothesis}</Text>
            {getExperimentEntries(e).map((entry) => (
              <Text key={`${e.id}-${entry.slotId}`} style={{ color: '#334e68' }}>
                {entry.label} {entry.fly.name || 'Unnamed'} (#{entry.fly.hookSize}): {entry.catches}/{entry.casts}
              </Text>
            ))}
          </View>
        ))}

        <Pressable onPress={() => navigation.navigate('Experiment', { sessionId })} style={{ backgroundColor: '#2a9d8f', borderRadius: 14, padding: 14 }}>
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Add Another Experiment</Text>
        </Pressable>
        <Pressable onPress={() => navigation.navigate('Insights')} style={{ backgroundColor: '#1d3557', borderRadius: 14, padding: 14 }}>
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>View Insights</Text>
        </Pressable>
        <Pressable onPress={() => navigation.navigate('Home')} style={{ backgroundColor: '#264653', borderRadius: 14, padding: 14 }}>
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Back Home</Text>
        </Pressable>
      </ScrollView>
    </ScreenBackground>
  );
};
