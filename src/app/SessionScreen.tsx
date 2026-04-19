import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { KeyboardDismissView } from '@/components/KeyboardDismissView';
import { OptionChips } from '@/components/OptionChips';
import { DEPTH_RANGES } from '@/constants/options';
import { useAppStore } from './store';
import { CompetitionLengthUnit, SessionMode, Technique, WaterType } from '@/types/session';
import { ScreenBackground } from '@/components/ScreenBackground';
import { AppButton } from '@/components/ui/AppButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { StatusBanner } from '@/components/ui/StatusBanner';
import { SelectableListPanel } from '@/components/ui/SelectableListPanel';
import { FormField, getFormInputStyle } from '@/components/ui/FormField';
import { useTheme } from '@/design/theme';
import { applyRigPresetToRig, createDefaultRigSetup, setRigFlyCount } from '@/utils/rigSetup';
import { getInvalidReminderMarkers, isReminderMarkerAllowed } from '@/utils/sessionReminders';
import { Group } from '@/types/group';
import { combineDateAndTime } from '@/utils/dateTime';
import { SessionEnvironmentSection } from '@/components/sessionSetup/SessionEnvironmentSection';
import { PracticeSetupSection } from '@/components/sessionSetup/PracticeSetupSection';
import { ReminderSettingsSection } from '@/components/sessionSetup/ReminderSettingsSection';
import { useResponsiveLayout } from '@/design/layout';
import { FlySetup } from '@/types/fly';
import { describeSessionShareIntent } from '@/utils/sessionSharing';

const MODE_COPY: Record<SessionMode, { title: string; subtitle: string; button: string }> = {
  experiment: {
    title: 'Experiment Session',
    subtitle: 'Set up a controlled comparison so each result stays clean and worth trusting later.',
    button: 'Begin Experiment'
  },
  practice: {
    title: 'Practice Session',
    subtitle: 'Keep setup light, stay mobile, and log quick scouting feedback while you fish.',
    button: 'Begin Practice Session'
  },
  competition: {
    title: 'Competition Session',
    subtitle: 'Set the conditions for today’s comp-focused intel.',
    button: 'Begin Competition Session'
  }
};

export const SessionScreen = ({ navigation, route }: any) => {
  const { theme } = useTheme();
  const layout = useResponsiveLayout();
  const { addSession, updateSessionEntry, addSavedFly, addSavedLeaderFormula, deleteSavedLeaderFormula, addSavedRigPreset, deleteSavedRigPreset, addSavedRiver, savedFlies, savedLeaderFormulas, savedRigPresets, savedRivers, users, activeUserId, sessions, experiments, groups, groupMemberships, competitions, competitionGroups, competitionSessions, competitionParticipants, competitionAssignments, upsertCompetitionAssignment, sharedDataStatus, syncStatus, notificationPermissionStatus, authStatus, remoteSession, getGroupIntegrity } = useAppStore();
  const sessionId = route?.params?.sessionId as number | undefined;
  const existingSession = useMemo(
    () => (sessionId ? sessions.find((session) => session.id === sessionId) ?? null : null),
    [sessionId, sessions]
  );
  const mode = (existingSession?.mode ?? route?.params?.mode ?? 'experiment') as SessionMode;
  const modeCopy = useMemo(() => {
    const baseCopy = MODE_COPY[mode] ?? MODE_COPY.experiment;
    if (mode !== 'competition') return baseCopy;
    return {
      ...baseCopy,
      subtitle: 'Keep assignment context tight so scoring and catch timing stay easy to track.'
    };
  }, [mode]);
  const isEditingExistingSession = !!existingSession;
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
  const [selectedSharedGroupIds, setSelectedSharedGroupIds] = useState<number[]>([]);
  const [startingTechnique, setStartingTechnique] = useState<Technique | undefined>(undefined);
  const [practiceMeasurementEnabled, setPracticeMeasurementEnabled] = useState(false);
  const [practiceLengthUnit, setPracticeLengthUnit] = useState<'in' | 'cm' | 'mm'>('in');
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<number | null>(null);
  const [selectedCompetitionAssignmentId, setSelectedCompetitionAssignmentId] = useState<number | null>(null);
  const [notificationSoundEnabled, setNotificationSoundEnabled] = useState(true);
  const [notificationVibrationEnabled, setNotificationVibrationEnabled] = useState(true);
  const [practiceRigSetup, setPracticeRigSetup] = useState(() => createDefaultRigSetup([]));
  const [experimentRigSetup, setExperimentRigSetup] = useState(() => createDefaultRigSetup([]));
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
  const formInputStyle = getFormInputStyle();
  const joinedGroupMemberships = useMemo(
    () => groupMemberships.filter((membership) => membership.userId === activeUserId),
    [activeUserId, groupMemberships]
  );
  const joinedGroups = useMemo(
    () =>
      joinedGroupMemberships
        .map((membership) => groups.find((group) => group.id === membership.groupId))
        .filter((group): group is Group => !!group)
        .filter((group) => getGroupIntegrity(group.id).state === 'valid'),
    [getGroupIntegrity, groups, joinedGroupMemberships]
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
    setSelectedSharedGroupIds((current) => current.filter((groupId) => joinedGroups.some((group) => group.id === groupId)));
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

  React.useEffect(() => {
    if (!existingSession) return;

    setWaterType(existingSession.waterType);
    setDepthRange(existingSession.depthRange);
    setRiverName(existingSession.riverName ?? '');
    setHypothesis(existingSession.hypothesis ?? '');
    setNotes(existingSession.notes ?? '');
    setDurationHours(
      existingSession.plannedDurationMinutes
        ? String(Math.floor(existingSession.plannedDurationMinutes / 60))
        : mode === 'competition'
          ? '3'
          : '2'
    );
    setDurationMinutes(
      existingSession.plannedDurationMinutes
        ? String(existingSession.plannedDurationMinutes % 60)
        : '0'
    );
    setAlertMarkersMinutes(existingSession.alertMarkersMinutes?.length ? existingSession.alertMarkersMinutes : [15]);
    setCompetitionRequiresMeasurement(existingSession.competitionRequiresMeasurement ?? true);
    setCompetitionLengthUnit(existingSession.competitionLengthUnit ?? 'mm');
    setSelectedSharedGroupIds(existingSession.sharedGroupIds ?? (existingSession.sharedGroupId ? [existingSession.sharedGroupId] : []));
    setStartingTechnique(existingSession.startingTechnique);
    setPracticeMeasurementEnabled(existingSession.practiceMeasurementEnabled ?? false);
    setPracticeLengthUnit(existingSession.practiceLengthUnit ?? 'in');
    setSelectedCompetitionId(existingSession.competitionId ?? null);
    setSelectedCompetitionAssignmentId(existingSession.competitionAssignmentId ?? null);
    setNotificationSoundEnabled(existingSession.notificationSoundEnabled ?? true);
    setNotificationVibrationEnabled(existingSession.notificationVibrationEnabled ?? true);
    setPracticeRigSetup(existingSession.startingRigSetup ?? createDefaultRigSetup([]));
    setExperimentRigSetup(existingSession.startingRigSetup ?? createDefaultRigSetup([]));
  }, [existingSession, mode]);

  const selectedSharedGroups = useMemo(
    () => joinedGroups.filter((group) => selectedSharedGroupIds.includes(group.id)),
    [joinedGroups, selectedSharedGroupIds]
  );
  const shareIntentSummary = useMemo(() => describeSessionShareIntent(selectedSharedGroups), [selectedSharedGroups]);

  const saveRiver = async () => {
    const normalizedRiverName = riverName.trim();
    if (!normalizedRiverName) return;
    if (savedRivers.some((river) => river.name.trim().toLowerCase() === normalizedRiverName.toLowerCase())) return;
    await addSavedRiver(normalizedRiverName);
  };

  const saveFlyToLibrary = async (fly: FlySetup) => {
    const normalizedFly = { ...fly, name: fly.name.trim() };
    if (!normalizedFly.name) return;
    await addSavedFly(normalizedFly);
  };

  const saveLeaderFormula = async (payload: { name: string; sections: { order: number; materialLabel: string; lengthFeet: number }[] }) => {
    const id = await addSavedLeaderFormula(payload);
    return {
      id,
      userId: activeUserId ?? 0,
      name: payload.name,
      sections: payload.sections,
      createdAt: new Date().toISOString()
    };
  };

  const saveRigPreset = async (payload: Parameters<typeof addSavedRigPreset>[0]) => {
    const id = await addSavedRigPreset(payload);
    return {
      id,
      userId: activeUserId ?? 0,
      ...payload,
      createdAt: new Date().toISOString()
    };
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

    const sessionPayload = {
      date: mode === 'competition' ? competitionStartAt! : existingSession?.date ?? new Date().toISOString(),
      mode,
      plannedDurationMinutes,
      alertIntervalMinutes,
      alertMarkersMinutes,
      notificationSoundEnabled: mode === 'experiment' ? undefined : notificationSoundEnabled,
      notificationVibrationEnabled: mode === 'experiment' ? undefined : notificationVibrationEnabled,
      startAt: mode === 'competition' ? competitionStartAt! : existingSession?.startAt,
      endAt: mode === 'competition' ? competitionEndAt! : existingSession?.endAt,
      endedAt: existingSession?.endedAt,
      waterType,
      depthRange,
      sharedGroupId: selectedSharedGroupIds[0] ?? undefined,
      sharedGroupIds: selectedSharedGroupIds,
      practiceMeasurementEnabled: mode === 'practice' ? practiceMeasurementEnabled : undefined,
      practiceLengthUnit: mode === 'practice' ? practiceLengthUnit : undefined,
      competitionId: mode === 'competition' ? selectedCompetitionId ?? undefined : undefined,
      competitionAssignmentId: existingSession?.competitionAssignmentId,
      competitionGroupId: mode === 'competition' ? selectedCompetitionGroup?.id : undefined,
      competitionSessionId: mode === 'competition' ? selectedCompetitionSession?.id : undefined,
      competitionAssignedGroup: mode === 'competition' ? selectedCompetitionGroup?.label : undefined,
      competitionRole: mode === 'competition' ? selectedCompetitionAssignment?.role : undefined,
      competitionBeat: mode === 'competition' ? selectedCompetitionAssignment?.beat : undefined,
      competitionSessionNumber: mode === 'competition' ? selectedCompetitionSession?.sessionNumber : undefined,
      competitionRequiresMeasurement: mode === 'competition' ? competitionRequiresMeasurement : undefined,
      competitionLengthUnit: mode === 'competition' ? competitionLengthUnit : undefined,
      startingRigSetup: mode === 'practice' ? practiceRigSetup : mode === 'experiment' ? experimentRigSetup : undefined,
      startingTechnique: mode === 'practice' || mode === 'experiment' ? startingTechnique : undefined,
      riverName: normalizedRiverName || undefined,
      hypothesis: hypothesis.trim() || undefined,
      notes
    };
    const id = existingSession ? existingSession.id : await addSession(sessionPayload);
    if (existingSession) {
      await updateSessionEntry(existingSession.id, sessionPayload);
      if (__DEV__) {
        console.info('[problem-records] session resumed and saved', { sessionId: existingSession.id, mode });
      }
    }
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
        sharedGroupId: selectedSharedGroupIds[0] ?? undefined,
        sharedGroupIds: selectedSharedGroupIds,
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
        startingTechnique: undefined,
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
        contentContainerStyle={layout.buildScrollContentStyle({ gap: 12, bottomPadding: 40 })}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <ScreenHeader
          title={isEditingExistingSession ? `Resume ${modeCopy.title}` : modeCopy.title}
          subtitle={isEditingExistingSession ? 'Finish the missing session details, then continue back into the fishing flow.' : modeCopy.subtitle}
          eyebrow={`Angler: ${activeUser?.name ?? 'Loading...'}`}
        />
        {isEditingExistingSession ? (
          <StatusBanner tone="info" text="You are resuming a saved session. Update the missing details here, then continue into the active fishing flow." />
        ) : null}
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
        {mode === 'competition' && authStatus === 'authenticating' && !remoteSession ? (
          <StatusBanner tone="info" text="Finish magic-link sign-in on this device before relying on synced competition assignments." />
        ) : null}
        {mode === 'competition' && sharedDataStatus === 'loading' ? (
          <StatusBanner tone="info" text="Loading shared competition assignments from the beta backend..." />
        ) : null}
        {mode === 'competition' && sharedDataStatus === 'error' ? (
          <StatusBanner tone="error" text={syncStatus.lastError ? `Shared assignments could not load: ${syncStatus.lastError}` : 'Shared assignments could not load right now. You can retry from Settings.'} />
        ) : null}
        {mode === 'competition' && selectedCompetitionId && !selectedCompetitionAssignments.length && sharedDataStatus === 'ready' ? (
          <StatusBanner tone="warning" text="This competition does not have a saved assignment for this angler yet. Add or review the assignment in Settings before starting the session." />
        ) : null}
        {mode === 'competition' && selectedCompetitionAssignment && (!selectedCompetitionGroup || !selectedCompetitionSession) ? (
          <StatusBanner tone="warning" text="This saved assignment is missing its synced group or session details. Open Settings, review the assignment, and sync again before starting." />
        ) : null}
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
          {mode === 'practice' || mode === 'experiment' ? (
            <PracticeSetupSection
              title={mode === 'experiment' ? 'Starting Rig Setup' : 'Starting Rig Setup'}
              rigSetup={mode === 'experiment' ? experimentRigSetup : practiceRigSetup}
              savedFlies={savedFlies}
              savedLeaderFormulas={savedLeaderFormulas}
              savedRigPresets={savedRigPresets}
              technique={startingTechnique}
              practiceMeasurementEnabled={practiceMeasurementEnabled}
              practiceLengthUnit={practiceLengthUnit}
              showMeasurementControls={mode === 'practice'}
              onRigSetupChange={mode === 'experiment' ? setExperimentRigSetup : setPracticeRigSetup}
              onTechniqueChange={setStartingTechnique}
              onFlyCountChange={(nextCount) =>
                (mode === 'experiment' ? setExperimentRigSetup : setPracticeRigSetup)((current) =>
                  setRigFlyCount(current, nextCount, {
                    clearPointFly: nextCount === 1 && current.assignments.length > 1
                  })
                )
              }
              onCreateFly={saveFlyToLibrary}
              onCreateLeaderFormula={saveLeaderFormula}
              onCreateRigPreset={saveRigPreset}
              onApplyRigPreset={(preset) => {
                (mode === 'experiment' ? setExperimentRigSetup : setPracticeRigSetup)((current) =>
                  applyRigPresetToRig(current, preset, { clearSinglePointFly: preset.flyCount === 1 })
                );
              }}
              onDeleteLeaderFormula={deleteSavedLeaderFormula}
              onDeleteRigPreset={deleteSavedRigPreset}
              onPracticeMeasurementEnabledChange={setPracticeMeasurementEnabled}
              onPracticeLengthUnitChange={setPracticeLengthUnit}
              foregroundEditing
            />
          ) : null}
          {mode !== 'competition' && !!joinedGroups.length ? (
            <View style={{ gap: 10 }}>
              <Text style={{ color: theme.colors.text, fontWeight: '800' }}>Share With Groups</Text>
              <Text style={{ color: theme.colors.textMuted }}>{shareIntentSummary}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {joinedGroups.map((group) => {
                  const selected = selectedSharedGroupIds.includes(group.id);
                  return (
                    <Pressable
                      key={group.id}
                      onPress={() =>
                        setSelectedSharedGroupIds((current) =>
                          current.includes(group.id)
                            ? current.filter((groupId) => groupId !== group.id)
                            : [...current, group.id]
                        )
                      }
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: theme.radius.pill,
                        borderWidth: 1,
                        borderColor: selected ? theme.colors.chipSelectedBorder : theme.colors.chipBorder,
                        backgroundColor: selected ? theme.colors.chipSelectedBg : theme.colors.chipBg
                      }}
                    >
                      <Text style={{ color: selected ? theme.colors.chipSelectedText : theme.colors.chipText, fontWeight: '700' }}>
                        {group.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
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
              notificationPermissionStatus={notificationPermissionStatus}
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
              <TextInput value={hypothesis} onChangeText={setHypothesis} placeholder="Hypothesis" placeholderTextColor={theme.colors.inputPlaceholder} style={formInputStyle} />
            </FormField>
          ) : null}
          <FormField label="Session Notes">
            <TextInput value={notes} onChangeText={setNotes} placeholder="Session notes" placeholderTextColor={theme.colors.inputPlaceholder} multiline style={{ ...formInputStyle, minHeight: 96, textAlignVertical: 'top' }} />
          </FormField>
        </SectionCard>
        <AppButton
          label={
            isEditingExistingSession
              ? mode === 'experiment'
                ? 'Resume Journal Entry'
                : mode === 'practice'
                  ? 'Resume Practice Session'
                  : 'Resume Competition Session'
              : modeCopy.button
          }
          onPress={onStart}
          disabled={invalidReminderMarkers.length > 0}
        />
      </ScrollView>
      </KeyboardDismissView>
    </ScreenBackground>
  );
};
