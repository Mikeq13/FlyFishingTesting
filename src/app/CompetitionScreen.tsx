import React, { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { ScreenBackground } from '@/components/ScreenBackground';
import { OptionChips } from '@/components/OptionChips';
import { useAppStore } from './store';
import { useSessionTimer } from '@/hooks/useSessionTimer';
import { TroutSpecies } from '@/types/experiment';
import { buildSessionUpdatePayload, getCompetitionMinimumLength, getSessionPlannedDurationMinutes, sumCatchLengths } from '@/utils/sessionState';
import { useSessionAlerts } from '@/hooks/useSessionAlerts';

const TROUT_SPECIES: TroutSpecies[] = ['Brook', 'Brown', 'Cutthroat', 'Rainbow', 'Tiger', 'Whitefish'];

export const CompetitionScreen = ({ route }: any) => {
  const sessionId = route?.params?.sessionId as number;
  const { sessions, allSessions, catchEvents, allCatchEvents, users, competitionAssignments, addCatchEvent, updateSessionEntry, upsertCompetitionAssignment } = useAppStore();
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
  const competitionSummaryRows = useMemo(() => {
    if (!session?.competitionId || !session.competitionAssignedGroup || !session.competitionSessionNumber) return [];
    const relevantAssignments = competitionAssignments.filter(
      (assignment) =>
        assignment.competitionId === session.competitionId &&
        assignment.assignedGroup.toLowerCase() === session.competitionAssignedGroup?.toLowerCase() &&
        assignment.sessionNumber === session.competitionSessionNumber
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
          if (session.competitionId && session.competitionSessionNumber) {
            await upsertCompetitionAssignment({
              competitionId: session.competitionId,
              assignedGroup: session.competitionAssignedGroup ?? 'Open Group',
              sessionNumber: session.competitionSessionNumber,
              beat: session.competitionBeat ?? 'Open Beat',
              role: session.competitionRole ?? 'fishing',
              startAt: session.startAt ?? session.date,
              endAt: session.endAt ?? endedAt,
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
        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 28, fontWeight: '800', color: '#f7fdff' }}>Competition Session</Text>
          <Text style={{ color: '#d7f3ff', lineHeight: 20 }}>
            Track every fish quickly with exact times, species, and score-ready totals for post-session review and tie-break scenarios.
          </Text>
          {session.competitionAssignedGroup ? <Text style={{ color: '#dbf5ff', fontWeight: '700' }}>Assigned group: {session.competitionAssignedGroup}</Text> : null}
          {session.competitionBeat ? <Text style={{ color: '#dbf5ff', fontWeight: '700' }}>Beat: {session.competitionBeat}</Text> : null}
          {session.competitionSessionNumber ? <Text style={{ color: '#dbf5ff', fontWeight: '700' }}>Session #{session.competitionSessionNumber}</Text> : null}
          <Text style={{ color: '#d7f3ff' }}>Role: {session.competitionRole ?? 'fishing'}</Text>
        </View>

        {timer.activeAlertMinute ? (
          <View style={{ backgroundColor: 'rgba(252,211,77,0.22)', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(252,211,77,0.4)' }}>
            <Text style={{ color: '#fff7d6', fontWeight: '800' }}>
              Time marker: {timer.activeAlertMinute} minutes into your competition session.
            </Text>
          </View>
        ) : null}

        <View style={{ backgroundColor: 'rgba(6, 27, 44, 0.72)', borderRadius: 18, padding: 14, gap: 8, borderWidth: 1, borderColor: 'rgba(202,240,248,0.16)' }}>
          <Text style={{ color: '#f7fdff', fontWeight: '800', fontSize: 18 }}>Session Timer</Text>
          <Text style={{ color: '#d7f3ff' }}>Elapsed: {timer.elapsedLabel}</Text>
          {timer.remainingLabel ? <Text style={{ color: '#d7f3ff' }}>Remaining: {timer.remainingLabel}</Text> : null}
          {timer.hasEnded ? <Text style={{ color: '#fca5a5', fontWeight: '700' }}>Session ended early.</Text> : null}
          {!timer.hasEnded && timer.nextAlertMinute ? <Text style={{ color: '#d7f3ff' }}>Next alert: {timer.nextAlertMinute} min</Text> : null}
          {!timer.hasEnded ? (
            <Pressable onPress={endSessionEarly} style={{ backgroundColor: 'rgba(145, 48, 48, 0.95)', padding: 12, borderRadius: 12 }}>
              <Text style={{ color: '#fff8f8', textAlign: 'center', fontWeight: '700' }}>End Session Early</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={{ backgroundColor: 'rgba(245,252,255,0.96)', borderRadius: 18, padding: 14, gap: 8 }}>
          <Text style={{ color: '#102a43', fontWeight: '800', fontSize: 18 }}>Scorecard</Text>
          <Text style={{ color: '#334e68' }}>Total fish: {competitionCatches.length}</Text>
          {competitionRequiresMeasurement ? (
            <Text style={{ color: '#334e68' }}>
              Total length: {Math.round(totalLengthDisplay)} {competitionLengthUnit}
            </Text>
          ) : (
            <Text style={{ color: '#334e68' }}>This session is counting fish only. No length entry required.</Text>
          )}
          <Pressable disabled={timer.hasEnded || session.competitionRole === 'controlling'} onPress={() => setShowCatchModal(true)} style={{ backgroundColor: timer.hasEnded || session.competitionRole === 'controlling' ? '#5b7282' : '#264653', padding: 12, borderRadius: 12 }}>
            <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>{session.competitionRole === 'controlling' ? 'Controlling This Session' : 'Log Competition Fish'}</Text>
          </Pressable>
        </View>

        {isCompetitionSummaryReady ? (
          <View style={{ backgroundColor: 'rgba(245,252,255,0.96)', borderRadius: 18, padding: 14, gap: 8 }}>
            <Text style={{ color: '#102a43', fontWeight: '800', fontSize: 18 }}>Group Session Summary</Text>
            {competitionSummaryRows.map((row) => (
              <Text key={row.assignment.id} style={{ color: '#334e68' }}>
                {row.name}: {row.status === 'controlling' ? 'controlling' : `${row.fishCount} fish`}
                {session.competitionRequiresMeasurement && row.status !== 'controlling' ? ` | ${Math.round(row.totalLength)} ${competitionLengthUnit}` : ''}
                {row.status === 'still active' ? ' | still active' : ''}
              </Text>
            ))}
          </View>
        ) : null}

        <View style={{ backgroundColor: 'rgba(245,252,255,0.96)', borderRadius: 18, padding: 14, gap: 8 }}>
          <Text style={{ color: '#102a43', fontWeight: '800', fontSize: 18 }}>Catch Times</Text>
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
        </View>
      </ScrollView>

      <Modal visible={showCatchModal} transparent animationType="fade" onRequestClose={() => setShowCatchModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(4,18,29,0.76)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: 'rgba(8,28,41,0.96)', borderRadius: 22, padding: 18, gap: 12 }}>
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
                  style={{ borderWidth: 1, borderColor: 'rgba(202,240,248,0.18)', padding: 12, borderRadius: 12, backgroundColor: 'rgba(245,252,255,0.96)', color: '#102a43' }}
                />
              </>
            ) : (
              <Text style={{ color: '#d7f3ff' }}>
                This session is fish-count only. Save each catch with species and timestamp.
              </Text>
            )}
            <Pressable
              onPress={logCompetitionCatch}
              style={{
                backgroundColor:
                  !competitionRequiresMeasurement || (Number.isFinite(Number(lengthValue)) && Number(lengthValue) >= (competitionLengthUnit === 'cm' ? 20 : 200))
                    ? '#2a9d8f'
                    : '#5b7282',
                padding: 12,
                borderRadius: 12
              }}
            >
              <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Save Fish</Text>
            </Pressable>
            <Pressable onPress={() => setShowCatchModal(false)} style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: 12, borderRadius: 12 }}>
              <Text style={{ color: '#f7fdff', textAlign: 'center', fontWeight: '700' }}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScreenBackground>
  );
};
