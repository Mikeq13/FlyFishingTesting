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
import { InlineSummaryRow } from '@/components/ui/InlineSummaryRow';
import { appTheme, useTheme } from '@/design/theme';
import { useResponsiveLayout } from '@/design/layout';
import { getFormInputStyle } from '@/components/ui/FormField';

export const HistoryScreen = ({ navigation, route }: any) => {
  useTheme();
  const layout = useResponsiveLayout();
  const { sessions, experiments, catchEvents, sessionSegments, users, activeUserId, archiveExperiment, deleteExperiment, deleteSessionRecord, cleanupExperimentsForCurrentUser, cleanupSyncStatus, getSyncRecordState, getExperimentIntegrity, getSessionIntegrity } = useAppStore();
  const activeUser = users.find((user) => user.id === activeUserId);
  const initialModeFilter = route?.params?.modeFilter;
  const [riverFilter, setRiverFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [waterFilter, setWaterFilter] = useState('');
  const [depthFilter, setDepthFilter] = useState('');
  const [modeFilter, setModeFilter] = useState<'all' | 'competition'>(initialModeFilter === 'competition' ? 'competition' : 'all');
  const [showRiverChoices, setShowRiverChoices] = useState(false);
  const [cleanupFrom, setCleanupFrom] = useState('');
  const [cleanupTo, setCleanupTo] = useState('');
  const [cleanupOutcome, setCleanupOutcome] = useState<'all' | 'decisive' | 'tie' | 'inconclusive'>('inconclusive');
  const [cleanupAction, setCleanupAction] = useState<'archive' | 'delete'>('archive');
  const inputStyle = getFormInputStyle();

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
        if (getSessionIntegrity(session.id).state !== 'valid') return false;
        const river = session.riverName?.toLowerCase() ?? '';
        const month = new Date(session.date).toLocaleString('en-US', { month: 'long' }).toLowerCase();
        const water = session.waterType.toLowerCase();
        const depth = session.depthRange.toLowerCase();

        return (
          (modeFilter === 'all' || session.mode === modeFilter) &&
          (!normalizedFilters.river || river.includes(normalizedFilters.river)) &&
          (!normalizedFilters.month || month.includes(normalizedFilters.month)) &&
          (!normalizedFilters.water || water.includes(normalizedFilters.water)) &&
          (!normalizedFilters.depth || depth.includes(normalizedFilters.depth))
        );
      }),
    [getSessionIntegrity, modeFilter, sessions, normalizedFilters.river, normalizedFilters.month, normalizedFilters.water, normalizedFilters.depth]
  );
  const problemSessions = useMemo(
    () =>
      sessions.filter((session) => {
        const state = getSessionIntegrity(session.id).state;
        return state === 'legacy_unreviewed' || state === 'incomplete';
      }),
    [getSessionIntegrity, sessions]
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
  const orphanedExperiments = useMemo(
    () => experiments.filter((experiment) => getExperimentIntegrity(experiment.id).state === 'orphaned'),
    [experiments, getExperimentIntegrity]
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
            try {
              const count = await cleanupExperimentsForCurrentUser({
                from: cleanupFrom || undefined,
                to: cleanupTo || undefined,
                outcome: cleanupOutcome,
                action: cleanupAction
              });
              Alert.alert('Cleanup complete', `${count} experiment${count === 1 ? '' : 's'} ${cleanupAction === 'archive' ? 'archived' : 'deleted'}.`);
            } catch (error) {
              Alert.alert('Cleanup failed', error instanceof Error ? error.message : 'Please try again.');
            }
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

  const runProblemSessionCleanup = (sessionId: number) => {
    const linkedExperimentCount = experiments.filter((experiment) => experiment.sessionId === sessionId).length;
    const catchLogCount = catchEvents.filter((event) => event.sessionId === sessionId).length;
    const sessionSegmentCount = sessionSegments.filter((segment) => segment.sessionId === sessionId).length;
    const consequenceParts = [
      'this session',
      linkedExperimentCount ? `${linkedExperimentCount} linked experiment${linkedExperimentCount === 1 ? '' : 's'}` : null,
      catchLogCount ? `${catchLogCount} catch log${catchLogCount === 1 ? '' : 's'}` : null,
      sessionSegmentCount ? `${sessionSegmentCount} session segment${sessionSegmentCount === 1 ? '' : 's'}` : null
    ].filter((value): value is string => !!value);
    const deleteMessage =
      consequenceParts.length === 1
        ? 'This will permanently delete this session.'
        : `This will permanently delete ${consequenceParts.slice(0, -1).join(', ')}, and ${consequenceParts.at(-1)}.`;

    Alert.alert(
      'Delete this problem session?',
      deleteMessage,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Session',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSessionRecord(sessionId, { includeLinkedExperiments: true });
              Alert.alert('Cleanup complete', 'Session and related records deleted.');
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
      <ScrollView
        contentContainerStyle={layout.buildScrollContentStyle({ gap: 8, bottomPadding: 40 })}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader
          title={modeFilter === 'competition' ? 'Competition History' : 'History'}
          subtitle={modeFilter === 'competition' ? 'Review competition-only sessions, assignments, and experiment results without mixing in normal journal entries.' : 'Filter past sessions, review experiment history, and clean up old noise when needed.'}
          eyebrow={`Angler: ${activeUser?.name ?? 'Loading...'}`}
        />
        <SectionCard title="Filters" subtitle="Tighten the session list without burying the important controls.">
          <OptionChips label="Session Type" options={['all', 'competition'] as const} value={modeFilter} onChange={(value) => setModeFilter(value as 'all' | 'competition')} />
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
          {cleanupSyncStatus.pendingDeleteCount ? (
            <StatusBanner tone="info" text={`${cleanupSyncStatus.pendingDeleteCount} delete action${cleanupSyncStatus.pendingDeleteCount === 1 ? ' is' : 's are'} still syncing. Items stay hidden while cleanup finishes.`} />
          ) : null}
          {cleanupSyncStatus.failedDeleteCount ? (
            <StatusBanner tone="warning" text={`${cleanupSyncStatus.failedDeleteCount} cleanup action${cleanupSyncStatus.failedDeleteCount === 1 ? ' needs' : 's need'} another retry. ${cleanupSyncStatus.lastFailedDeleteMessage ?? ''}`.trim()} />
          ) : null}
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
          <Text style={{ color: appTheme.colors.textDarkSoft }}>Matching experiments: {cleanupCount}</Text>
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
            <InlineSummaryRow label="Month" value={new Date(session.date).toLocaleString('en-US', { month: 'long' })} tone="light" />
            {session.riverName ? <InlineSummaryRow label="River" value={session.riverName} tone="light" /> : null}
            {session.hypothesis ? <InlineSummaryRow label="Session Hypothesis" value={session.hypothesis} tone="light" /> : null}
            <InlineSummaryRow label="Session Catch Rate" value={`${(rate * 100).toFixed(1)}%`} tone="light" />
            <InlineSummaryRow label="Experiments Logged" value={`${sessionExperiments.length}`} tone="light" />

            {!!sessionExperiments.length && (
              <View style={{ marginTop: 4, gap: 4 }}>
                <Text style={{ fontWeight: '700', color: appTheme.colors.textDark }}>Experiment history</Text>
                {sessionExperiments.map((experiment) => {
                  const cleanupState = getSyncRecordState('experiment', experiment.id);
                  const isCleanupPending = cleanupState === 'pending_delete';
                  const isCleanupFailed = cleanupState === 'failed_cleanup';
                  const entries = getExperimentEntries(experiment);
                  const experimentCasts = entries.reduce((sum, entry) => sum + entry.casts, 0);
                  const experimentCatches = entries.reduce((sum, entry) => sum + entry.catches, 0);
                  const experimentRate = experimentCasts ? (experimentCatches / experimentCasts) * 100 : 0;

                  return (
                    <View
                      key={experiment.id}
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.72)',
                        borderRadius: appTheme.radius.md,
                        padding: 10,
                        gap: 4,
                        borderWidth: 1,
                        borderColor: 'rgba(16,42,67,0.08)'
                      }}
                    >
                      <InlineSummaryRow label="Hypothesis" value={experiment.hypothesis} tone="light" />
                      <InlineSummaryRow label="Control Focus" value={experiment.controlFocus} tone="light" />
                      <InlineSummaryRow label="Status" value={getExperimentIntegrity(experiment.id).label} tone="light" />
                      {isCleanupPending ? <InlineSummaryRow label="Cleanup" value="Pending delete" tone="light" /> : null}
                      {isCleanupFailed ? <InlineSummaryRow label="Cleanup" value="Delete needs retry" tone="light" /> : null}
                      <InlineSummaryRow label="Outcome" value={experiment.outcome} tone="light" />
                      <InlineSummaryRow label="Winner" value={experiment.winner} tone="light" />
                      <Text style={{ color: appTheme.colors.textDarkSoft }}>Flies: {entries.map((entry) => `${entry.fly.name || entry.label} (#${entry.fly.hookSize}, ${entry.fly.beadColor}, ${entry.fly.beadSizeMm})`).join(', ')}</Text>
                      <Text style={{ color: appTheme.colors.textDarkSoft }}>Catch rate: {experimentRate.toFixed(1)}%</Text>
                      {entries.some((entry) => entry.fishSizesInches.length) ? (
                        <Text style={{ color: appTheme.colors.textDarkSoft }}>
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
                          <AppButton label="Edit" onPress={() => navigation.navigate('Experiment', { sessionId: session.id, experimentId: experiment.id })} variant="secondary" disabled={isCleanupPending} />
                        </View>
                        {experiment.status !== 'draft' ? (
                          <View style={{ flex: 1 }}>
                            <AppButton label={isCleanupPending ? 'Archiving...' : 'Archive'} onPress={() => runSingleExperimentCleanup(experiment.id, 'archive')} variant="neutral" disabled={isCleanupPending} />
                          </View>
                        ) : null}
                        <View style={{ flex: 1 }}>
                          <AppButton label={isCleanupPending ? 'Deleting...' : isCleanupFailed ? 'Retry Delete' : experiment.status === 'draft' ? 'Delete Incomplete' : 'Delete'} onPress={() => runSingleExperimentCleanup(experiment.id, 'delete')} variant="danger" disabled={isCleanupPending} />
                        </View>
                      </View>
                      {experiment.status === 'draft' ? (
                        <Text style={{ color: appTheme.colors.textDarkSoft, marginTop: 6 }}>
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

      {!!orphanedExperiments.length && (
        <SectionCard
          title="Legacy Orphaned Experiments"
          subtitle="These older experiment records no longer have a valid session, but you can still clean them up."
          tone="light"
        >
          {orphanedExperiments.map((experiment) => {
            const cleanupState = getSyncRecordState('experiment', experiment.id);
            const isCleanupPending = cleanupState === 'pending_delete';
            const integrity = getExperimentIntegrity(experiment.id);
            const entries = getExperimentEntries(experiment);
            return (
              <View
                key={`orphan-${experiment.id}`}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.72)',
                  borderRadius: appTheme.radius.md,
                  padding: 10,
                  gap: 4,
                  borderWidth: 1,
                  borderColor: 'rgba(16,42,67,0.08)'
                }}
              >
                <InlineSummaryRow label="Hypothesis" value={experiment.hypothesis || 'No saved hypothesis'} tone="light" />
                <InlineSummaryRow label="Status" value={integrity.label} tone="light" />
                {integrity.reason ? <Text style={{ color: appTheme.colors.textDarkSoft }}>{integrity.reason}</Text> : null}
                <Text style={{ color: appTheme.colors.textDarkSoft }}>
                  Flies: {entries.map((entry) => entry.fly.name || entry.label).join(', ')}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                  <View style={{ flex: 1 }}>
                    <AppButton
                      label="Edit"
                      onPress={() => navigation.navigate('Experiment', { sessionId: experiment.sessionId, experimentId: experiment.id })}
                      variant="secondary"
                      disabled={isCleanupPending}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppButton
                      label={isCleanupPending ? 'Deleting...' : 'Delete Legacy Record'}
                      onPress={() => runSingleExperimentCleanup(experiment.id, 'delete')}
                      variant="danger"
                      disabled={isCleanupPending}
                    />
                  </View>
                </View>
              </View>
            );
          })}
        </SectionCard>
      )}
      {!!problemSessions.length && (
        <SectionCard
          title="Incomplete Or Problem Sessions"
          subtitle="These sessions are excluded from trusted analytics, but you can still review or remove them here."
          tone="light"
        >
          {problemSessions.map((session) => (
            <View
              key={`problem-session-${session.id}`}
              style={{
                backgroundColor: 'rgba(255,255,255,0.72)',
                borderRadius: appTheme.radius.md,
                padding: 10,
                gap: 4,
                borderWidth: 1,
                borderColor: 'rgba(16,42,67,0.08)'
              }}
            >
              <InlineSummaryRow label="Session" value={new Date(session.date).toLocaleString()} tone="light" />
              <InlineSummaryRow label="Status" value={getSessionIntegrity(session.id).label} tone="light" />
              {getSessionIntegrity(session.id).reason ? (
                <Text style={{ color: appTheme.colors.textDarkSoft }}>{getSessionIntegrity(session.id).reason}</Text>
              ) : null}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                <View style={{ flex: 1 }}>
                  <AppButton label="Resume Session" onPress={() => navigation.navigate('SessionDetail', { sessionId: session.id })} variant="secondary" />
                </View>
                <View style={{ flex: 1 }}>
                  <AppButton label="Delete Session" onPress={() => runProblemSessionCleanup(session.id)} variant="danger" />
                </View>
              </View>
            </View>
          ))}
        </SectionCard>
      )}
      </ScrollView>
    </ScreenBackground>
  );
};
