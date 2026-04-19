import React, { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { ScreenBackground } from '@/components/ScreenBackground';
import { OptionChips } from '@/components/OptionChips';
import { useAppStore } from './store';
import { useSessionTimer } from '@/hooks/useSessionTimer';
import { TroutSpecies } from '@/types/experiment';
import { buildSessionUpdatePayload, getCompetitionMinimumLength, getSessionPlannedDurationMinutes, sumCatchLengths } from '@/utils/sessionState';
import { useSessionAlerts } from '@/hooks/useSessionAlerts';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { StatusBanner } from '@/components/ui/StatusBanner';
import { AppButton } from '@/components/ui/AppButton';
import { ModalSurface } from '@/components/ui/ModalSurface';
import { FormField, getFormInputStyle } from '@/components/ui/FormField';
import { InlineSummaryRow } from '@/components/ui/InlineSummaryRow';
import { ActionGroup } from '@/components/ui/ActionGroup';
import { useTheme } from '@/design/theme';
import { useResponsiveLayout } from '@/design/layout';
import { formatSharedBackendError, getPendingSyncFeedback } from '@/utils/syncFeedback';

const TROUT_SPECIES: TroutSpecies[] = ['Brook', 'Brown', 'Cutthroat', 'Rainbow', 'Tiger', 'Whitefish'];

export const CompetitionScreen = ({ route }: any) => {
  const { theme } = useTheme();
  const layout = useResponsiveLayout();
  const sessionId = route?.params?.sessionId as number;
  const { sessions, allSessions, catchEvents, allCatchEvents, users, competitionAssignments, competitionGroups, competitionSessions, addCatchEvent, updateSessionEntry, upsertCompetitionAssignment, notificationPermissionStatus, remoteSession, syncStatus } = useAppStore();
  const session = sessions.find((candidate) => candidate.id === sessionId) ?? null;
  const [showCatchModal, setShowCatchModal] = useState(false);
  const [species, setSpecies] = useState<TroutSpecies>('Rainbow');
  const [lengthValue, setLengthValue] = useState('');
  const syncFeedback = remoteSession ? getPendingSyncFeedback(syncStatus, 'competition', 'competition') : null;
  const competitionCatches = useMemo(
    () => catchEvents.filter((event) => event.sessionId === sessionId),
    [catchEvents, sessionId]
  );
  const totalLengthDisplay = sumCatchLengths(competitionCatches);
  const competitionLengthUnit = session?.competitionLengthUnit ?? 'mm';
  const competitionRequiresMeasurement = session?.competitionRequiresMeasurement ?? true;
  const timer = useSessionTimer({
    startedAt: session?.startAt ?? session?.date ?? new Date().toISOString(),
    endedAt: session?.endedAt,
    plannedDurationMinutes: getSessionPlannedDurationMinutes(session),
    alertIntervalMinutes: session?.alertIntervalMinutes,
    alertMarkersMinutes: session?.alertMarkersMinutes
  });
  useSessionAlerts(session, timer.activeAlertMinute);
  const currentCompetitionGroup = useMemo(
    () => competitionGroups.find((group) => group.id === session?.competitionGroupId) ?? null,
    [competitionGroups, session?.competitionGroupId]
  );
  const currentCompetitionSession = useMemo(
    () => competitionSessions.find((entry) => entry.id === session?.competitionSessionId) ?? null,
    [competitionSessions, session?.competitionSessionId]
  );
  const competitionSummaryRows = useMemo(() => {
    if (!session?.competitionId || !session.competitionGroupId || !session.competitionSessionId) return [];
    const relevantAssignments = competitionAssignments.filter(
      (assignment) =>
        assignment.competitionId === session.competitionId &&
        assignment.competitionGroupId === session.competitionGroupId &&
        assignment.competitionSessionId === session.competitionSessionId
    );

    return relevantAssignments.map((assignment) => {
      const owner = users.find((user) => user.id === assignment.userId);
      const assignmentSession = allSessions.find((candidate) => candidate.id === assignment.sessionId);
      const assignmentCatches = allCatchEvents.filter((event) => event.sessionId === assignment.sessionId);
      return {
        assignment,
        name: owner?.name ?? `Angler ${assignment.userId}`,
        fishCount: assignment.role === 'controlling' ? 0 : assignmentCatches.length,
        totalLength: assignmentCatches.reduce((sum, event) => sum + (event.lengthValue ?? 0), 0),
        status:
          assignment.role === 'controlling'
            ? 'controlling'
            : assignmentSession?.endedAt || (assignmentSession?.endAt && new Date(assignmentSession.endAt).getTime() <= Date.now())
              ? 'finished'
              : 'still active'
      };
    });
  }, [allCatchEvents, allSessions, competitionAssignments, session, users]);
  const isCompetitionSummaryReady =
    !!competitionSummaryRows.length &&
    competitionSummaryRows.every((row) => row.status === 'finished' || row.status === 'controlling');
  const formInputStyle = getFormInputStyle(theme);

  if (!session) {
    return (
      <ScreenBackground>
        <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
          <Text style={{ color: theme.colors.text, textAlign: 'center' }}>Competition session not found.</Text>
        </View>
      </ScreenBackground>
    );
  }

  const logCompetitionCatch = async () => {
    if (session.competitionRole === 'controlling') {
      return;
    }
    const parsedLength = Number(lengthValue);
    const minimumLength = getCompetitionMinimumLength(competitionLengthUnit);

    if (competitionRequiresMeasurement && (!Number.isFinite(parsedLength) || parsedLength < minimumLength)) {
      return;
    }

    await addCatchEvent({
      sessionId: session.id,
      mode: 'competition',
      species,
      lengthValue: competitionRequiresMeasurement ? parsedLength : undefined,
      lengthUnit: competitionLengthUnit,
      caughtAt: new Date().toISOString()
    });
    setShowCatchModal(false);
    setLengthValue('');
  };

  const endSessionEarly = () => {
    if (!session || session.endedAt) return;

    Alert.alert('End Session Early?', 'This will stop the timer and cancel any remaining reminders for this competition session.', [
      { text: 'Keep Fishing', style: 'cancel' },
      {
        text: 'End Session',
        style: 'destructive',
        onPress: async () => {
          const endedAt = new Date().toISOString();
          await updateSessionEntry(session.id, buildSessionUpdatePayload(session, { endedAt }));
          if (session.competitionId && session.competitionGroupId && session.competitionSessionId) {
            await upsertCompetitionAssignment({
              competitionId: session.competitionId,
              competitionGroupId: session.competitionGroupId,
              competitionSessionId: session.competitionSessionId,
              beat: session.competitionBeat ?? 'Open Beat',
              role: session.competitionRole ?? 'fishing',
              sessionId: session.id
            });
          }
        }
      }
    ]);
  };

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={layout.buildScrollContentStyle({ gap: 12, bottomPadding: 40 })}>
        <ScreenHeader
          title="Competition Session"
          subtitle="Track every fish quickly with score-ready totals and a cleaner group summary view."
          eyebrow={`${currentCompetitionGroup ? `Group ${currentCompetitionGroup.label}` : 'Competition'}${session.competitionBeat ? ` • Beat ${session.competitionBeat}` : ''}${currentCompetitionSession ? ` • Session ${currentCompetitionSession.sessionNumber}` : ''}`}
        />
        {syncFeedback ? <StatusBanner tone={syncStatus.lastError ? 'warning' : 'info'} text={syncFeedback} /> : null}
        <SectionCard title="Assignment" subtitle="Keep the critical comp details visible without crowding the screen.">
          {currentCompetitionGroup ? <InlineSummaryRow label="Assigned Group" value={currentCompetitionGroup.label} /> : null}
          {session.competitionBeat ? <InlineSummaryRow label="Beat" value={session.competitionBeat} /> : null}
          {currentCompetitionSession ? <InlineSummaryRow label="Session" value={`${currentCompetitionSession.sessionNumber}`} /> : null}
          <InlineSummaryRow label="Role" value={session.competitionRole ?? 'fishing'} />
        </SectionCard>

        {timer.activeAlertMinute ? (
          <StatusBanner tone="warning" text={`Time marker: ${timer.activeAlertMinute} minutes into your competition session.`} />
        ) : null}
        {notificationPermissionStatus === 'denied' ? (
          <StatusBanner tone="info" text="Phone notifications are off on this device, so competition reminders will only appear while the app is open." />
        ) : null}

        <SectionCard title="Session Timer" subtitle="Timing stays readable so you can fish or control without second-guessing the clock.">
          <InlineSummaryRow label="Elapsed" value={timer.elapsedLabel} />
          {timer.remainingLabel ? <InlineSummaryRow label="Remaining" value={timer.remainingLabel} /> : null}
          {timer.hasEnded ? <StatusBanner tone="error" text="Session ended early." /> : null}
          {!timer.hasEnded && timer.nextAlertMinute ? <InlineSummaryRow label="Next Alert" value={`${timer.nextAlertMinute} min`} /> : null}
          {!timer.hasEnded ? (
            <AppButton label="End Session Early" onPress={endSessionEarly} variant="danger" />
          ) : null}
        </SectionCard>

        <SectionCard title="Scorecard" subtitle="Keep fish count and official length totals easy to check at a glance." tone="light">
          <InlineSummaryRow label="Total Fish" value={`${competitionCatches.length}`} tone="light" />
          {competitionRequiresMeasurement ? (
            <InlineSummaryRow label="Total Length" value={`${Math.round(totalLengthDisplay)} ${competitionLengthUnit}`} tone="light" />
          ) : (
            <Text style={{ color: theme.colors.textDarkSoft }}>This session is counting fish only. No length entry required.</Text>
          )}
          <AppButton
            label={session.competitionRole === 'controlling' ? 'Controlling This Session' : 'Log Competition Fish'}
            onPress={() => setShowCatchModal(true)}
            disabled={timer.hasEnded || session.competitionRole === 'controlling'}
            variant="tertiary"
          />
        </SectionCard>

        {isCompetitionSummaryReady ? (
          <SectionCard title="Group Session Summary" subtitle="Once everyone in the group is done or controlling, the summary becomes official." tone="light">
            {competitionSummaryRows.map((row) => (
                    <View
                      key={row.assignment.id}
                      style={{
                        backgroundColor: theme.colors.nestedSurface,
                        borderRadius: theme.radius.md,
                        padding: 12,
                        gap: 4,
                        borderWidth: 1,
                        borderColor: theme.colors.nestedSurfaceBorder
                      }}
                    >
                <Text style={{ color: theme.colors.textDark, fontWeight: '800' }}>{row.name}</Text>
                <InlineSummaryRow label="Result" value={row.status === 'controlling' ? 'Controlling' : `${row.fishCount} fish`} tone="light" />
                {session.competitionRequiresMeasurement && row.status !== 'controlling' ? (
                  <InlineSummaryRow label="Measured Length" value={`${Math.round(row.totalLength)} ${competitionLengthUnit}`} tone="light" />
                ) : null}
                <InlineSummaryRow label="Status" value={row.status} tone="light" />
              </View>
            ))}
          </SectionCard>
        ) : (
          <StatusBanner tone="info" text="Group summary will unlock once every angler in this comp group has finished or is controlling." />
        )}

        <SectionCard title="Catch Times" subtitle="Each logged fish stays easy to verify by time and measurement." tone="light">
          {!competitionCatches.length ? (
            <Text style={{ color: theme.colors.textDarkSoft }}>No competition fish logged yet.</Text>
          ) : (
            competitionCatches.map((event) => (
              <Text key={event.id} style={{ color: theme.colors.textDarkSoft }}>
                {new Date(event.caughtAt).toLocaleTimeString()} - {event.species || 'Fish'}
                {event.lengthValue ? ` - ${event.lengthValue} ${event.lengthUnit}` : ''}
              </Text>
            ))
          )}
        </SectionCard>
      </ScrollView>

      <Modal visible={showCatchModal} transparent animationType="fade" onRequestClose={() => setShowCatchModal(false)}>
        <ModalSurface
          title="Log Competition Fish"
          subtitle="Keep the scoring flow quick and clear so the phone never gets in the way of the session."
        >
          <OptionChips label="Species" options={TROUT_SPECIES} value={species} onChange={setSpecies} />
          {competitionRequiresMeasurement ? (
            <>
              <StatusBanner
                tone="info"
                text={`Measurement unit stays on ${competitionLengthUnit} for this session.${competitionLengthUnit === 'cm' ? ' Minimum fish size is 20 cm.' : ' Minimum measurable fish size is 200 mm.'}`}
              />
              <FormField label={`Length (${competitionLengthUnit})`}>
                <TextInput
                  value={lengthValue}
                  onChangeText={setLengthValue}
                  keyboardType="number-pad"
                  placeholder={`Length in ${competitionLengthUnit}`}
                  placeholderTextColor={theme.colors.inputPlaceholder}
                  style={formInputStyle}
                />
              </FormField>
            </>
          ) : (
            <StatusBanner tone="info" text="This session is fish-count only. Save each catch with species and timestamp." />
          )}
          <ActionGroup direction="horizontal">
            <AppButton
              label="Save Fish"
              onPress={() => {
                logCompetitionCatch().catch((error) => {
                  Alert.alert('Unable to save fish', formatSharedBackendError(error, 'competition'));
                });
              }}
              disabled={competitionRequiresMeasurement && !(Number.isFinite(Number(lengthValue)) && Number(lengthValue) >= (competitionLengthUnit === 'cm' ? 20 : 200))}
            />
            <AppButton label="Cancel" onPress={() => setShowCatchModal(false)} variant="ghost" />
          </ActionGroup>
        </ModalSurface>
      </Modal>
    </ScreenBackground>
  );
};
