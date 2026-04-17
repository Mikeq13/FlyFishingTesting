import React from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { useAppStore } from './store';
import { ScreenBackground } from '@/components/ScreenBackground';
import { catchRate } from '@/utils/calculations';
import { getExperimentEntries } from '@/utils/experimentEntries';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { AppButton } from '@/components/ui/AppButton';
import { StatusBanner } from '@/components/ui/StatusBanner';

export const SessionDetailScreen = ({ route, navigation }: any) => {
  const { sessions, experiments, users, activeUserId, archiveExperiment, deleteExperiment } = useAppStore();
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
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
        <ScreenHeader
          title="Session Detail"
          subtitle="Review the full session, then decide whether to keep testing or move into insights."
          eyebrow={`Angler: ${activeUser?.name ?? 'Loading...'}`}
        />
        {session ? (
          <SectionCard title="Session Summary" subtitle={new Date(session.date).toLocaleString()} tone="light">
            {session.riverName ? <Text style={{ color: '#334e68' }}>River: {session.riverName}</Text> : null}
            <Text style={{ color: '#334e68' }}>Water: {session.waterType}</Text>
            <Text style={{ color: '#334e68' }}>Depth: {session.depthRange}</Text>
            {session.hypothesis ? <Text style={{ color: '#334e68' }}>Session hypothesis: {session.hypothesis}</Text> : null}
            <Text style={{ color: '#334e68' }}>Catch rate: {(catchRate(totalCatches, totalCasts) * 100).toFixed(1)}%</Text>
          </SectionCard>
        ) : (
          <StatusBanner tone="error" text="Session not found." />
        )}

        <SectionCard title={`Experiments In This Session: ${sessionExperiments.length}`} subtitle="Review each experiment cleanly before editing, archiving, or deleting." tone="light">
        {sessionExperiments.map((e) => (
          <View key={e.id} style={{ backgroundColor: '#e9f5fb', borderRadius: 12, padding: 14, gap: 4 }}>
            <Text style={{ fontWeight: '800', color: '#102a43' }}>#{e.id} Status: {e.status === 'draft' ? 'Draft' : 'Complete'}</Text>
            <Text style={{ color: '#334e68' }}>Outcome: {e.outcome}</Text>
            <Text style={{ color: '#334e68' }}>Winner: {e.winner}</Text>
            <Text style={{ color: '#334e68' }}>Hypothesis: {e.hypothesis}</Text>
            <Text style={{ color: '#334e68' }}>Control focus: {e.controlFocus}</Text>
            {getExperimentEntries(e).map((entry) => (
              <View key={`${e.id}-${entry.slotId}`} style={{ gap: 2 }}>
                <Text style={{ color: '#334e68' }}>
                  {entry.label} {entry.fly.name || 'Unnamed'} (#{entry.fly.hookSize}, {entry.fly.beadColor}, {entry.fly.beadSizeMm}): {entry.catches}/{entry.casts}
                </Text>
                {!!entry.fishSizesInches.length && (
                  <Text style={{ color: '#334e68' }}>
                    Fish log: {entry.fishSizesInches.map((size, fishIndex) => `${size}" ${entry.fishSpecies[fishIndex] ?? 'Trout'}`).join(', ')}
                  </Text>
                )}
              </View>
            ))}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
              <View style={{ flex: 1 }}>
                <AppButton label="Edit" onPress={() => navigation.navigate('Experiment', { sessionId, experimentId: e.id })} variant="secondary" />
              </View>
              {e.status !== 'draft' ? (
                <View style={{ flex: 1 }}>
                  <AppButton label="Archive" onPress={() => runSingleExperimentCleanup(e.id, 'archive')} variant="neutral" />
                </View>
              ) : null}
              <View style={{ flex: 1 }}>
                <AppButton label={e.status === 'draft' ? 'Delete Draft' : 'Delete'} onPress={() => runSingleExperimentCleanup(e.id, 'delete')} variant="danger" />
              </View>
            </View>
          </View>
        ))}
        </SectionCard>

        <AppButton label="Add Another Experiment" onPress={() => navigation.navigate('Experiment', { sessionId })} />
        <AppButton label="View Insights" onPress={() => navigation.navigate('Insights')} variant="secondary" />
        <AppButton label="Back Home" onPress={() => navigation.navigate('Home')} variant="tertiary" />
      </ScrollView>
    </ScreenBackground>
  );
};
