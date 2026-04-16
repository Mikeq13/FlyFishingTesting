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
import { applyRigPresetToRig, createDefaultRigSetup, setRigFlyCount } from '@/utils/rigSetup';
import { getInvalidReminderMarkers, isReminderMarkerAllowed } from '@/utils/sessionReminders';
import { CompetitionSessionRole, Group } from '@/types/group';
import { formatLocalDateTimeInput, parseLocalDateTimeInput } from '@/utils/dateTime';

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
  const { addSession, updateSessionEntry, addSavedFly, addSavedLeaderFormula, deleteSavedLeaderFormula, addSavedRigPreset, deleteSavedRigPreset, addSavedRiver, savedFlies, savedLeaderFormulas, savedRigPresets, savedRivers, users, activeUserId, sessions, experiments, groups, groupMemberships, competitions, competitionParticipants, upsertCompetitionAssignment } = useAppStore();
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
  const [customAlertError, setCustomAlertError] = useState('');
  const [competitionBeat, setCompetitionBeat] = useState('');
  const [competitionSessionNumber, setCompetitionSessionNumber] = useState('1');
  const [competitionRequiresMeasurement, setCompetitionRequiresMeasurement] = useState(true);
  const [competitionLengthUnit, setCompetitionLengthUnit] = useState<CompetitionLengthUnit>('mm');
  const [selectedSharedGroupId, setSelectedSharedGroupId] = useState<number | null>(null);
  const [practiceMeasurementEnabled, setPracticeMeasurementEnabled] = useState(false);
  const [practiceLengthUnit, setPracticeLengthUnit] = useState<'in' | 'cm' | 'mm'>('in');
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<number | null>(null);
  const [competitionAssignedGroup, setCompetitionAssignedGroup] = useState('');
  const [competitionRole, setCompetitionRole] = useState<CompetitionSessionRole>('fishing');
  const [competitionStartAtInput, setCompetitionStartAtInput] = useState(() => formatLocalDateTimeInput(new Date()));
  const [competitionEndAtInput, setCompetitionEndAtInput] = useState(() => formatLocalDateTimeInput(new Date(Date.now() + 3 * 60 * 60 * 1000)));
  const [notificationSoundEnabled, setNotificationSoundEnabled] = useState(true);
  const [notificationVibrationEnabled, setNotificationVibrationEnabled] = useState(true);
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
  const joinedGroupMemberships = useMemo(
    () => groupMemberships.filter((membership) => membership.userId === activeUserId),
    [activeUserId, groupMemberships]
  );
  const joinedGroups = useMemo(
    () =>
      joinedGroupMemberships
        .map((membership) => groups.find((group) => group.id === membership.groupId))
        .filter((group): group is Group => !!group),
    [groups, joinedGroupMemberships]
  );
  const joinedCompetitions = useMemo(
    () =>
      competitionParticipants
        .filter((participant) => participant.userId === activeUserId)
        .map((participant) => competitions.find((competition) => competition.id === participant.competitionId))
        .filter((competition): competition is (typeof competitions)[number] => !!competition),
    [activeUserId, competitionParticipants, competitions]
  );

  React.useEffect(() => {
    if (!joinedGroups.length) return;
    setSelectedSharedGroupId((current) => (current && joinedGroups.some((group) => group.id === current) ? current : joinedGroups[0].id));
  }, [joinedGroups]);

  React.useEffect(() => {
    if (!selectedCompetitionId) return;
    const selectedCompetition = joinedCompetitions.find((competition) => competition.id === selectedCompetitionId);
    if (!selectedCompetition) return;
    setCompetitionStartAtInput(formatLocalDateTimeInput(selectedCompetition.startAt));
    setCompetitionEndAtInput(formatLocalDateTimeInput(selectedCompetition.endAt));
    setSelectedSharedGroupId(selectedCompetition.groupId);
  }, [joinedCompetitions, selectedCompetitionId]);

  React.useEffect(() => {
    if (!joinedCompetitions.length || selectedCompetitionId) return;
    setSelectedCompetitionId(joinedCompetitions[0].id);
  }, [joinedCompetitions, selectedCompetitionId]);

  const saveRiver = async () => {
    const normalizedRiverName = riverName.trim();
    if (!normalizedRiverName) return;
    if (savedRivers.some((river) => river.name.trim().toLowerCase() === normalizedRiverName.toLowerCase())) return;
    await addSavedRiver(normalizedRiverName);
  };

  const plannedDurationMinutes = useMemo(() => {
    if (mode === 'experiment') return undefined;
    if (mode === 'competition') {
      const parsedStartAt = parseLocalDateTimeInput(competitionStartAtInput);
      const parsedEndAt = parseLocalDateTimeInput(competitionEndAtInput);
      if (!parsedStartAt || !parsedEndAt) return undefined;
      return Math.max(0, Math.round((new Date(parsedEndAt).getTime() - new Date(parsedStartAt).getTime()) / 60000));
    }
    const hours = Math.max(0, Number(durationHours || '0'));
    const minutes = Math.max(0, Number(durationMinutes || '0'));
    const total = hours * 60 + minutes;
    return Number.isFinite(total) && total > 0 ? total : undefined;
  }, [competitionEndAtInput, competitionStartAtInput, durationHours, durationMinutes, mode]);

  const plannedEndLabel = useMemo(() => {
    if (mode === 'experiment' || !plannedDurationMinutes) return null;
    const plannedEnd =
      mode === 'competition'
        ? parseLocalDateTimeInput(competitionEndAtInput)
          ? new Date(parseLocalDateTimeInput(competitionEndAtInput)!)
          : new Date(Date.now() + plannedDurationMinutes * 60 * 1000)
        : new Date(Date.now() + plannedDurationMinutes * 60 * 1000);
    return plannedEnd.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }, [competitionEndAtInput, mode, plannedDurationMinutes]);

  const alertIntervalMinutes = useMemo(() => {
    if (mode === 'experiment') return undefined;
    return alertMarkersMinutes.length ? alertMarkersMinutes[0] : null;
  }, [alertMarkersMinutes, mode]);

  const invalidReminderMarkers = useMemo(
    () => (mode === 'experiment' ? [] : getInvalidReminderMarkers(alertMarkersMinutes, plannedDurationMinutes)),
    [alertMarkersMinutes, mode, plannedDurationMinutes]
  );

  const reminderValidationMessage = useMemo(() => {
    if (!invalidReminderMarkers.length || typeof plannedDurationMinutes !== 'number') return null;
    return `Reminder markers must be within the planned session time of ${plannedDurationMinutes} minutes. Remove or adjust: ${invalidReminderMarkers.map((minute) => `${minute} min`).join(', ')}.`;
  }, [invalidReminderMarkers, plannedDurationMinutes]);

  const addCustomAlertMarker = () => {
    const minute = Number(customAlertMinute);
    if (!Number.isFinite(minute) || minute <= 0) {
      setCustomAlertError('Enter a reminder marker greater than 0 minutes.');
      return;
    }
    if (!isReminderMarkerAllowed(minute, plannedDurationMinutes)) {
      setCustomAlertError(`Reminder markers must be within the planned session time${typeof plannedDurationMinutes === 'number' ? ` of ${plannedDurationMinutes} minutes` : ''}.`);
      return;
    }
    setAlertMarkersMinutes((current) => (current.includes(minute) ? current : [...current, minute].sort((left, right) => left - right)));
    setCustomAlertMinute('');
    setCustomAlertError('');
  };

  const onStart = async () => {
    if (invalidReminderMarkers.length) {
      return;
    }
    const competitionStartAt = mode === 'competition' ? parseLocalDateTimeInput(competitionStartAtInput) : null;
    const competitionEndAt = mode === 'competition' ? parseLocalDateTimeInput(competitionEndAtInput) : null;
    if (mode === 'competition' && (!competitionStartAt || !competitionEndAt || new Date(competitionEndAt) <= new Date(competitionStartAt))) {
      setCustomAlertError('Competition sessions need a valid start and end time.');
      return;
    }
    const normalizedRiverName = riverName.trim();
    if (normalizedRiverName) {
      await saveRiver();
    }

    const id = await addSession({
      date: mode === 'competition' ? competitionStartAt! : new Date().toISOString(),
      mode,
      plannedDurationMinutes,
      alertIntervalMinutes,
      alertMarkersMinutes,
      notificationSoundEnabled: mode === 'experiment' ? undefined : notificationSoundEnabled,
      notificationVibrationEnabled: mode === 'experiment' ? undefined : notificationVibrationEnabled,
      startAt: mode === 'competition' ? competitionStartAt! : undefined,
      endAt: mode === 'competition' ? competitionEndAt! : undefined,
      waterType,
      depthRange,
      sharedGroupId: selectedSharedGroupId ?? undefined,
      practiceMeasurementEnabled: mode === 'practice' ? practiceMeasurementEnabled : undefined,
      practiceLengthUnit: mode === 'practice' ? practiceLengthUnit : undefined,
      competitionId: mode === 'competition' ? selectedCompetitionId ?? undefined : undefined,
      competitionAssignedGroup: mode === 'competition' ? competitionAssignedGroup.trim() || undefined : undefined,
      competitionRole: mode === 'competition' ? competitionRole : undefined,
      competitionBeat: mode === 'competition' ? competitionBeat.trim() || undefined : undefined,
      competitionSessionNumber: mode === 'competition' ? Number(competitionSessionNumber || '0') || undefined : undefined,
      competitionRequiresMeasurement: mode === 'competition' ? competitionRequiresMeasurement : undefined,
      competitionLengthUnit: mode === 'competition' ? competitionLengthUnit : undefined,
      startingRigSetup: mode === 'practice' ? practiceRigSetup : undefined,
      riverName: normalizedRiverName || undefined,
      hypothesis: hypothesis.trim() || undefined,
      notes
    });
    if (mode === 'competition' && selectedCompetitionId) {
      const assignment = await upsertCompetitionAssignment({
        competitionId: selectedCompetitionId,
        assignedGroup: competitionAssignedGroup.trim() || 'Open Group',
        sessionNumber: Number(competitionSessionNumber || '0') || 1,
        beat: competitionBeat.trim() || 'Open Beat',
        role: competitionRole,
        startAt: competitionStartAt!,
        endAt: competitionEndAt!,
        sessionId: id
      });
      await updateSessionEntry(id, {
        date: competitionStartAt!,
        mode,
        plannedDurationMinutes,
        alertIntervalMinutes,
        alertMarkersMinutes,
        notificationSoundEnabled,
        notificationVibrationEnabled,
        startAt: competitionStartAt!,
        endAt: competitionEndAt!,
        endedAt: undefined,
        waterType,
        depthRange,
        sharedGroupId: selectedSharedGroupId ?? undefined,
        practiceMeasurementEnabled: undefined,
        practiceLengthUnit: undefined,
        competitionId: selectedCompetitionId,
        competitionAssignmentId: assignment.id,
        competitionAssignedGroup: competitionAssignedGroup.trim() || undefined,
        competitionRole,
        competitionBeat: competitionBeat.trim() || undefined,
        competitionSessionNumber: Number(competitionSessionNumber || '0') || undefined,
        competitionRequiresMeasurement,
        competitionLengthUnit,
        startingRigSetup: undefined,
        riverName: normalizedRiverName || undefined,
        hypothesis: hypothesis.trim() || undefined,
        notes
      });
    }
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
              {!!joinedCompetitions.length ? (
                <OptionChips
                  label="Competition"
                  options={joinedCompetitions.map((competition) => competition.name)}
                  value={joinedCompetitions.find((competition) => competition.id === selectedCompetitionId)?.name ?? joinedCompetitions[0]?.name}
                  onChange={(value) => {
                    const selected = joinedCompetitions.find((competition) => competition.name === value);
                    setSelectedCompetitionId(selected?.id ?? null);
                  }}
                />
              ) : (
                <Text style={{ color: '#bde6f6' }}>Join or create a competition in Access & Billing before starting a comp session.</Text>
              )}
              <Text style={{ color: '#d7f3ff', fontWeight: '700' }}>Assigned Group</Text>
              <TextInput value={competitionAssignedGroup} onChangeText={setCompetitionAssignedGroup} placeholder="Ex: Group A" placeholderTextColor="#5a6c78" style={{ borderWidth: 1, borderColor: 'rgba(202,240,248,0.18)', padding: 12, borderRadius: 12, backgroundColor: 'rgba(245,252,255,0.96)', color: '#102a43' }} />
              <Text style={{ color: '#d7f3ff', fontWeight: '700' }}>Beat / Section</Text>
              <TextInput value={competitionBeat} onChangeText={setCompetitionBeat} placeholder="Beat / section name" placeholderTextColor="#5a6c78" style={{ borderWidth: 1, borderColor: 'rgba(202,240,248,0.18)', padding: 12, borderRadius: 12, backgroundColor: 'rgba(245,252,255,0.96)', color: '#102a43' }} />
              <Text style={{ color: '#d7f3ff', fontWeight: '700' }}>Session Number</Text>
              <TextInput value={competitionSessionNumber} onChangeText={setCompetitionSessionNumber} placeholder="Session number" keyboardType="number-pad" placeholderTextColor="#5a6c78" style={{ borderWidth: 1, borderColor: 'rgba(202,240,248,0.18)', padding: 12, borderRadius: 12, backgroundColor: 'rgba(245,252,255,0.96)', color: '#102a43' }} />
              <OptionChips
                label="Your Role"
                options={['fishing', 'controlling'] as const}
                value={competitionRole}
                onChange={(value) => setCompetitionRole(value as CompetitionSessionRole)}
              />
              <Text style={{ color: '#d7f3ff', fontWeight: '700' }}>Competition Start (YYYY-MM-DD HH:MM)</Text>
              <TextInput value={competitionStartAtInput} onChangeText={setCompetitionStartAtInput} placeholder="2026-04-16 08:00" placeholderTextColor="#5a6c78" style={{ borderWidth: 1, borderColor: 'rgba(202,240,248,0.18)', padding: 12, borderRadius: 12, backgroundColor: 'rgba(245,252,255,0.96)', color: '#102a43' }} />
              <Text style={{ color: '#d7f3ff', fontWeight: '700' }}>Competition End (YYYY-MM-DD HH:MM)</Text>
              <TextInput value={competitionEndAtInput} onChangeText={setCompetitionEndAtInput} placeholder="2026-04-16 11:00" placeholderTextColor="#5a6c78" style={{ borderWidth: 1, borderColor: 'rgba(202,240,248,0.18)', padding: 12, borderRadius: 12, backgroundColor: 'rgba(245,252,255,0.96)', color: '#102a43' }} />
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
              <RigSetupPanel
                title="Starting Rig Setup"
                rigSetup={practiceRigSetup}
                flyCount={practiceRigSetup.assignments.length}
                onFlyCountChange={(nextCount) => {
                  setPracticeRigSetup((current) =>
                    setRigFlyCount(current, nextCount, {
                      clearPointFly: nextCount === 1 && current.assignments.length > 1
                    })
                  );
                }}
                savedLeaderFormulas={savedLeaderFormulas}
                savedRigPresets={savedRigPresets}
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
                onCreateRigPreset={async (payload) => {
                  const id = await addSavedRigPreset(payload);
                  return {
                    id,
                    userId: activeUserId ?? 0,
                    ...payload,
                    createdAt: new Date().toISOString()
                  };
                }}
                onApplyRigPreset={(preset) => {
                  setPracticeRigSetup((current) => applyRigPresetToRig(current, preset, { clearSinglePointFly: preset.flyCount === 1 }));
                }}
                onDeleteLeaderFormula={deleteSavedLeaderFormula}
                onDeleteRigPreset={deleteSavedRigPreset}
              />
              <RigFlyManager
                title="Fly Assignments"
                rigSetup={practiceRigSetup}
                savedFlies={savedFlies}
                onChange={setPracticeRigSetup}
                onCreateFly={async (fly) => {
                  const normalizedFly = { ...fly, name: fly.name.trim() };
                  if (!normalizedFly.name) return;
                  await addSavedFly(normalizedFly);
                }}
              />
              <OptionChips
                label="Measure Fish In Practice?"
                options={['Yes', 'No'] as const}
                value={practiceMeasurementEnabled ? 'Yes' : 'No'}
                onChange={(value) => setPracticeMeasurementEnabled(value === 'Yes')}
              />
              {practiceMeasurementEnabled ? (
                <OptionChips
                  label="Practice Length Unit"
                  options={['in', 'cm', 'mm'] as const}
                  value={practiceLengthUnit}
                  onChange={(value) => setPracticeLengthUnit(value as 'in' | 'cm' | 'mm')}
                />
              ) : null}
            </>
          ) : null}
          {!!joinedGroups.length ? (
            <OptionChips
              label="Share With Group"
              options={['Private', ...joinedGroups.map((group) => group.name)]}
              value={selectedSharedGroupId ? joinedGroups.find((group) => group.id === selectedSharedGroupId)?.name ?? 'Private' : 'Private'}
              onChange={(value) => {
                const selected = joinedGroups.find((group) => group.name === value);
                setSelectedSharedGroupId(selected?.id ?? null);
              }}
            />
          ) : null}
          {mode !== 'experiment' ? (
            <>
              <Text style={{ color: '#d7f3ff', fontWeight: '700', fontSize: 16 }}>Session Timer</Text>
              <Text style={{ color: '#bde6f6', lineHeight: 20 }}>
                {mode === 'competition'
                  ? 'Competition reminders follow the absolute start and end times above.'
                  : 'Set the total time you plan to fish in this session. Reminder markers fire based on elapsed time from when you begin.'}
              </Text>
              {mode === 'practice' ? (
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
              ) : null}
              {plannedEndLabel ? (
                <Text style={{ color: '#bde6f6' }}>If you begin now, your planned end time is {plannedEndLabel}.</Text>
              ) : null}
              <View style={{ gap: 8 }}>
                <Text style={{ color: '#d7f3ff', fontWeight: '700' }}>Reminder Markers</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {SESSION_ALERT_MARKERS.map((minute) => {
                    const selected = alertMarkersMinutes.includes(minute);
                    const disabled = !selected && !isReminderMarkerAllowed(minute, plannedDurationMinutes);
                    return (
                      <Pressable
                        key={minute}
                        onPress={() => {
                          if (disabled) {
                            return;
                          }
                          setAlertMarkersMinutes((current) =>
                            current.includes(minute)
                              ? current.filter((value) => value !== minute)
                              : [...current, minute].sort((left, right) => left - right)
                          );
                        }}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 999,
                          borderWidth: 1,
                          borderColor: selected ? '#84d9f4' : disabled ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.22)',
                          backgroundColor: selected ? 'rgba(132,217,244,0.28)' : disabled ? 'rgba(6,28,41,0.24)' : 'rgba(6,28,41,0.5)',
                          opacity: disabled ? 0.45 : 1
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
                {customAlertError ? (
                  <Text style={{ color: '#fca5a5' }}>{customAlertError}</Text>
                ) : null}
                {reminderValidationMessage ? (
                  <Text style={{ color: '#fca5a5' }}>{reminderValidationMessage}</Text>
                ) : null}
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
                <OptionChips
                  label="Notification Sound"
                  options={['On', 'Off'] as const}
                  value={notificationSoundEnabled ? 'On' : 'Off'}
                  onChange={(value) => setNotificationSoundEnabled(value === 'On')}
                />
                <OptionChips
                  label="Notification Vibration"
                  options={['On', 'Off'] as const}
                  value={notificationVibrationEnabled ? 'On' : 'Off'}
                  onChange={(value) => setNotificationVibrationEnabled(value === 'On')}
                />
                <Text style={{ color: '#bde6f6', lineHeight: 20 }}>
                  Local reminders follow your session settings here, while the phone still applies its own notification permissions and device behavior.
                </Text>
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
        <Pressable onPress={onStart} disabled={invalidReminderMarkers.length > 0} style={{ backgroundColor: invalidReminderMarkers.length > 0 ? '#6c757d' : '#2a9d8f', padding: 14, borderRadius: 14, width: '100%' }}>
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>{modeCopy.button}</Text>
        </Pressable>
      </ScrollView>
      </KeyboardDismissView>
    </ScreenBackground>
  );
};
