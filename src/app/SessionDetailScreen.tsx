import React from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { useAppStore } from './store';
import { ScreenBackground } from '@/components/ScreenBackground';
import { catchRate } from '@/utils/calculations';
import { getExperimentEntries } from '@/utils/experimentEntries';
import { deriveExperimentStatus } from '@/engine/experimentStatus';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { AppButton } from '@/components/ui/AppButton';
import { StatusBanner } from '@/components/ui/StatusBanner';
import { InlineSummaryRow } from '@/components/ui/InlineSummaryRow';
import { useTheme } from '@/design/theme';
import { useResponsiveLayout } from '@/design/layout';

export const SessionDetailScreen = ({ route, navigation }: any) => {
  const { theme } = useTheme();
  const layout = useResponsiveLayout();
  const isDaylightTheme = theme.id === 'daylight_light';
  const elevatedTextColor = isDaylightTheme ? theme.colors.textDark : theme.colors.text;
  const elevatedSoftTextColor = isDaylightTheme ? theme.colors.textDarkSoft : theme.colors.textSoft;
  const elevatedNestedSurface = isDaylightTheme ? theme.colors.nestedSurface : theme.colors.surface;
  const elevatedNestedBorder = isDaylightTheme ? theme.colors.nestedSurfaceBorder : theme.colors.borderStrong;
  const { sessions, experiments, users, activeUserId, archiveExperiment, deleteExperiment, cleanupSyncStatus, getSyncRecordState, getExperimentIntegrity, getSessionIntegrity } = useAppStore();
  const sessionId = route?.params?.sessionId as number;
  const activeUser = users.find((user) => user.id === activeUserId);

  const session = sessions.find((s) => s.id === sessionId);
  const sessionExperiments = experiments.filter((e) => e.sessionId === sessionId);
  const sessionIntegrity = session ? getSessionIntegrity(session.id) : null;

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
            try {
              if (action === 'archive') {
                await archiveExperiment(experimentId);
              } else {
                await deleteExperiment(experimentId);
              }
              Alert.alert('Cleanup complete', `Experiment ${action === 'archive' ? 'archived' : 'deleted'}.`);
            } catch (error) {
              Alert.alert('Cleanup failed', error instanceof Error ? error.message : 'Please try again.');
            }
          }
        }
      ]
    );
  };

  return (
    <ScreenBackground>
      <ScrollView style={{ flex: 1, minHeight: 0 }} contentContainerStyle={layout.buildScrollContentStyle({ gap: 10 })}>
        <ScreenHeader
          title="Session Detail"
          subtitle="Review the full session, then decide whether to keep testing or move into insights."
          eyebrow={`Angler: ${activeUser?.name ?? 'Loading...'}`}
        />
        {session ? (
          <SectionCard title="Session Summary" subtitle={new Date(session.date).toLocaleString()} tone="light">
            {session.riverName ? <InlineSummaryRow label="River" value={session.riverName} tone="light" /> : null}
            <InlineSummaryRow label="Water" value={session.waterType} tone="light" />
            <InlineSummaryRow label="Depth" value={session.depthRange} tone="light" />
            {session.hypothesis ? <InlineSummaryRow label="Hypothesis" value={session.hypothesis} tone="light" /> : null}
            {sessionIntegrity ? <InlineSummaryRow label="Status" value={sessionIntegrity.label} tone="light" /> : null}
            <InlineSummaryRow label="Catch Rate" value={`${(catchRate(totalCatches, totalCasts) * 100).toFixed(1)}%`} tone="light" />
            {sessionIntegrity?.reason ? <Text style={{ color: elevatedSoftTextColor }}>{sessionIntegrity.reason}</Text> : null}
            {sessionIntegrity && sessionIntegrity.state !== 'valid' ? (
              <AppButton
                label="Resume Session"
                onPress={() => {
                  if (__DEV__) {
                    console.info('[problem-records] resume tapped from session detail', { sessionId: session.id });
                  }
                  navigation.navigate('Session', { sessionId: session.id, resumeSource: 'detail' });
                }}
                variant="secondary"
                surfaceTone="light"
              />
            ) : null}
          </SectionCard>
        ) : null}
        {!session ? (
          <StatusBanner tone="error" text="Session not found." />
        ) : null}

        <SectionCard title={`Experiments In This Session: ${sessionExperiments.length}`} subtitle="Review each experiment cleanly before editing, archiving, or deleting." tone="light">
        {cleanupSyncStatus.pendingDeleteCount ? (
          <StatusBanner tone="info" text={`${cleanupSyncStatus.pendingDeleteCount} cleanup action${cleanupSyncStatus.pendingDeleteCount === 1 ? ' is' : 's are'} still syncing.`} />
        ) : null}
        {cleanupSyncStatus.failedDeleteCount ? (
          <StatusBanner tone="warning" text={`${cleanupSyncStatus.failedDeleteCount} cleanup action${cleanupSyncStatus.failedDeleteCount === 1 ? ' needs' : 's need'} another retry. ${cleanupSyncStatus.lastFailedDeleteMessage ?? ''}`.trim()} />
        ) : null}
        {sessionExperiments.map((e) => {
          const cleanupState = getSyncRecordState('experiment', e.id);
          const isCleanupPending = cleanupState === 'pending_delete';
          const isCleanupFailed = cleanupState === 'failed_cleanup';
          const integrity = getExperimentIntegrity(e.id);
          const comparisonStatus = deriveExperimentStatus(getExperimentEntries(e));
          return (
          <View
            key={e.id}
            style={{
              backgroundColor: elevatedNestedSurface,
              borderRadius: theme.radius.md,
              padding: 14,
              gap: 4,
              borderWidth: 1,
              borderColor: elevatedNestedBorder
            }}
          >
            <Text style={{ fontWeight: '800', color: elevatedTextColor }}>#{e.id} Status: {integrity.label}</Text>
            {isCleanupPending ? <InlineSummaryRow label="Cleanup" value="Pending delete" tone="light" /> : null}
            {isCleanupFailed ? <InlineSummaryRow label="Cleanup" value="Delete needs retry" tone="light" /> : null}
            {integrity.reason ? <Text style={{ color: elevatedSoftTextColor }}>{integrity.reason}</Text> : null}
            <InlineSummaryRow label="Outcome" value={comparisonStatus.outcome} tone="light" />
            <InlineSummaryRow label="Winner" value={comparisonStatus.winner} tone="light" />
            <InlineSummaryRow label="Experiment Water" value={e.waterType ?? session?.waterType ?? 'Not set'} tone="light" />
            <InlineSummaryRow label="Technique" value={e.technique ?? session?.startingTechnique ?? 'Not set'} tone="light" />
            <InlineSummaryRow label="Hypothesis" value={e.hypothesis} tone="light" />
            <InlineSummaryRow label="Control Focus" value={e.controlFocus} tone="light" />
            <Text style={{ color: elevatedSoftTextColor }}>{comparisonStatus.comparison.summary}</Text>
            {getExperimentEntries(e).map((entry) => (
              <View key={`${e.id}-${entry.slotId}`} style={{ gap: 2 }}>
                <Text style={{ color: elevatedSoftTextColor }}>
                  {entry.label} {entry.fly.name || 'Unnamed'} (#{entry.fly.hookSize}, {entry.fly.beadColor}, {entry.fly.beadSizeMm}): {entry.catches}/{entry.casts}
                </Text>
                {!!entry.fishSizesInches.length && (
                  <Text style={{ color: elevatedSoftTextColor }}>
                    Fish log: {entry.fishSizesInches.map((size, fishIndex) => `${size}" ${entry.fishSpecies[fishIndex] ?? 'Trout'}`).join(', ')}
                  </Text>
                )}
              </View>
            ))}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
              <View style={{ flex: 1 }}>
                <AppButton label="Edit" onPress={() => navigation.navigate('Experiment', { sessionId, experimentId: e.id })} variant="secondary" disabled={isCleanupPending} surfaceTone="light" />
              </View>
              {e.status !== 'draft' ? (
                <View style={{ flex: 1 }}>
                  <AppButton label={isCleanupPending ? 'Archiving...' : 'Archive'} onPress={() => runSingleExperimentCleanup(e.id, 'archive')} variant="neutral" disabled={isCleanupPending} surfaceTone="light" />
                </View>
              ) : null}
              <View style={{ flex: 1 }}>
                <AppButton label={isCleanupPending ? 'Deleting...' : isCleanupFailed ? 'Retry Delete' : e.status === 'draft' ? 'Delete Draft' : 'Delete'} onPress={() => runSingleExperimentCleanup(e.id, 'delete')} variant="danger" disabled={isCleanupPending} surfaceTone="light" />
              </View>
            </View>
          </View>
          );
        })}
        </SectionCard>

        {session?.mode === 'practice' ? (
          <AppButton label="Review Practice Session" onPress={() => navigation.navigate('PracticeReview', { sessionId })} variant="secondary" />
        ) : null}
        <AppButton label="Add Another Experiment" onPress={() => navigation.navigate('Experiment', { sessionId })} />
        <AppButton label="View Insights" onPress={() => navigation.navigate('Insights')} variant="secondary" />
        <AppButton label="Back Home" onPress={() => navigation.navigate('Home')} variant="tertiary" />
      </ScrollView>
    </ScreenBackground>
  );
};
