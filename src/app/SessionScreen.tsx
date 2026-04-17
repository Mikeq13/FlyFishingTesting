import React, { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { KeyboardDismissView } from '@/components/KeyboardDismissView';
import { OptionChips } from '@/components/OptionChips';
import { DEPTH_RANGES } from '@/constants/options';
import { useAppStore } from './store';
import { CompetitionLengthUnit, SessionMode, WaterType } from '@/types/session';
import { ScreenBackground } from '@/components/ScreenBackground';
import { AppButton } from '@/components/ui/AppButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { StatusBanner } from '@/components/ui/StatusBanner';
import { SelectableListPanel } from '@/components/ui/SelectableListPanel';
import { FormField, formInputStyle } from '@/components/ui/FormField';
import { appTheme } from '@/design/theme';
import { applyRigPresetToRig, createDefaultRigSetup, setRigFlyCount } from '@/utils/rigSetup';
import { getInvalidReminderMarkers, isReminderMarkerAllowed } from '@/utils/sessionReminders';
import { Group } from '@/types/group';
import { combineDateAndTime } from '@/utils/dateTime';
import { SessionEnvironmentSection } from '@/components/sessionSetup/SessionEnvironmentSection';
import { PracticeSetupSection } from '@/components/sessionSetup/PracticeSetupSection';
import { ReminderSettingsSection } from '@/components/sessionSetup/ReminderSettingsSection';

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
  const { addSession, updateSessionEntry, addSavedFly, addSavedLeaderFormula, deleteSavedLeaderFormula, addSavedRigPreset, deleteSavedRigPreset, addSavedRiver, savedFlies, savedLeaderFormulas, savedRigPresets, savedRivers, users, activeUserId, sessions, experiments, groups, groupMemberships, competitions, competitionGroups, competitionSessions, competitionParticipants, competitionAssignments, upsertCompetitionAssignment } = useAppStore();
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
  const [competitionRequiresMeasurement, setCompetitionRequiresMeasurement] = useState(true);
  const [competitionLengthUnit, setCompetitionLengthUnit] = useState<CompetitionLengthUnit>('mm');
  const [selectedSharedGroupId, setSelectedSharedGroupId] = useState<number | null>(null);
  const [practiceMeasurementEnabled, setPracticeMeasurementEnabled] = useState(false);
  const [practiceLengthUnit, setPracticeLengthUnit] = useState<'in' | 'cm' | 'mm'>('in');
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<number | null>(null);
  const [selectedCompetitionAssignmentId, setSelectedCompetitionAssignmentId] = useState<number | null>(null);
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
  const selectedCompetitionAssignments = useMemo(
    () =>
      competitionAssignments.filter(
        (assignment) =>
          assignment.userId === activeUserId && assignment.competitionId === selectedCompetitionId
      ),
    [activeUserId, competitionAssignments, selectedCompetitionId]
  );
  const selectedCompetitionAssignment = useMemo(
    () =>
      selectedCompetitionAssignments.find((assignment) => assignment.id === selectedCompetitionAssignmentId) ??
      selectedCompetitionAssignments[0] ??
      null,
    [selectedCompetitionAssignmentId, selectedCompetitionAssignments]
  );
  const selectedCompetitionGroup = useMemo(
    () =>
      competitionGroups.find(
        (group) => group.id === selectedCompetitionAssignment?.competitionGroupId
      ) ?? null,
    [competitionGroups, selectedCompetitionAssignment?.competitionGroupId]
  );
  const selectedCompetitionSession = useMemo(
    () =>
      competitionSessions.find(
        (session) => session.id === selectedCompetitionAssignment?.competitionSessionId
      ) ?? null,
    [competitionSessions, selectedCompetitionAssignment?.competitionSessionId]
  );
  const selectedCompetitionAssignmentLabel = useMemo(() => {
    if (!selectedCompetitionAssignment || !selectedCompetitionGroup || !selectedCompetitionSession) return '';
    return `Session ${selectedCompetitionSession.sessionNumber} • Group ${selectedCompetitionGroup.label} • ${selectedCompetitionAssignment.beat}`;
  }, [selectedCompetitionAssignment, selectedCompetitionGroup, selectedCompetitionSession]);

  React.useEffect(() => {
    if (!joinedGroups.length) return;
    setSelectedSharedGroupId((current) => (current && joinedGroups.some((group) => group.id === current) ? current : joinedGroups[0].id));
  }, [joinedGroups]);

  React.useEffect(() => {
    if (!joinedCompetitions.length || selectedCompetitionId) return;
    setSelectedCompetitionId(joinedCompetitions[0].id);
  }, [joinedCompetitions, selectedCompetitionId]);

  React.useEffect(() => {
    if (!selectedCompetitionAssignments.length) {
      setSelectedCompetitionAssignmentId(null);
      return;
    }
    setSelectedCompetitionAssignmentId((current) =>
      current && selectedCompetitionAssignments.some((assignment) => assignment.id === current)
        ? current
        : selectedCompetitionAssignments[0].id
    );
  }, [selectedCompetitionAssignments]);

  const saveRiver = async () => {
    const normalizedRiverName = riverName.trim();
    if (!normalizedRiverName) return;
    if (savedRivers.some((river) => river.name.trim().toLowerCase() === normalizedRiverName.toLowerCase())) return;
    await addSavedRiver(normalizedRiverName);
  };

  const plannedDurationMinutes = useMemo(() => {
    if (mode === 'experiment') return undefined;
    if (mode === 'competition') {
      if (!selectedCompetitionSession) return undefined;
      const start = combineDateAndTime(new Date(), selectedCompetitionSession.startTime);
      const end = combineDateAndTime(new Date(), selectedCompetitionSession.endTime);
      if (!start || !end) return undefined;
      return Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000));
    }
    const hours = Math.max(0, Number(durationHours || '0'));
    const minutes = Math.max(0, Number(durationMinutes || '0'));
    const total = hours * 60 + minutes;
    return Number.isFinite(total) && total > 0 ? total : undefined;
  }, [durationHours, durationMinutes, mode, selectedCompetitionSession]);

  const plannedEndLabel = useMemo(() => {
    if (mode === 'experiment' || !plannedDurationMinutes) return null;
    const plannedEnd =
      mode === 'competition'
        ? selectedCompetitionSession
          ? new Date(combineDateAndTime(new Date(), selectedCompetitionSession.endTime) ?? Date.now() + plannedDurationMinutes * 60 * 1000)
          : new Date(Date.now() + plannedDurationMinutes * 60 * 1000)
        : new Date(Date.now() + plannedDurationMinutes * 60 * 1000);
    return plannedEnd.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }, [mode, plannedDurationMinutes, selectedCompetitionSession]);

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
    const competitionStartAt =
      mode === 'competition' && selectedCompetitionSession
        ? combineDateAndTime(new Date(), selectedCompetitionSession.startTime)
        : null;
    const competitionEndAt =
      mode === 'competition' && selectedCompetitionSession
        ? combineDateAndTime(new Date(), selectedCompetitionSession.endTime)
        : null;
    if (
      mode === 'competition' &&
      (!selectedCompetitionAssignment ||
        !selectedCompetitionGroup ||
        !selectedCompetitionSession ||
        !competitionStartAt ||
        !competitionEndAt ||
        new Date(competitionEndAt) <= new Date(competitionStartAt))
    ) {
      setCustomAlertError('Choose a saved competition assignment before starting the session.');
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
      competitionGroupId: mode === 'competition' ? selectedCompetitionGroup?.id : undefined,
      competitionSessionId: mode === 'competition' ? selectedCompetitionSession?.id : undefined,
      competitionAssignedGroup: mode === 'competition' ? selectedCompetitionGroup?.label : undefined,
      competitionRole: mode === 'competition' ? selectedCompetitionAssignment?.role : undefined,
      competitionBeat: mode === 'competition' ? selectedCompetitionAssignment?.beat : undefined,
      competitionSessionNumber: mode === 'competition' ? selectedCompetitionSession?.sessionNumber : undefined,
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
        competitionGroupId: selectedCompetitionGroup!.id,
        competitionSessionId: selectedCompetitionSession!.id,
        beat: selectedCompetitionAssignment!.beat,
        role: selectedCompetitionAssignment!.role,
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
        competitionGroupId: selectedCompetitionGroup!.id,
        competitionSessionId: selectedCompetitionSession!.id,
        competitionAssignedGroup: selectedCompetitionGroup!.label,
        competitionRole: selectedCompetitionAssignment!.role,
        competitionBeat: selectedCompetitionAssignment!.beat,
        competitionSessionNumber: selectedCompetitionSession!.sessionNumber,
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
        <ScreenHeader
          title={modeCopy.title}
          subtitle={modeCopy.subtitle}
          eyebrow={`Angler: ${activeUser?.name ?? 'Loading...'}`}
        />
        <SessionEnvironmentSection
          mode={mode}
          riverName={riverName}
          onRiverNameChange={setRiverName}
          savedRivers={sortedSavedRivers}
          showSavedRiverList={showSavedRiverList}
          onToggleSavedRiverList={() => setShowSavedRiverList((current) => !current)}
          onSelectSavedRiver={(name) => {
            setRiverName(name);
            setShowSavedRiverList(false);
          }}
          waterType={waterType}
          onWaterTypeChange={setWaterType}
          depthRange={depthRange}
          onDepthRangeChange={setDepthRange}
          joinedCompetitions={joinedCompetitions}
          selectedCompetitionId={selectedCompetitionId}
          onCompetitionSelect={setSelectedCompetitionId}
          competitionAssignmentOptions={selectedCompetitionAssignments.map((assignment) => {
            const group = competitionGroups.find((item) => item.id === assignment.competitionGroupId);
            const compSession = competitionSessions.find((item) => item.id === assignment.competitionSessionId);
            return {
              id: assignment.id,
              label: `Session ${compSession?.sessionNumber ?? '?'} • Group ${group?.label ?? '?'} • ${assignment.beat}`
            };
          })}
          selectedCompetitionAssignmentId={selectedCompetitionAssignment?.id ?? null}
          onCompetitionAssignmentSelect={setSelectedCompetitionAssignmentId}
          competitionAssignedGroupLabel={selectedCompetitionGroup?.label ?? ''}
          competitionBeat={selectedCompetitionAssignment?.beat ?? ''}
          competitionSessionLabel={selectedCompetitionSession ? `Session ${selectedCompetitionSession.sessionNumber} • ${selectedCompetitionSession.startTime} - ${selectedCompetitionSession.endTime}` : ''}
          competitionRole={selectedCompetitionAssignment?.role ?? 'fishing'}
          competitionRequiresMeasurement={competitionRequiresMeasurement}
          onCompetitionRequiresMeasurementChange={setCompetitionRequiresMeasurement}
          competitionLengthUnit={competitionLengthUnit}
          onCompetitionLengthUnitChange={setCompetitionLengthUnit}
        />
        <SectionCard
          title={mode === 'practice' ? 'Session Setup' : mode === 'competition' ? 'Competition Setup' : 'Journal Setup'}
          subtitle={
            mode === 'practice'
              ? 'Keep the important setup close at hand without turning this into a long form.'
              : mode === 'competition'
                ? 'Confirm the assignment, alerts, and measurement rules before the session starts.'
                : 'Capture the hypothesis and notes you want to test today.'
          }
        >
          {mode === 'practice' ? (
            <PracticeSetupSection
              rigSetup={practiceRigSetup}
              savedFlies={savedFlies}
              savedLeaderFormulas={savedLeaderFormulas}
              savedRigPresets={savedRigPresets}
              practiceMeasurementEnabled={practiceMeasurementEnabled}
              practiceLengthUnit={practiceLengthUnit}
              onRigSetupChange={setPracticeRigSetup}
              onFlyCountChange={(nextCount) =>
                setPracticeRigSetup((current) =>
                  setRigFlyCount(current, nextCount, {
                    clearPointFly: nextCount === 1 && current.assignments.length > 1
                  })
                )
              }
              onCreateFly={async (fly) => {
                const normalizedFly = { ...fly, name: fly.name.trim() };
                if (!normalizedFly.name) return;
                await addSavedFly(normalizedFly);
              }}
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
              onPracticeMeasurementEnabledChange={setPracticeMeasurementEnabled}
              onPracticeLengthUnitChange={setPracticeLengthUnit}
            />
          ) : null}
          {mode !== 'competition' && !!joinedGroups.length ? (
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
            <ReminderSettingsSection
              mode={mode}
              durationHours={durationHours}
              onDurationHoursChange={setDurationHours}
              durationMinutes={durationMinutes}
              onDurationMinutesChange={setDurationMinutes}
              plannedDurationMinutes={plannedDurationMinutes}
              plannedEndLabel={plannedEndLabel}
              alertMarkersMinutes={alertMarkersMinutes}
              onAlertMarkersChange={setAlertMarkersMinutes}
              customAlertMinute={customAlertMinute}
              onCustomAlertMinuteChange={setCustomAlertMinute}
              customAlertError={customAlertError}
              reminderValidationMessage={reminderValidationMessage}
              onAddCustomAlertMarker={addCustomAlertMarker}
              notificationSoundEnabled={notificationSoundEnabled}
              onNotificationSoundEnabledChange={setNotificationSoundEnabled}
              notificationVibrationEnabled={notificationVibrationEnabled}
              onNotificationVibrationEnabledChange={setNotificationVibrationEnabled}
            />
          ) : null}
          {reminderValidationMessage ? <StatusBanner tone="warning" text={reminderValidationMessage} /> : null}
          {customAlertError && !reminderValidationMessage ? <StatusBanner tone="error" text={customAlertError} /> : null}
          {mode === 'experiment' && !!savedHypotheses.length && (
            <>
              <AppButton
                label={showSavedHypothesisList ? 'Hide Saved Hypotheses' : 'Choose Saved Hypothesis'}
                onPress={() => setShowSavedHypothesisList((current) => !current)}
                variant="secondary"
              />
              {showSavedHypothesisList && (
                <SelectableListPanel
                  items={savedHypotheses.map((savedHypothesis) => ({
                    key: savedHypothesis,
                    label: savedHypothesis,
                    onPress: () => {
                      setHypothesis(savedHypothesis);
                      setShowSavedHypothesisList(false);
                    }
                  }))}
                />
              )}
            </>
          )}
          {mode === 'experiment' ? (
            <FormField label="Hypothesis">
              <TextInput value={hypothesis} onChangeText={setHypothesis} placeholder="Hypothesis" placeholderTextColor="#5a6c78" style={formInputStyle} />
            </FormField>
          ) : null}
          <FormField label="Session Notes">
            <TextInput value={notes} onChangeText={setNotes} placeholder="Session notes" placeholderTextColor="#5a6c78" multiline style={{ ...formInputStyle, minHeight: 96, textAlignVertical: 'top' }} />
          </FormField>
        </SectionCard>
        <AppButton label={modeCopy.button} onPress={onStart} disabled={invalidReminderMarkers.length > 0} />
      </ScrollView>
      </KeyboardDismissView>
    </ScreenBackground>
  );
};
