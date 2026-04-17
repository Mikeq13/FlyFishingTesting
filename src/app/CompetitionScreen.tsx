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
import { appTheme } from '@/design/theme';

const TROUT_SPECIES: TroutSpecies[] = ['Brook', 'Brown', 'Cutthroat', 'Rainbow', 'Tiger', 'Whitefish'];

export const CompetitionScreen = ({ route }: any) => {
  const sessionId = route?.params?.sessionId as number;
  const { sessions, allSessions, catchEvents, allCatchEvents, users, competitionAssignments, competitionGroups, competitionSessions, addCatchEvent, updateSessionEntry, upsertCompetitionAssignment } = useAppStore();
  const session = sessions.find((candidate) => candidate.id === sessionId) ?? null;
  const [showCatchModal, setShowCatchModal] = useState(false);
  const [species, setSpecies] = useState<TroutSpecies>('Rainbow');
  const [lengthValue, setLengthValue] = useState('');
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

  if (!session) {
    return (
      <ScreenBackground>
        <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
          <Text style={{ color: '#f7fdff', textAlign: 'center' }}>Competition session not found.</Text>
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
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <ScreenHeader
          title="Competition Session"
          subtitle="Track every fish quickly with score-ready totals and a cleaner group summary view."
          eyebrow={`${currentCompetitionGroup ? `Group ${currentCompetitionGroup.label}` : 'Competition'}${session.competitionBeat ? ` • Beat ${session.competitionBeat}` : ''}${currentCompetitionSession ? ` • Session ${currentCompetitionSession.sessionNumber}` : ''}`}
        />
        <SectionCard title="Assignment" subtitle="Keep the critical comp details visible without crowding the screen.">
          {currentCompetitionGroup ? <Text style={{ color: appTheme.colors.textMuted, fontWeight: '700' }}>Assigned group: {currentCompetitionGroup.label}</Text> : null}
          {session.competitionBeat ? <Text style={{ color: appTheme.colors.textMuted, fontWeight: '700' }}>Beat: {session.competitionBeat}</Text> : null}
          {currentCompetitionSession ? <Text style={{ color: appTheme.colors.textMuted, fontWeight: '700' }}>Session #{currentCompetitionSession.sessionNumber}</Text> : null}
          <Text style={{ color: appTheme.colors.textSoft }}>Role: {session.competitionRole ?? 'fishing'}</Text>
        </SectionCard>

        {timer.activeAlertMinute ? (
          <StatusBanner tone="warning" text={`Time marker: ${timer.activeAlertMinute} minutes into your competition session.`} />
        ) : null}

        <SectionCard title="Session Timer" subtitle="Timing stays readable so you can fish or control without second-guessing the clock.">
          <Text style={{ color: '#d7f3ff' }}>Elapsed: {timer.elapsedLabel}</Text>
          {timer.remainingLabel ? <Text style={{ color: '#d7f3ff' }}>Remaining: {timer.remainingLabel}</Text> : null}
          {timer.hasEnded ? <StatusBanner tone="error" text="Session ended early." /> : null}
          {!timer.hasEnded && timer.nextAlertMinute ? <Text style={{ color: '#d7f3ff' }}>Next alert: {timer.nextAlertMinute} min</Text> : null}
          {!timer.hasEnded ? (
            <AppButton label="End Session Early" onPress={endSessionEarly} variant="danger" />
          ) : null}
        </SectionCard>

        <SectionCard title="Scorecard" subtitle="Keep fish count and official length totals easy to check at a glance." tone="light">
          <Text style={{ color: '#334e68' }}>Total fish: {competitionCatches.length}</Text>
          {competitionRequiresMeasurement ? (
            <Text style={{ color: '#334e68' }}>
              Total length: {Math.round(totalLengthDisplay)} {competitionLengthUnit}
            </Text>
          ) : (
            <Text style={{ color: '#334e68' }}>This session is counting fish only. No length entry required.</Text>
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
              <View key={row.assignment.id} style={{ backgroundColor: '#e9f5fb', borderRadius: appTheme.radius.md, padding: 12, gap: 4 }}>
                <Text style={{ color: appTheme.colors.textDark, fontWeight: '800' }}>{row.name}</Text>
                <Text style={{ color: '#334e68' }}>
                  {row.status === 'controlling' ? 'Controlling' : `${row.fishCount} fish`}
                  {session.competitionRequiresMeasurement && row.status !== 'controlling' ? ` | ${Math.round(row.totalLength)} ${competitionLengthUnit}` : ''}
                </Text>
                <Text style={{ color: '#486581', textTransform: 'capitalize' }}>{row.status}</Text>
              </View>
            ))}
          </SectionCard>
        ) : (
          <StatusBanner tone="info" text="Group summary will unlock once every angler in this comp group has finished or is controlling." />
        )}

        <SectionCard title="Catch Times" subtitle="Each logged fish stays easy to verify by time and measurement." tone="light">
          {!competitionCatches.length ? (
            <Text style={{ color: '#486581' }}>No competition fish logged yet.</Text>
          ) : (
            competitionCatches.map((event) => (
              <Text key={event.id} style={{ color: '#334e68' }}>
                {new Date(event.caughtAt).toLocaleTimeString()} - {event.species || 'Fish'}
                {event.lengthValue ? ` - ${event.lengthValue} ${event.lengthUnit}` : ''}
              </Text>
            ))
          )}
        </SectionCard>
      </ScrollView>

      <Modal visible={showCatchModal} transparent animationType="fade" onRequestClose={() => setShowCatchModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(4,18,29,0.76)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: 'rgba(8,28,41,0.96)', borderRadius: 22, padding: 18, gap: 12, borderWidth: 1, borderColor: appTheme.colors.border }}>
            <Text style={{ color: '#f7fdff', fontSize: 22, fontWeight: '800' }}>Log Competition Fish</Text>
            <OptionChips label="Species" options={TROUT_SPECIES} value={species} onChange={setSpecies} />
            {competitionRequiresMeasurement ? (
              <>
                <Text style={{ color: '#d7f3ff' }}>
                  Measurement unit stays on {competitionLengthUnit} for this session.
                  {competitionLengthUnit === 'cm' ? ' Minimum fish size is 20 cm.' : ' Minimum measurable fish size is 200 mm.'}
                </Text>
                <TextInput
                  value={lengthValue}
                  onChangeText={setLengthValue}
                  keyboardType="number-pad"
                  placeholder={`Length in ${competitionLengthUnit}`}
                  placeholderTextColor="#5a6c78"
                  style={{ borderWidth: 1, borderColor: appTheme.colors.borderStrong, padding: 12, borderRadius: appTheme.radius.md, backgroundColor: appTheme.colors.inputBg, color: appTheme.colors.textDark }}
                />
              </>
            ) : (
              <Text style={{ color: '#d7f3ff' }}>
                This session is fish-count only. Save each catch with species and timestamp.
              </Text>
            )}
            <AppButton
              label="Save Fish"
              onPress={() => {
                logCompetitionCatch().catch(console.error);
              }}
              disabled={competitionRequiresMeasurement && !(Number.isFinite(Number(lengthValue)) && Number(lengthValue) >= (competitionLengthUnit === 'cm' ? 20 : 200))}
            />
            <AppButton label="Cancel" onPress={() => setShowCatchModal(false)} variant="ghost" />
          </View>
        </View>
      </Modal>
    </ScreenBackground>
  );
};
