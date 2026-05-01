import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { KeyboardDismissView } from '@/components/KeyboardDismissView';
import { OptionChips } from '@/components/OptionChips';
import { DEPTH_RANGES, LAKE_DEPTH_RANGES } from '@/constants/options';
import { useAppStore } from './store';
import { CompetitionLengthUnit, DepthRange, SessionMode, Technique, WaterType } from '@/types/session';
import { ScreenBackground } from '@/components/ScreenBackground';
import { AppButton } from '@/components/ui/AppButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { InlineSummaryRow } from '@/components/ui/InlineSummaryRow';
import { StatusBanner } from '@/components/ui/StatusBanner';
import { SelectableListPanel } from '@/components/ui/SelectableListPanel';
import { BottomSheetSurface } from '@/components/ui/BottomSheetSurface';
import { WaterGuideDrawer } from '@/components/WaterGuideDrawer';
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
import {
  FishingStyle,
  FISHING_STYLE_OPTIONS,
  describeFishingStyleSetup,
  getFishingStyleOption,
  serializeFishingStyleNotes,
  stripFishingStyleSetupBlock
} from '@/utils/fishingStyle';

const MODE_COPY: Record<SessionMode, { title: string; subtitle: string; button: string }> = {
  experiment: {
    title: 'Experiment Session',
    subtitle: 'Set up a controlled comparison so each result stays clean and worth trusting later.',
    button: 'Begin Experiment'
  },
  practice: {
    title: 'Journal Entry',
    subtitle: 'Keep setup light, stay mobile, and log water, flies, notes, and catches while you fish.',
    button: 'Begin Journal Entry'
  },
  competition: {
    title: 'Competition Session',
    subtitle: 'Set the conditions for today’s comp-focused intel.',
    button: 'Begin Competition Session'
  }
};

const getTackleNotesPlaceholder = (style: FishingStyle) =>
  style === 'boat_trolling'
    ? 'Example: downrigger at 35 ft, 1.8 mph, pink spoon, outside weed edge'
    : 'Example: orange spinner, slow retrieve near current seam, PowerBait off bottom';

const getSetupNamePlaceholder = (style: FishingStyle) =>
  style === 'boat_trolling' ? 'Example: Pink spoon 35 ft' : 'Example: Orange spinner';

export const SessionScreen = ({ navigation, route }: any) => {
  const { theme } = useTheme();
  const layout = useResponsiveLayout();
  const { addSession, updateSessionEntry, addSavedFly, addSavedLeaderFormula, deleteSavedLeaderFormula, addSavedRigPreset, deleteSavedRigPreset, addSavedRiver, savedFlies, savedLeaderFormulas, savedRigPresets, savedRivers, users, activeUserId, sessions, catchEvents, experiments, insights, topFlyRecords, topFlyInsights, groups, groupMemberships, competitions, competitionGroups, competitionSessions, competitionParticipants, competitionAssignments, upsertCompetitionAssignment, sharedDataStatus, syncStatus, notificationPermissionStatus, authStatus, remoteSession, getGroupIntegrity } = useAppStore();
  const sessionId = route?.params?.sessionId as number | undefined;
  const routeFishingStyle = route?.params?.fishingStyle as FishingStyle | undefined;
  const existingSession = useMemo(
    () => (sessionId ? sessions.find((session) => session.id === sessionId) ?? null : null),
    [sessionId, sessions]
  );
  const mode = (existingSession?.mode ?? route?.params?.mode ?? 'experiment') as SessionMode;
  const existingFishingStyleSetup = useMemo(() => describeFishingStyleSetup(existingSession), [existingSession]);
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
  const [depthRange, setDepthRange] = useState<DepthRange>('1.5-3 ft');
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
  const [fishingStyle, setFishingStyle] = useState<FishingStyle>(routeFishingStyle ?? existingFishingStyleSetup.style ?? 'fly');
  const [tackleMethod, setTackleMethod] = useState('');
  const [setupName, setSetupName] = useState('');
  const [tackleNotes, setTackleNotes] = useState('');
  const [saveSetupForFuture, setSaveSetupForFuture] = useState(false);
  const [useSessionTimer, setUseSessionTimer] = useState(mode === 'competition');
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
  const [showSavedSetupList, setShowSavedSetupList] = useState(false);
  const [showWaterGuide, setShowWaterGuide] = useState(false);
  const [showTimerSheet, setShowTimerSheet] = useState(false);
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
  const formInputStyle = getFormInputStyle(theme);
  const lightToneSoftTextColor = theme.id === 'daylight_light' ? theme.colors.textDarkSoft : theme.colors.textSoft;
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
    setFishingStyle(existingFishingStyleSetup.style);
    setTackleMethod(existingFishingStyleSetup.method ?? '');
    setSetupName(existingFishingStyleSetup.setupName ?? '');
    setTackleNotes(existingFishingStyleSetup.tackleNotes ?? '');
    setSaveSetupForFuture(existingFishingStyleSetup.saveSetup ?? false);
    setUseSessionTimer(mode === 'competition' || !!existingSession.plannedDurationMinutes || !!existingSession.alertMarkersMinutes?.length);
    setPracticeMeasurementEnabled(existingSession.practiceMeasurementEnabled ?? false);
    setPracticeLengthUnit(existingSession.practiceLengthUnit ?? 'in');
    setSelectedCompetitionId(existingSession.competitionId ?? null);
    setSelectedCompetitionAssignmentId(existingSession.competitionAssignmentId ?? null);
    setNotificationSoundEnabled(existingSession.notificationSoundEnabled ?? true);
    setNotificationVibrationEnabled(existingSession.notificationVibrationEnabled ?? true);
    setPracticeRigSetup(existingSession.startingRigSetup ?? createDefaultRigSetup([]));
    setExperimentRigSetup(existingSession.startingRigSetup ?? createDefaultRigSetup([]));
    setNotes(existingFishingStyleSetup.journalNotes);
  }, [existingFishingStyleSetup.journalNotes, existingFishingStyleSetup.method, existingFishingStyleSetup.saveSetup, existingFishingStyleSetup.setupName, existingFishingStyleSetup.style, existingFishingStyleSetup.tackleNotes, existingSession, mode]);

  React.useEffect(() => {
    if (fishingStyle === 'fly') return;
    const option = getFishingStyleOption(fishingStyle);
    setTackleMethod((current) => current || option.methods[0] || '');
  }, [fishingStyle]);

  React.useEffect(() => {
    if (existingSession || fishingStyle !== 'boat_trolling') return;
    setWaterType('lake');
    setDepthRange((current) => (LAKE_DEPTH_RANGES.includes(current) ? current : '10-20 ft'));
  }, [existingSession, fishingStyle]);

  const selectedSharedGroups = useMemo(
    () => joinedGroups.filter((group) => selectedSharedGroupIds.includes(group.id)),
    [joinedGroups, selectedSharedGroupIds]
  );
  const shareIntentSummary = useMemo(() => describeSessionShareIntent(selectedSharedGroups), [selectedSharedGroups]);
  const savedStyleSetups = useMemo(() => {
    const setupMap = new Map<string, { setupName: string; method?: string; tackleNotes?: string }>();
    sessions.forEach((session) => {
      const setup = describeFishingStyleSetup(session);
      if (setup.style !== fishingStyle || setup.style === 'fly' || !setup.saveSetup || !setup.setupName?.trim()) return;
      const normalizedName = setup.setupName.trim().toLowerCase();
      if (!setupMap.has(normalizedName)) {
        setupMap.set(normalizedName, {
          setupName: setup.setupName.trim(),
          method: setup.method,
          tackleNotes: setup.tackleNotes
        });
      }
    });
    return [...setupMap.values()].sort((left, right) => left.setupName.localeCompare(right.setupName));
  }, [fishingStyle, sessions]);
  const environmentWaterOptions = useMemo<readonly WaterType[]>(
    () => (mode === 'practice' && fishingStyle === 'boat_trolling' ? ['lake'] : ['glide', 'lake', 'pocket water', 'pool', 'riffle', 'run']),
    [fishingStyle, mode]
  );
  const environmentDepthOptions = useMemo<readonly DepthRange[]>(
    () => (mode === 'practice' && fishingStyle === 'boat_trolling' ? LAKE_DEPTH_RANGES : DEPTH_RANGES),
    [fishingStyle, mode]
  );
  const recommendedPattern = useMemo(() => {
    const styleSessions = sessions.filter((session) => describeFishingStyleSetup(session).style === fishingStyle);
    const catchCountByMethod = new Map<string, number>();
    styleSessions.forEach((session) => {
      const setup = describeFishingStyleSetup(session);
      const method = setup.setupName || setup.method || (fishingStyle === 'fly' ? session.startingTechnique : undefined) || getFishingStyleOption(fishingStyle).methods[0] || 'Current method';
      const sessionCatchCount = catchEvents.filter((event) => event.sessionId === session.id).length;
      catchCountByMethod.set(method, (catchCountByMethod.get(method) ?? 0) + sessionCatchCount);
    });
    const bestMethod = [...catchCountByMethod.entries()].sort((left, right) => right[1] - left[1])[0] ?? null;
    const bestInsight = [...topFlyInsights, ...insights].find((insight) => insight.confidence !== 'low') ?? topFlyInsights[0] ?? insights[0] ?? null;
    if (fishingStyle === 'fly') {
      const bestFly = topFlyRecords[0];
      return {
        title: bestFly ? `Start with ${bestFly.name}` : 'Start with a proven fly and clean notes',
        confidence: bestInsight?.confidence === 'high' ? 'Strong pattern' : bestInsight?.confidence === 'medium' ? 'Moderate evidence' : 'Early signal',
        reason: bestFly
          ? `${bestFly.name} has ${bestFly.catches} catch${bestFly.catches === 1 ? '' : 'es'} across ${bestFly.casts} logged cast${bestFly.casts === 1 ? '' : 's'}.`
          : 'Pick the fly you trust most, then log water, depth, and technique so the next recommendation gets sharper.'
      };
    }
    if (fishingStyle === 'boat_trolling') {
      return {
        title: bestMethod ? `Start with ${bestMethod[0]} on lake water` : 'Start with your lake depth and boat method',
        confidence: bestMethod && bestMethod[1] >= 3 ? 'Moderate evidence' : 'Early signal',
        reason: bestMethod
          ? `${bestMethod[0]} has produced ${bestMethod[1]} logged catch${bestMethod[1] === 1 ? '' : 'es'} in boat/trolling journals.`
          : 'Track depth, speed, lure, and location so Fishing Lab can find your strongest lake pattern.'
      };
    }
    return {
      title: bestMethod ? `Start with ${bestMethod[0]}` : 'Start with the method you expect to fish most',
      confidence: bestMethod && bestMethod[1] >= 3 ? 'Moderate evidence' : 'Early signal',
      reason: bestMethod
        ? `${bestMethod[0]} has produced ${bestMethod[1]} logged catch${bestMethod[1] === 1 ? '' : 'es'} in spin/bait journals.`
        : 'Track method, structure, water, and catches so simple logs turn into useful tackle signals.'
    };
  }, [catchEvents, fishingStyle, insights, sessions, topFlyInsights, topFlyRecords]);

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
    if (mode === 'practice' && !useSessionTimer) return undefined;
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
  }, [durationHours, durationMinutes, mode, selectedCompetitionSession, useSessionTimer]);

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
    if (mode === 'practice' && !useSessionTimer) return null;
    return alertMarkersMinutes.length ? alertMarkersMinutes[0] : null;
  }, [alertMarkersMinutes, mode, useSessionTimer]);

  const invalidReminderMarkers = useMemo(
    () => (mode === 'experiment' || (mode === 'practice' && !useSessionTimer) ? [] : getInvalidReminderMarkers(alertMarkersMinutes, plannedDurationMinutes)),
    [alertMarkersMinutes, mode, plannedDurationMinutes, useSessionTimer]
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

    const savedNotes =
      mode === 'practice' && fishingStyle !== 'fly'
        ? serializeFishingStyleNotes(notes, { style: fishingStyle, method: tackleMethod, setupName, tackleNotes, saveSetup: saveSetupForFuture })
        : stripFishingStyleSetupBlock(notes);
    const sessionTimerEnabled = mode !== 'practice' || useSessionTimer;
    const sessionPayload = {
      date: mode === 'competition' ? competitionStartAt! : existingSession?.date ?? new Date().toISOString(),
      mode,
      plannedDurationMinutes: sessionTimerEnabled ? plannedDurationMinutes : undefined,
      alertIntervalMinutes: sessionTimerEnabled ? alertIntervalMinutes : null,
      alertMarkersMinutes: sessionTimerEnabled ? alertMarkersMinutes : [],
      notificationSoundEnabled: mode === 'experiment' ? undefined : sessionTimerEnabled ? notificationSoundEnabled : false,
      notificationVibrationEnabled: mode === 'experiment' ? undefined : sessionTimerEnabled ? notificationVibrationEnabled : false,
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
      startingRigSetup: mode === 'practice' && fishingStyle === 'fly' ? practiceRigSetup : mode === 'experiment' ? experimentRigSetup : undefined,
      startingTechnique: mode === 'practice' && fishingStyle === 'fly' ? startingTechnique : mode === 'experiment' ? startingTechnique : undefined,
      riverName: normalizedRiverName || undefined,
      hypothesis: hypothesis.trim() || undefined,
      notes: savedNotes
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
        notes: savedNotes
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
          fishingStyle={mode === 'practice' ? fishingStyle : 'fly'}
          waterTypeOptions={environmentWaterOptions}
          depthRangeOptions={environmentDepthOptions}
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
        {mode !== 'competition' ? (
          <SectionCard
            title="Water Guide"
            subtitle="Not sure how to fish this water? Open a quick playbook before you start logging."
          >
            <Text style={{ color: theme.colors.textSoft, lineHeight: 20 }}>
              Current selection: {waterType}. Use the guide for where fish hold, what to try first, and what details are worth logging.
            </Text>
            <AppButton label="Open Water Guide" onPress={() => setShowWaterGuide(true)} variant="ghost" />
          </SectionCard>
        ) : null}
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
          title={mode === 'practice' ? 'Setup Details' : mode === 'competition' ? 'Competition Details' : 'Experiment Details'}
          subtitle={
            mode === 'practice'
              ? 'Use these focused controls only for the pieces you want to change before starting.'
              : mode === 'competition'
                ? 'Confirm the assignment, alerts, and measurement rules before the session starts.'
                : 'Capture the hypothesis and notes you want to test today.'
          }
        >
          {mode === 'practice' ? (
            <SectionCard
              title="Fishing Style"
              subtitle={fishingStyle === 'fly' ? 'Fly fishing unlocks the full rig, fly, experiment, and competition path.' : 'This journal keeps setup lightweight for the way you are fishing today.'}
              tone="light"
            >
              <OptionChips
                label="Style"
                options={FISHING_STYLE_OPTIONS.map((option) => option.title)}
                value={getFishingStyleOption(fishingStyle).title}
                onChange={(value) => {
                  const nextStyle = FISHING_STYLE_OPTIONS.find((option) => option.title === value)?.key ?? 'fly';
                  setFishingStyle(nextStyle);
                  if (nextStyle === 'boat_trolling') {
                    setWaterType('lake');
                    setDepthRange('10-20 ft');
                  } else if (nextStyle === 'spin_bait') {
                    setDepthRange('1.5-3 ft');
                  }
                }}
              />
            </SectionCard>
          ) : null}
          {mode === 'practice' || mode === 'experiment' ? (
            <SectionCard
              title="Recommended Pattern"
              subtitle="A compact starting point from your logged history. Treat it as a suggestion, then log what actually happens."
            >
              <Text style={{ color: theme.colors.text, fontWeight: '800' }}>{recommendedPattern.title}</Text>
              <Text style={{ color: theme.colors.textSoft, lineHeight: 20 }}>{recommendedPattern.reason}</Text>
              <Text style={{ color: theme.colors.textSoft, fontWeight: '700' }}>Confidence: {recommendedPattern.confidence}</Text>
            </SectionCard>
          ) : null}
          {mode === 'experiment' || (mode === 'practice' && fishingStyle === 'fly') ? (
            <PracticeSetupSection
              title="Fishing Setup"
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
              presentationMode="setup"
            />
          ) : null}
          {mode === 'practice' && fishingStyle !== 'fly' ? (
            <SectionCard
              title="Setup Used"
              subtitle={fishingStyle === 'boat_trolling'
                ? 'Name the lake setup you are trolling so good depth, speed, lure, and location patterns are easier to repeat.'
                : 'Name the tackle setup you are using so productive lure, bait, retrieve, and structure patterns are easier to repeat.'}
              tone="light"
            >
              <OptionChips
                label="Method"
                options={getFishingStyleOption(fishingStyle).methods}
                value={tackleMethod || null}
                onChange={setTackleMethod}
              />
              {!!savedStyleSetups.length ? (
                <>
                  <AppButton
                    label={showSavedSetupList ? 'Hide Previous Setups' : 'Choose Previous Setup'}
                    onPress={() => setShowSavedSetupList((current) => !current)}
                    variant="secondary"
                  />
                  {showSavedSetupList ? (
                    <SelectableListPanel
                      items={savedStyleSetups.map((savedSetup) => ({
                        key: `${savedSetup.setupName}-${savedSetup.method ?? ''}`,
                        label: [savedSetup.setupName, savedSetup.method].filter(Boolean).join(' | '),
                        onPress: () => {
                          setSetupName(savedSetup.setupName);
                          if (savedSetup.method) setTackleMethod(savedSetup.method);
                          if (savedSetup.tackleNotes) setTackleNotes(savedSetup.tackleNotes);
                          setShowSavedSetupList(false);
                        }
                      }))}
                    />
                  ) : null}
                </>
              ) : null}
              <FormField label="Setup Name">
                <TextInput
                  value={setupName}
                  onChangeText={setSetupName}
                  placeholder={getSetupNamePlaceholder(fishingStyle)}
                  placeholderTextColor={theme.colors.inputPlaceholder}
                  style={formInputStyle}
                />
              </FormField>
              <FormField label={fishingStyle === 'boat_trolling' ? 'Depth, Speed, Lure, Or Location Notes' : 'Lure, Bait, Retrieve, Or Structure Notes'}>
                <TextInput
                  value={tackleNotes}
                  onChangeText={setTackleNotes}
                  placeholder={getTackleNotesPlaceholder(fishingStyle)}
                  placeholderTextColor={theme.colors.inputPlaceholder}
                  multiline
                  style={{ ...formInputStyle, minHeight: 72, textAlignVertical: 'top' }}
                />
              </FormField>
              <OptionChips
                label="Save For Future Journals?"
                options={['No', 'Yes'] as const}
                value={saveSetupForFuture ? 'Yes' : 'No'}
                onChange={(value) => setSaveSetupForFuture(value === 'Yes')}
              />
              <OptionChips label="Measure Fish?" options={['No', 'Yes'] as const} value={practiceMeasurementEnabled ? 'Yes' : 'No'} onChange={(value) => setPracticeMeasurementEnabled(value === 'Yes')} />
              {practiceMeasurementEnabled ? (
                <OptionChips label="Length Unit" options={['in', 'cm', 'mm'] as const} value={practiceLengthUnit} onChange={(value) => setPracticeLengthUnit(value as 'in' | 'cm' | 'mm')} />
              ) : null}
            </SectionCard>
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
          {mode === 'competition' ? (
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
          ) : mode === 'practice' ? (
            <SectionCard
              title="Fishing Timer"
              subtitle="Leave this off when you only want a simple journal entry. Turn it on when elapsed time and reminders help."
              tone="light"
            >
              <OptionChips
                label="Use Fishing Timer?"
                options={['No', 'Yes'] as const}
                value={useSessionTimer ? 'Yes' : 'No'}
                onChange={(value) => {
                  const enabled = value === 'Yes';
                  setUseSessionTimer(enabled);
                  if (enabled && !alertMarkersMinutes.length) {
                    setAlertMarkersMinutes([15]);
                  }
                  if (!enabled) {
                    setShowTimerSheet(false);
                    setAlertMarkersMinutes([]);
                    setCustomAlertError('');
                  }
                }}
              />
              {useSessionTimer ? (
                <>
                  <InlineSummaryRow
                    label="Duration"
                    value={`${durationHours || '0'}h ${durationMinutes || '0'}m`}
                    tone="light"
                  />
                  <InlineSummaryRow
                    label="Reminders"
                    value={alertMarkersMinutes.length ? alertMarkersMinutes.map((minute) => `${minute} min`).join(', ') : 'None set'}
                    tone="light"
                  />
                  <AppButton label="Edit Timer" onPress={() => setShowTimerSheet(true)} variant="secondary" />
                </>
              ) : (
                <Text style={{ color: lightToneSoftTextColor, lineHeight: 20 }}>
                  Timer controls stay hidden so the setup remains focused on water, style, and logging catches.
                </Text>
              )}
            </SectionCard>
          ) : null}
          {(mode === 'competition' || useSessionTimer) && reminderValidationMessage ? <StatusBanner tone="warning" text={reminderValidationMessage} /> : null}
          {(mode === 'competition' || useSessionTimer) && customAlertError && !reminderValidationMessage ? <StatusBanner tone="error" text={customAlertError} /> : null}
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
                  ? 'Resume Journal Entry'
                  : 'Resume Competition Session'
              : modeCopy.button
          }
          onPress={onStart}
          disabled={invalidReminderMarkers.length > 0}
        />
      </ScrollView>
      </KeyboardDismissView>
      <WaterGuideDrawer
        visible={showWaterGuide}
        waterType={waterType}
        onSelectWaterType={setWaterType}
        onClose={() => setShowWaterGuide(false)}
      />
      <BottomSheetSurface
        visible={showTimerSheet}
        title="Fishing Timer"
        subtitle="Set a planned duration and reminder markers only when timing helps this journal entry."
        onClose={() => setShowTimerSheet(false)}
      >
        <ReminderSettingsSection
          mode="practice"
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
        <AppButton label="Done" onPress={() => setShowTimerSheet(false)} />
      </BottomSheetSurface>
    </ScreenBackground>
  );
};
