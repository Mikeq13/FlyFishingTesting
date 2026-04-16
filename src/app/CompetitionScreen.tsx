import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { ScreenBackground } from '@/components/ScreenBackground';
import { OptionChips } from '@/components/OptionChips';
import { useAppStore } from './store';
import { useSessionTimer } from '@/hooks/useSessionTimer';
import { TroutSpecies } from '@/types/experiment';

const TROUT_SPECIES: TroutSpecies[] = ['Brook', 'Brown', 'Cutthroat', 'Rainbow', 'Tiger', 'Whitefish'];

export const CompetitionScreen = ({ route }: any) => {
  const sessionId = route?.params?.sessionId as number;
  const { sessions, catchEvents, addCatchEvent } = useAppStore();
  const session = sessions.find((candidate) => candidate.id === sessionId) ?? null;
  const [showCatchModal, setShowCatchModal] = useState(false);
  const [species, setSpecies] = useState<TroutSpecies>('Rainbow');
  const [lengthMm, setLengthMm] = useState('');
  const competitionCatches = useMemo(
    () => catchEvents.filter((event) => event.sessionId === sessionId),
    [catchEvents, sessionId]
  );
  const totalLengthMm = competitionCatches.reduce((sum, event) => sum + (event.lengthUnit === 'mm' ? event.lengthValue ?? 0 : 0), 0);
  const timer = useSessionTimer({
    startedAt: session?.date ?? new Date().toISOString(),
    plannedDurationMinutes: session?.plannedDurationMinutes,
    alertIntervalMinutes: session?.alertIntervalMinutes
  });

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
    const parsedLength = Number(lengthMm);
    await addCatchEvent({
      sessionId: session.id,
      mode: 'competition',
      species,
      lengthValue: Number.isFinite(parsedLength) && parsedLength > 0 ? parsedLength : undefined,
      lengthUnit: 'mm',
      caughtAt: new Date().toISOString()
    });
    setShowCatchModal(false);
    setLengthMm('');
  };

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 28, fontWeight: '800', color: '#f7fdff' }}>Competition Session</Text>
          <Text style={{ color: '#d7f3ff', lineHeight: 20 }}>
            Track every fish quickly with exact times, species, and mm totals for post-session review and tie-break scenarios.
          </Text>
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
          {timer.nextAlertMinute ? <Text style={{ color: '#d7f3ff' }}>Next alert: {timer.nextAlertMinute} min</Text> : null}
        </View>

        <View style={{ backgroundColor: 'rgba(245,252,255,0.96)', borderRadius: 18, padding: 14, gap: 8 }}>
          <Text style={{ color: '#102a43', fontWeight: '800', fontSize: 18 }}>Scorecard</Text>
          <Text style={{ color: '#334e68' }}>Total fish: {competitionCatches.length}</Text>
          <Text style={{ color: '#334e68' }}>Total length: {Math.round(totalLengthMm)} mm</Text>
          <Pressable onPress={() => setShowCatchModal(true)} style={{ backgroundColor: '#264653', padding: 12, borderRadius: 12 }}>
            <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Log Competition Fish</Text>
          </Pressable>
        </View>

        <View style={{ backgroundColor: 'rgba(245,252,255,0.96)', borderRadius: 18, padding: 14, gap: 8 }}>
          <Text style={{ color: '#102a43', fontWeight: '800', fontSize: 18 }}>Catch Times</Text>
          {!competitionCatches.length ? (
            <Text style={{ color: '#486581' }}>No competition fish logged yet.</Text>
          ) : (
            competitionCatches.map((event) => (
              <Text key={event.id} style={{ color: '#334e68' }}>
                {new Date(event.caughtAt).toLocaleTimeString()} - {event.species || 'Fish'}{event.lengthValue ? ` - ${event.lengthValue} mm` : ''}
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
            <TextInput
              value={lengthMm}
              onChangeText={setLengthMm}
              keyboardType="number-pad"
              placeholder="Length in mm"
              placeholderTextColor="#5a6c78"
              style={{ borderWidth: 1, borderColor: 'rgba(202,240,248,0.18)', padding: 12, borderRadius: 12, backgroundColor: 'rgba(245,252,255,0.96)', color: '#102a43' }}
            />
            <Pressable onPress={logCompetitionCatch} style={{ backgroundColor: '#2a9d8f', padding: 12, borderRadius: 12 }}>
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
