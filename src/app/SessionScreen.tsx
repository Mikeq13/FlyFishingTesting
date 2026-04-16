import React, { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { DepthSelector } from '@/components/DepthSelector';
import { KeyboardDismissView } from '@/components/KeyboardDismissView';
import { OptionChips } from '@/components/OptionChips';
import { RigFlyManager } from '@/components/RigFlyManager';
import { RigSetupPanel } from '@/components/RigSetupPanel';
import { DEPTH_RANGES, SESSION_ALERT_MARKERS, WATER_TYPES } from '@/constants/options';
import { useAppStore } from './store';
import { CompetitionLengthUnit, SessionMode, WaterType } from '@/types/session';
import { ScreenBackground } from '@/components/ScreenBackground';
import { createDefaultRigSetup } from '@/utils/rigSetup';

const MODE_COPY: Record<SessionMode, { title: string; subtitle: string; button: string }> = {
  experiment: {
    title: 'Journal Entry',
    subtitle: 'What will you be discovering in your journal entry today?',
    button: 'Begin Journal Entry'
  },
  practice: {
    title: 'Practice Session',
    subtitle: 'What kind of water are you getting reps on today?',
    button: 'Begin Practice Session'
  },
  competition: {
    title: 'Competition Session',
    subtitle: 'Set the conditions for today’s comp-focused intel.',
    button: 'Begin Competition Session'
  }
};

export const SessionScreen = ({ navigation, route }: any) => {
  const { width } = useWindowDimensions();
  const { addSession, addSavedFly, addSavedLeaderFormula, deleteSavedLeaderFormula, addSavedRiver, savedFlies, savedLeaderFormulas, savedRivers, users, activeUserId, sessions, experiments } = useAppStore();
  const mode = (route?.params?.mode ?? 'experiment') as SessionMode;
  const modeCopy = MODE_COPY[mode] ?? MODE_COPY.experiment;
  const activeUser = users.find((user) => user.id === activeUserId);
  const [waterType, setWaterType] = useState<WaterType>('run');
  const [depthRange, setDepthRange] = useState<typeof DEPTH_RANGES[number]>('1.5-3 ft');
  const [riverName, setRiverName] = useState('');
  const [hypothesis, setHypothesis] = useState('');
  const [notes, setNotes] = useState('');
  const [durationHours, setDurationHours] = useState(mode === 'competition' ? '3' : '2');
  const [durationMinutes, setDurationMinutes] = useState('0');
  const [alertMarkersMinutes, setAlertMarkersMinutes] = useState<number[]>([15]);
  const [customAlertMinute, setCustomAlertMinute] = useState('');
  const [competitionBeat, setCompetitionBeat] = useState('');
  const [competitionSessionNumber, setCompetitionSessionNumber] = useState('1');
  const [competitionRequiresMeasurement, setCompetitionRequiresMeasurement] = useState(true);
  const [competitionLengthUnit, setCompetitionLengthUnit] = useState<CompetitionLengthUnit>('mm');
  const [practiceRigSetup, setPracticeRigSetup] = useState(() => createDefaultRigSetup([]));
  const [showSavedRiverList, setShowSavedRiverList] = useState(false);
  const [showSavedHypothesisList, setShowSavedHypothesisList] = useState(false);
  const sortedSavedRivers = useMemo(() => [...savedRivers].sort((a, b) => a.name.localeCompare(b.name)), [savedRivers]);
  const savedHypotheses = useMemo(
    () =>
      [
        ...new Set(
          [
            ...sessions.map((session) => session.hypothesis?.trim() ?? ''),
            ...experiments.map((experiment) => experiment.hypothesis?.trim() ?? '')
          ].filter((value) => value && value !== 'No hypothesis provided')
        )
      ].sort((left, right) => left.localeCompare(right)),
    [experiments, sessions]
  );
  const contentMaxWidth = Platform.OS === 'web' ? Math.min(width - 24, 920) : undefined;

  const saveRiver = async () => {
    const normalizedRiverName = riverName.trim();
    if (!normalizedRiverName) return;
    if (savedRivers.some((river) => river.name.trim().toLowerCase() === normalizedRiverName.toLowerCase())) return;
    await addSavedRiver(normalizedRiverName);
  };

  const plannedDurationMinutes = useMemo(() => {
    if (mode === 'experiment') return undefined;
    const hours = Math.max(0, Number(durationHours || '0'));
    const minutes = Math.max(0, Number(durationMinutes || '0'));
    const total = hours * 60 + minutes;
    return Number.isFinite(total) && total > 0 ? total : undefined;
  }, [durationHours, durationMinutes, mode]);

  const plannedEndLabel = useMemo(() => {
    if (mode === 'experiment' || !plannedDurationMinutes) return null;
    const plannedEnd = new Date(Date.now() + plannedDurationMinutes * 60 * 1000);
    return plannedEnd.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }, [mode, plannedDurationMinutes]);

  const alertIntervalMinutes = useMemo(() => {
    if (mode === 'experiment') return undefined;
    return alertMarkersMinutes.length ? alertMarkersMinutes[0] : null;
  }, [alertMarkersMinutes, mode]);

  const addCustomAlertMarker = () => {
    const minute = Number(customAlertMinute);
    if (!Number.isFinite(minute) || minute <= 0) return;
    setAlertMarkersMinutes((current) => (current.includes(minute) ? current : [...current, minute].sort((left, right) => left - right)));
    setCustomAlertMinute('');
  };

  const onStart = async () => {
    const normalizedRiverName = riverName.trim();
    if (normalizedRiverName) {
      await saveRiver();
    }

    const id = await addSession({
      date: new Date().toISOString(),
      mode,
      plannedDurationMinutes,
      alertIntervalMinutes,
      alertMarkersMinutes,
      waterType,
      depthRange,
      competitionBeat: mode === 'competition' ? competitionBeat.trim() || undefined : undefined,
      competitionSessionNumber: mode === 'competition' ? Number(competitionSessionNumber || '0') || undefined : undefined,
      competitionRequiresMeasurement: mode === 'competition' ? competitionRequiresMeasurement : undefined,
      competitionLengthUnit: mode === 'competition' ? competitionLengthUnit : undefined,
      startingRigSetup: mode === 'practice' ? practiceRigSetup : undefined,
      riverName: normalizedRiverName || undefined,
      hypothesis: hypothesis.trim() || undefined,
      notes
    });
    navigation.navigate(mode === 'experiment' ? 'Experiment' : mode === 'practice' ? 'Practice' : 'Competition', { sessionId: id });
  };

  return (
    <ScreenBackground>
      <KeyboardDismissView>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12, width: '100%', alignSelf: 'center', maxWidth: contentMaxWidth }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 28, fontWeight: '800', color: '#f7fdff' }}>{modeCopy.title}</Text>
          <Text style={{ color: '#d7f3ff', lineHeight: 20 }}>{modeCopy.subtitle}</Text>
          <Text style={{ color: '#dbf5ff', fontWeight: '700' }}>Angler: {activeUser?.name ?? 'Loading...'}</Text>
        </View>
        <View style={{ gap: 8, backgroundColor: 'rgba(6, 27, 44, 0.70)', padding: 14, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(202,240,248,0.16)' }}>
          {mode !== 'competition' ? (
            <>
              <Text style={{ color: '#d7f3ff', fontWeight: '700', fontSize: 16 }}>River</Text>
              {!!sortedSavedRivers.length && (
                <>
                  <Pressable onPress={() => setShowSavedRiverList((current) => !current)} style={{ backgroundColor: '#1d3557', padding: 12, borderRadius: 12 }}>
                    <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>
                      {showSavedRiverList ? 'Hide Saved Rivers' : 'Choose Saved River'}
                    </Text>
                  </Pressable>
                  {showSavedRiverList && (
                    <ScrollView style={{ maxHeight: 180, borderWidth: 1, borderColor: 'rgba(202,240,248,0.18)', borderRadius: 12, backgroundColor: 'rgba(245,252,255,0.96)' }}>
                      {sortedSavedRivers.map((river) => (
                        <Pressable
                          key={river.id}
                          onPress={() => {
                            setRiverName(river.name);
                            setShowSavedRiverList(false);
                          }}
                          style={{ paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#d8e2eb' }}
                        >
                          <Text style={{ color: '#0b3d3a', fontWeight: '600' }}>{river.name}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  )}
                </>
              )}
              <TextInput value={riverName} onChangeText={setRiverName} placeholder="River name" placeholderTextColor="#5a6c78" style={{ borderWidth: 1, borderColor: 'rgba(202,240,248,0.18)', padding: 12, borderRadius: 12, backgroundColor: 'rgba(245,252,255,0.96)', color: '#102a43' }} />
              <OptionChips label="Water Type" options={WATER_TYPES} value={waterType} onChange={setWaterType} />
              <Text style={{ color: '#d7f3ff', fontWeight: '700' }}>Water Depth</Text>
              <DepthSelector value={depthRange} onChange={setDepthRange} />
            </>
          ) : (
            <>
              <Text style={{ color: '#d7f3ff', fontWeight: '700', fontSize: 16 }}>Competition Context</Text>
              <Text style={{ color: '#bde6f6', lineHeight: 20 }}>
                Competition sessions are beat-based. Track the beat you drew, the session number, and whether fish will be measured or counted only.
              </Text>
              <Text style={{ color: '#d7f3ff', fontWeight: '700' }}>Beat / Section</Text>
              <TextInput value={competitionBeat} onChangeText={setCompetitionBeat} placeholder="Beat / section name" placeholderTextColor="#5a6c78" style={{ borderWidth: 1, borderColor: 'rgba(202,240,248,0.18)', padding: 12, borderRadius: 12, backgroundColor: 'rgba(245,252,255,0.96)', color: '#102a43' }} />
              <Text style={{ color: '#d7f3ff', fontWeight: '700' }}>Session Number</Text>
              <TextInput value={competitionSessionNumber} onChangeText={setCompetitionSessionNumber} placeholder="Session number" keyboardType="number-pad" placeholderTextColor="#5a6c78" style={{ borderWidth: 1, borderColor: 'rgba(202,240,248,0.18)', padding: 12, borderRadius: 12, backgroundColor: 'rgba(245,252,255,0.96)', color: '#102a43' }} />
              <OptionChips
                label="Measure Fish This Session?"
                options={['Yes', 'No'] as const}
                value={competitionRequiresMeasurement ? 'Yes' : 'No'}
                onChange={(value) => setCompetitionRequiresMeasurement(value === 'Yes')}
              />
              {competitionRequiresMeasurement ? (
                <>
                  <OptionChips
                    label="Competition Length Unit"
                    options={['mm', 'cm'] as const}
                    value={competitionLengthUnit}
                    onChange={(value) => setCompetitionLengthUnit(value as CompetitionLengthUnit)}
                  />
                  <Text style={{ color: '#bde6f6', lineHeight: 20 }}>
                    Length unit stays locked for this session and auto-populates each time you log a fish.
                    {competitionLengthUnit === 'cm' ? ' Minimum measurable fish size is 20 cm.' : ' If your comp uses the standard minimum, fish under 200 mm should not count.'}
                  </Text>
                </>
              ) : null}
            </>
          )}
          {mode === 'practice' ? (
            <>
              <RigFlyManager
                title="Starting Rig Flies"
                rigSetup={practiceRigSetup}
                savedFlies={savedFlies}
                onChange={setPracticeRigSetup}
                onCreateFly={async (fly) => {
                  const normalizedFly = { ...fly, name: fly.name.trim() };
                  if (!normalizedFly.name) return;
                  await addSavedFly(normalizedFly);
                }}
              />
              <RigSetupPanel
                title="Starting Rig Setup"
                rigSetup={practiceRigSetup}
                flyCount={practiceRigSetup.assignments.length}
                savedLeaderFormulas={savedLeaderFormulas}
                onChange={setPracticeRigSetup}
                onCreateLeaderFormula={async (payload) => {
                  const id = await addSavedLeaderFormula(payload);
                  return {
                    id,
                    userId: activeUserId ?? 0,
                    name: payload.name,
                    sections: payload.sections,
                    createdAt: new Date().toISOString()
                  };
                }}
                onDeleteLeaderFormula={deleteSavedLeaderFormula}
              />
            </>
          ) : null}
          {mode !== 'experiment' ? (
            <>
              <Text style={{ color: '#d7f3ff', fontWeight: '700', fontSize: 16 }}>Session Timer</Text>
              <Text style={{ color: '#bde6f6', lineHeight: 20 }}>
                Set the total time you plan to fish in this session. Reminder markers fire based on elapsed time from when you begin.
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={{ color: '#d7f3ff', fontWeight: '700' }}>Hours</Text>
                  <TextInput
                    value={durationHours}
                    onChangeText={setDurationHours}
                    placeholder="0"
                    keyboardType="number-pad"
                    placeholderTextColor="#5a6c78"
                    style={{ borderWidth: 1, borderColor: 'rgba(202,240,248,0.18)', padding: 12, borderRadius: 12, backgroundColor: 'rgba(245,252,255,0.96)', color: '#102a43' }}
                  />
                </View>
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={{ color: '#d7f3ff', fontWeight: '700' }}>Minutes</Text>
                  <TextInput
                    value={durationMinutes}
                    onChangeText={setDurationMinutes}
                    placeholder="0"
                    keyboardType="number-pad"
                    placeholderTextColor="#5a6c78"
                    style={{ borderWidth: 1, borderColor: 'rgba(202,240,248,0.18)', padding: 12, borderRadius: 12, backgroundColor: 'rgba(245,252,255,0.96)', color: '#102a43' }}
                  />
                </View>
              </View>
              {plannedEndLabel ? (
                <Text style={{ color: '#bde6f6' }}>If you begin now, your planned end time is {plannedEndLabel}.</Text>
              ) : null}
              <View style={{ gap: 8 }}>
                <Text style={{ color: '#d7f3ff', fontWeight: '700' }}>Reminder Markers</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {SESSION_ALERT_MARKERS.map((minute) => {
                    const selected = alertMarkersMinutes.includes(minute);
                    return (
                      <Pressable
                        key={minute}
                        onPress={() =>
                          setAlertMarkersMinutes((current) =>
                            current.includes(minute)
                              ? current.filter((value) => value !== minute)
                              : [...current, minute].sort((left, right) => left - right)
                          )
                        }
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 999,
                          borderWidth: 1,
                          borderColor: selected ? '#84d9f4' : 'rgba(255,255,255,0.22)',
                          backgroundColor: selected ? 'rgba(132,217,244,0.28)' : 'rgba(6,28,41,0.5)'
                        }}
                      >
                        <Text style={{ color: '#f4fbff', fontWeight: '700' }}>{minute} min</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput
                    value={customAlertMinute}
                    onChangeText={setCustomAlertMinute}
                    placeholder="Custom minute"
                    keyboardType="number-pad"
                    placeholderTextColor="#5a6c78"
                    style={{ flex: 1, borderWidth: 1, borderColor: 'rgba(202,240,248,0.18)', padding: 12, borderRadius: 12, backgroundColor: 'rgba(245,252,255,0.96)', color: '#102a43' }}
                  />
                  <Pressable
                    onPress={addCustomAlertMarker}
                    style={{ backgroundColor: '#1d3557', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, justifyContent: 'center' }}
                  >
                    <Text style={{ color: '#f7fdff', fontWeight: '700' }}>Add</Text>
                  </Pressable>
                </View>
                {!!alertMarkersMinutes.length ? (
                  <Text style={{ color: '#bde6f6' }}>
                    Active reminders: {alertMarkersMinutes.map((minute) => `${minute} min`).join(', ')}
                  </Text>
                ) : (
                  <Text style={{ color: '#bde6f6' }}>
                    No reminders selected. You can use presets or add custom minute markers for your beat.
                  </Text>
                )}
                <Pressable
                  onPress={() => setAlertMarkersMinutes([])}
                  style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: 10, borderRadius: 12 }}
                >
                  <Text style={{ color: '#f7fdff', textAlign: 'center', fontWeight: '700' }}>Turn Off Reminders</Text>
                </Pressable>
              </View>
            </>
          ) : null}
          {mode === 'experiment' && !!savedHypotheses.length && (
            <>
              <Pressable onPress={() => setShowSavedHypothesisList((current) => !current)} style={{ backgroundColor: '#1d3557', padding: 12, borderRadius: 12 }}>
                <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>
                  {showSavedHypothesisList ? 'Hide Saved Hypotheses' : 'Choose Saved Hypothesis'}
                </Text>
              </Pressable>
              {showSavedHypothesisList && (
                <ScrollView style={{ maxHeight: 180, borderWidth: 1, borderColor: 'rgba(202,240,248,0.18)', borderRadius: 12, backgroundColor: 'rgba(245,252,255,0.96)' }}>
                  {savedHypotheses.map((savedHypothesis) => (
                    <Pressable
                      key={savedHypothesis}
                      onPress={() => {
                        setHypothesis(savedHypothesis);
                        setShowSavedHypothesisList(false);
                      }}
                      style={{ paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#d8e2eb' }}
                    >
                      <Text style={{ color: '#0b3d3a', fontWeight: '600' }}>{savedHypothesis}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            </>
          )}
          {mode === 'experiment' ? (
            <TextInput value={hypothesis} onChangeText={setHypothesis} placeholder="Hypothesis" placeholderTextColor="#5a6c78" style={{ borderWidth: 1, borderColor: 'rgba(202,240,248,0.18)', padding: 12, borderRadius: 12, backgroundColor: 'rgba(245,252,255,0.96)', color: '#102a43' }} />
          ) : null}
          <TextInput value={notes} onChangeText={setNotes} placeholder="Session notes" placeholderTextColor="#5a6c78" multiline style={{ borderWidth: 1, borderColor: 'rgba(202,240,248,0.18)', padding: 12, borderRadius: 12, backgroundColor: 'rgba(245,252,255,0.96)', color: '#102a43', minHeight: 96, textAlignVertical: 'top' }} />
        </View>
        <Pressable onPress={onStart} style={{ backgroundColor: '#2a9d8f', padding: 14, borderRadius: 14, width: '100%' }}>
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>{modeCopy.button}</Text>
        </Pressable>
      </ScrollView>
      </KeyboardDismissView>
    </ScreenBackground>
  );
};
