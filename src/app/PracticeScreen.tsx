import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { ScreenBackground } from '@/components/ScreenBackground';
import { OptionChips } from '@/components/OptionChips';
import { DepthSelector } from '@/components/DepthSelector';
import { PracticeCatchModal } from '@/components/PracticeCatchModal';
import { RigFlyManager } from '@/components/RigFlyManager';
import { RigSetupPanel } from '@/components/RigSetupPanel';
import { TECHNIQUES, WATER_TYPES } from '@/constants/options';
import { useAppStore } from './store';
import { useSessionTimer } from '@/hooks/useSessionTimer';
import { FlySetup } from '@/types/fly';
import { FishSpecies } from '@/types/experiment';
import { RigSetup } from '@/types/rig';
import { Technique } from '@/types/session';
import { applyRigPresetToRig, createDefaultRigSetup, setRigFlyCount } from '@/utils/rigSetup';
import { buildSessionSegmentUpdatePayload, buildSessionUpdatePayload, getSessionPlannedDurationMinutes } from '@/utils/sessionState';
import { useSessionAlerts } from '@/hooks/useSessionAlerts';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { InlineSummaryRow } from '@/components/ui/InlineSummaryRow';
import { StatusBanner } from '@/components/ui/StatusBanner';
import { AppButton } from '@/components/ui/AppButton';
import { BottomSheetSurface } from '@/components/ui/BottomSheetSurface';
import { useTheme } from '@/design/theme';
import { useResponsiveLayout } from '@/design/layout';
import { formatSharedBackendError, getPendingSyncFeedback, getPendingSyncFeedbackTone } from '@/utils/syncFeedback';
import { DictationHelpModal } from '@/components/DictationHelpModal';
import { WaterGuideDrawer } from '@/components/WaterGuideDrawer';
import { buildFieldActionFeedback, FieldFeedback } from '@/utils/fieldFeedback';
import { describeFishingStyleSetup, getFishingStyleForSession } from '@/utils/fishingStyle';
import { getRecommendedSpeciesForStyle, getRecentCatchSpecies } from '@/utils/fishSpecies';

type SetupSheetKey = 'technique' | 'leader' | 'rigging' | 'flies' | null;

export const PracticeScreen = ({ route, navigation }: any) => {
  const { theme } = useTheme();
  const layout = useResponsiveLayout();
  const sessionId = route?.params?.sessionId as number;
  const {
    sessions,
    sessionSegments,
    catchEvents,
    savedFlies,
    savedLeaderFormulas,
    savedRigPresets,
    activeUserId,
    addSavedFly,
    addSavedLeaderFormula,
    deleteSavedLeaderFormula,
    addSavedRigPreset,
    deleteSavedRigPreset,
    updateSessionEntry,
    addSessionSegment,
    updateSessionSegmentEntry,
    addCatchEvent,
    setActiveOuting,
    clearActiveOuting,
    showDictationHelpInSessions,
    notificationPermissionStatus,
    remoteSession,
    sharedDataStatus,
    syncStatus
  } = useAppStore();
  const session = sessions.find((candidate) => candidate.id === sessionId) ?? null;
  const [isBootstrappingSegment, setIsBootstrappingSegment] = useState(false);
  const [pendingCatchFly, setPendingCatchFly] = useState<FlySetup | null>(null);
  const [pendingGeneralCatch, setPendingGeneralCatch] = useState(false);
  const [pendingCatchSpecies, setPendingCatchSpecies] = useState<FishSpecies | null>(null);
  const [pendingCatchLength, setPendingCatchLength] = useState('');
  const [isSavingCatch, setIsSavingCatch] = useState(false);
  const [activeSetupSheet, setActiveSetupSheet] = useState<SetupSheetKey>(null);
  const [showWaterGuide, setShowWaterGuide] = useState(false);
  const [reviewPromptShown, setReviewPromptShown] = useState(false);
  const [fieldFeedback, setFieldFeedback] = useState<FieldFeedback | null>(null);
  const catchSubmitLockedRef = useRef(false);
  const [showDictationHelp, setShowDictationHelp] = useState(false);
  const syncFeedback = remoteSession ? getPendingSyncFeedback(syncStatus, 'practice', 'practice') : null;
  const activeSegment = useMemo(
    () =>
      sessionSegments
        .filter((segment) => segment.sessionId === sessionId)
        .sort((left, right) => new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime())
        .find((segment) => !segment.endedAt) ?? null,
    [sessionId, sessionSegments]
  );
  const [nextWaterType, setNextWaterType] = useState(session?.waterType ?? 'run');
  const [nextDepthRange, setNextDepthRange] = useState(session?.depthRange ?? '1.5-3 ft');
  const recentCatches = useMemo(
    () => catchEvents.filter((event) => event.sessionId === sessionId).slice(0, 12),
    [catchEvents, sessionId]
  );
  const topSessionSpecies = useMemo(() => {
    const counts = new Map<string, number>();
    recentCatches.forEach((event) => {
      if (!event.species) return;
      counts.set(event.species, (counts.get(event.species) ?? 0) + 1);
    });
    return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;
  }, [recentCatches]);
  const lastLoggedSpecies = useMemo<FishSpecies | null>(() => {
    const species = catchEvents
      .filter((event) => event.sessionId === sessionId && !!event.species)
      .sort((left, right) => new Date(right.caughtAt).getTime() - new Date(left.caughtAt).getTime())[0]?.species;
    return species ?? null;
  }, [catchEvents, sessionId]);
  const recentPracticeSpecies = useMemo(() => getRecentCatchSpecies(catchEvents), [catchEvents]);
  const timer = useSessionTimer({
    startedAt: session?.startAt ?? session?.date ?? new Date().toISOString(),
    endedAt: session?.endedAt,
    plannedDurationMinutes: getSessionPlannedDurationMinutes(session),
    alertIntervalMinutes: session?.alertIntervalMinutes,
    alertMarkersMinutes: session?.alertMarkersMinutes
  });
  useSessionAlerts(session, timer.activeAlertMinute);

  useEffect(() => {
    if (!session || session.mode !== 'practice' || activeSegment || isBootstrappingSegment) return;
    setIsBootstrappingSegment(true);
    const seededRigSetup = session.startingRigSetup ?? createDefaultRigSetup([]);
    addSessionSegment({
      sessionId: session.id,
      mode: 'practice',
      riverName: session.riverName,
      waterType: session.waterType,
      depthRange: session.depthRange,
      startedAt: new Date().toISOString(),
      rigSetup: seededRigSetup,
      flySnapshots: seededRigSetup.assignments.map((assignment) => assignment.fly),
      technique: session.startingTechnique,
      notes: session.notes
    }).finally(() => setIsBootstrappingSegment(false));
  }, [activeSegment, addSessionSegment, isBootstrappingSegment, session]);

  useEffect(() => {
    if (!activeSegment) return;
    setNextWaterType(activeSegment.waterType);
    setNextDepthRange(activeSegment.depthRange);
  }, [activeSegment]);

  const finalizePracticeSession = async (targetSession: NonNullable<typeof session>, endedAt: string) => {
    if (activeSegment) {
      await updateSessionSegmentEntry(activeSegment.id, buildSessionSegmentUpdatePayload(activeSegment, { endedAt }));
    }
    await updateSessionEntry(targetSession.id, buildSessionUpdatePayload(targetSession, { endedAt }));
  };

  useEffect(() => {
    if (!session || session.endedAt || reviewPromptShown) return;
    if (timer.remainingSeconds !== 0) return;
    const activeSession = session;

    setReviewPromptShown(true);
    const endedAt = new Date().toISOString();
    const finishAndPrompt = async () => {
      await finalizePracticeSession(activeSession, endedAt);
      Alert.alert('Journal timer complete', 'Your planned journal time is up. Review this entry now, or come back from History later.', [
        { text: 'Later', style: 'cancel' },
        {
          text: 'Review Session',
          onPress: () => navigation.navigate('PracticeReview', { sessionId: activeSession.id })
        }
      ]);
    };

    finishAndPrompt().catch((error) => {
      setReviewPromptShown(false);
      Alert.alert('Unable to finish journal entry', formatSharedBackendError(error, 'practice'));
    });
  }, [finalizePracticeSession, navigation, reviewPromptShown, session, timer.remainingSeconds]);

  useEffect(() => {
    if (!session || session.endedAt) {
      clearActiveOuting().catch(() => undefined);
      return;
    }
    setActiveOuting({
      mode: session.mode,
      targetRoute: 'Practice',
      sessionId: session.id,
      lastActiveAt: new Date().toISOString()
    }).catch(() => undefined);
  }, [clearActiveOuting, session, setActiveOuting, activeSegment?.id]);

  const currentRigSetup = activeSegment?.rigSetup ?? createDefaultRigSetup(activeSegment?.flySnapshots ?? []);
  const activeTechnique = activeSegment?.technique ?? session?.startingTechnique;
  const fishingStyle = getFishingStyleForSession(session);
  const fishingStyleSetup = describeFishingStyleSetup(session);
  const isFlyJournal = fishingStyle === 'fly';
  const nonFlySignalLabel = fishingStyle === 'boat_trolling' ? 'Boat Signal' : 'Tackle Signal';
  const nonFlySignalHint =
    fishingStyle === 'boat_trolling'
      ? 'Keep logging species, depth, speed, and lure notes so Fishing Lab can compare productive passes instead of only counting fish.'
      : 'Keep logging species, lure or bait, retrieve, and water notes so Fishing Lab can compare what worked across banks, structure, and conditions.';
  const leaderSummary = currentRigSetup.leaderFormulaName ?? (currentRigSetup.leaderFormulaSectionsSnapshot.length ? 'Custom leader' : 'Not chosen');
  const rigSummary = `${currentRigSetup.assignments.length} ${currentRigSetup.assignments.length === 1 ? 'fly' : 'flies'} | ${currentRigSetup.assignments.map((assignment) => assignment.position).join(' | ')}`;
  const flySummary = currentRigSetup.assignments.length
    ? currentRigSetup.assignments
        .map((assignment) => `${assignment.position}: ${assignment.fly.name.trim() || 'No fly selected'}`)
        .join(' | ')
    : 'No flies selected yet';

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

  if (!session) {
    return (
      <ScreenBackground>
        <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
          <Text style={{ color: theme.colors.text, textAlign: 'center' }}>Journal entry not found.</Text>
        </View>
      </ScreenBackground>
    );
  }

  const changeWater = async () => {
    if (!activeSegment) return;
    const endedAt = new Date().toISOString();
    await updateSessionSegmentEntry(activeSegment.id, buildSessionSegmentUpdatePayload(activeSegment, { endedAt }));
    await addSessionSegment({
      sessionId: session.id,
      mode: 'practice',
      riverName: session.riverName,
      waterType: nextWaterType,
      depthRange: nextDepthRange,
      startedAt: endedAt,
      rigSetup: currentRigSetup,
      flySnapshots: currentRigSetup.assignments.map((assignment) => assignment.fly),
      technique: activeTechnique,
      notes: activeSegment.notes
    });
    setFieldFeedback(
      buildFieldActionFeedback({
        action: `Water changed to ${nextWaterType}`,
        hasRemoteSession: !!remoteSession,
        sharedDataStatus,
        syncStatus,
        entityLabel: 'practice'
      })
    );
  };

  const updateActiveSegment = async (nextRigSetup: RigSetup) => {
    if (!activeSegment) return;
    const nextFlies = nextRigSetup.assignments.map((assignment) => assignment.fly);
    await updateSessionSegmentEntry(activeSegment.id, buildSessionSegmentUpdatePayload(activeSegment, { rigSetup: nextRigSetup, flySnapshots: nextFlies }));
    setFieldFeedback(
      buildFieldActionFeedback({
        action: 'Rig updated',
        hasRemoteSession: !!remoteSession,
        sharedDataStatus,
        syncStatus,
        entityLabel: 'practice'
      })
    );
  };

  const updateActiveTechnique = async (nextTechnique: Technique) => {
    if (!activeSegment) return;
    await updateSessionSegmentEntry(activeSegment.id, buildSessionSegmentUpdatePayload(activeSegment, { technique: nextTechnique }));
    setFieldFeedback(
      buildFieldActionFeedback({
        action: `Technique changed to ${nextTechnique}`,
        hasRemoteSession: !!remoteSession,
        sharedDataStatus,
        syncStatus,
        entityLabel: 'practice'
      })
    );
  };

  const confirmPracticeCatch = async () => {
    if (catchSubmitLockedRef.current || (!pendingCatchFly && !pendingGeneralCatch) || !pendingCatchSpecies) return;
    if (!activeSegment) {
      setFieldFeedback({
        tone: 'warning',
        text: 'Still preparing this journal entry. Try logging the catch again in a moment.'
      });
      return;
    }
    catchSubmitLockedRef.current = true;
    setIsSavingCatch(true);
    const parsedLength = Number(pendingCatchLength);
    try {
      await addCatchEvent({
        sessionId: session.id,
        segmentId: activeSegment.id,
        mode: 'practice',
        flyName: pendingCatchFly?.name,
        flySnapshot: pendingCatchFly ?? undefined,
        species: pendingCatchSpecies,
        lengthValue:
          session.practiceMeasurementEnabled && Number.isFinite(parsedLength) && parsedLength > 0 ? parsedLength : undefined,
        lengthUnit: session.practiceLengthUnit ?? 'in',
        caughtAt: new Date().toISOString(),
        notes: pendingGeneralCatch ? [fishingStyleSetup.styleLabel, fishingStyleSetup.method, fishingStyleSetup.tackleNotes].filter(Boolean).join(' | ') : undefined
      });
      setPendingCatchFly(null);
      setPendingGeneralCatch(false);
      setPendingCatchSpecies(null);
      setPendingCatchLength('');
      setFieldFeedback(
        buildFieldActionFeedback({
          action: 'Fish logged',
          hasRemoteSession: !!remoteSession,
          sharedDataStatus,
          syncStatus,
          entityLabel: 'practice'
        })
      );
    } catch (error) {
      setFieldFeedback({
        tone: 'warning',
        text: 'Catch was not saved. Your journal stayed open, so try again when the connection settles.'
      });
      throw error;
    } finally {
      catchSubmitLockedRef.current = false;
      setIsSavingCatch(false);
    }
  };

  const endSessionEarly = () => {
    if (!session || session.endedAt) return;

    Alert.alert('End Journal Entry Early?', 'This will stop the timer and cancel any remaining reminders for this journal entry.', [
      { text: 'Keep Fishing', style: 'cancel' },
        {
              text: 'End Entry',
          style: 'destructive',
          onPress: async () => {
            const endedAt = new Date().toISOString();
            await finalizePracticeSession(session, endedAt);
            Alert.alert('Journal entry ended', 'Review this entry now, or come back from History later.', [
              { text: 'Later', style: 'cancel' },
              {
                text: 'Review Session',
                onPress: () => navigation.navigate('PracticeReview', { sessionId: session.id })
              }
            ]);
        }
      }
    ]);
  };

  const renderSetupSummaryCard = ({
    title,
    subtitle,
    summaryTitle,
    summaryText,
    buttonLabel,
    sheetKey
  }: {
    title: string;
    subtitle: string;
    summaryTitle: string;
    summaryText: string;
    buttonLabel: string;
    sheetKey: Exclude<SetupSheetKey, null>;
  }) => (
    <SectionCard title={title} subtitle={subtitle}>
      <View
        style={{
          gap: 8,
          borderRadius: theme.radius.md,
          padding: 12,
          backgroundColor: theme.colors.surfaceAlt,
          borderWidth: 1,
          borderColor: theme.colors.border
        }}
      >
        <Text style={{ color: theme.colors.text, fontWeight: '800' }}>{summaryTitle}</Text>
        <Text style={{ color: theme.colors.textSoft, lineHeight: 20 }}>{summaryText}</Text>
        <AppButton label={buttonLabel} onPress={() => setActiveSetupSheet(sheetKey)} variant="ghost" />
      </View>
    </SectionCard>
  );

  return (
    <ScreenBackground>
      <ScrollView style={{ flex: 1, minHeight: 0 }} contentContainerStyle={layout.buildScrollContentStyle({ gap: 12 })}>
        <ScreenHeader
          title="Journal Entry"
          subtitle="Stay light, change water fast, and log what is producing without breaking your rhythm."
          eyebrow={session.riverName ?? 'On-Water Workflow'}
        />
        {syncFeedback ? <StatusBanner tone={getPendingSyncFeedbackTone(syncStatus)} text={syncFeedback} /> : null}
        {fieldFeedback ? <StatusBanner tone={fieldFeedback.tone} text={fieldFeedback.text} /> : null}

        {timer.activeAlertMinute ? (
          <StatusBanner tone="warning" text={`Time marker: ${timer.activeAlertMinute} minutes into your journal entry.`} />
        ) : null}
        {notificationPermissionStatus === 'denied' ? (
          <StatusBanner tone="info" text="Phone notifications are off on this device, so reminder banners will only appear while the app is open." />
        ) : null}

        <SectionCard title="Journal Timer" subtitle="Keep timing, reminders, and catch measuring in one glance.">
            <Text style={{ color: theme.colors.text }}>Elapsed: {timer.elapsedLabel}</Text>
          {timer.remainingLabel ? <Text style={{ color: theme.colors.text }}>Remaining: {timer.remainingLabel}</Text> : null}
          {timer.hasEnded ? <StatusBanner tone="error" text="Session ended early." /> : null}
          {!timer.hasEnded && timer.nextAlertMinute ? <Text style={{ color: theme.colors.text }}>Next alert: {timer.nextAlertMinute} min</Text> : null}
          {session.practiceMeasurementEnabled ? (
            <Text style={{ color: theme.colors.textSoft }}>
              Measuring is on. Add length in {session.practiceLengthUnit ?? 'in'} whenever it helps your journal notes.
            </Text>
          ) : null}
          {!timer.hasEnded ? (
            <AppButton label="End Session Early" onPress={endSessionEarly} variant="danger" />
          ) : null}
          {(timer.hasEnded || timer.remainingSeconds === 0) ? (
            <AppButton label="Review Journal Entry" onPress={() => navigation.navigate('PracticeReview', { sessionId: session.id })} variant="secondary" />
          ) : null}
          {showDictationHelpInSessions ? (
            <AppButton label="Voice Commands" onPress={() => setShowDictationHelp(true)} variant="ghost" />
          ) : null}
        </SectionCard>

        <SectionCard title="Active Water" subtitle="Track the current water, then move fast when you want a new segment.">
          <Text style={{ color: theme.colors.text }}>Current water: {activeSegment?.waterType ?? session.waterType}</Text>
          <Text style={{ color: theme.colors.text }}>Current depth: {activeSegment?.depthRange ?? session.depthRange}</Text>
          <AppButton label="Open Water Guide" onPress={() => setShowWaterGuide(true)} variant="ghost" />
          <OptionChips label="Next Water Type" options={WATER_TYPES} value={nextWaterType} onChange={setNextWaterType} />
          <Text style={{ color: theme.colors.text, fontWeight: '700' }}>Next Water Depth</Text>
          <DepthSelector value={nextDepthRange} onChange={setNextDepthRange} />
          <AppButton
            label="Change Water"
            onPress={() => {
              changeWater().catch((error) => {
                Alert.alert('Unable to change water', formatSharedBackendError(error, 'practice'));
              });
            }}
            disabled={timer.hasEnded}
            variant="secondary"
          />
        </SectionCard>

        {isFlyJournal ? renderSetupSummaryCard({
          title: 'Technique',
          subtitle: 'Change approach quickly as you cover different water levels in the same session.',
          summaryTitle: 'Current Technique',
          summaryText: activeTechnique ?? 'Not chosen',
          buttonLabel: 'Change Technique',
          sheetKey: 'technique'
        }) : null}

        {isFlyJournal ? renderSetupSummaryCard({
          title: 'Leader',
          subtitle: 'Adjust the current leader quickly without burying the practice flow under setup controls.',
          summaryTitle: 'Current Leader',
          summaryText: leaderSummary,
          buttonLabel: 'Change Leader',
          sheetKey: 'leader'
        }) : null}

        {isFlyJournal ? renderSetupSummaryCard({
          title: 'Rigging',
          subtitle: 'Adjust fly count, rig preset, or tippet details in one focused step.',
          summaryTitle: 'Current Rigging',
          summaryText: rigSummary,
          buttonLabel: 'Change Rigging',
          sheetKey: 'rigging'
        }) : null}

        {isFlyJournal ? renderSetupSummaryCard({
          title: 'Flies',
          subtitle: 'Swap or add flies without pushing timer and catch logging off screen.',
          summaryTitle: 'Current Flies',
          summaryText: flySummary,
          buttonLabel: 'Change Flies',
          sheetKey: 'flies'
        }) : null}

        {!isFlyJournal ? (
          <SectionCard title="Tackle Setup" subtitle="Lightweight setup for the fishing style you chose.">
            <Text style={{ color: theme.colors.text }}>Style: {fishingStyleSetup.styleLabel}</Text>
            <Text style={{ color: theme.colors.text }}>Method: {fishingStyleSetup.method ?? 'Not set'}</Text>
            {fishingStyleSetup.tackleNotes ? (
              <Text style={{ color: theme.colors.textSoft, lineHeight: 20 }}>{fishingStyleSetup.tackleNotes}</Text>
            ) : (
              <Text style={{ color: theme.colors.textSoft }}>No tackle notes added yet.</Text>
            )}
          </SectionCard>
        ) : null}

        {!isFlyJournal ? (
          <SectionCard
            title={nonFlySignalLabel}
            subtitle="Simple logging still creates useful patterns when the method, species, and water context stay connected."
            tone="light"
          >
            <InlineSummaryRow label="Catches This Entry" value={`${recentCatches.length}`} tone="light" />
            <InlineSummaryRow label="Current Method" value={fishingStyleSetup.method ?? 'Not set'} valueMuted={!fishingStyleSetup.method} tone="light" />
            <InlineSummaryRow label="Best Early Species" value={topSessionSpecies ?? 'Need a few catches'} valueMuted={!topSessionSpecies} tone="light" />
            <Text style={{ color: theme.colors.textDarkSoft, lineHeight: 20 }}>{nonFlySignalHint}</Text>
          </SectionCard>
        ) : null}

        <SectionCard title="Log Catches" subtitle="Quick tap logging stays front and center while you practice.">
          {!isFlyJournal ? (
            <AppButton
              label="Log Catch"
              onPress={() => {
                setPendingGeneralCatch(true);
                setPendingCatchSpecies(lastLoggedSpecies);
                setPendingCatchLength('');
              }}
              disabled={timer.hasEnded}
              variant="tertiary"
            />
          ) : !currentRigSetup.assignments.length ? (
            <Text style={{ color: theme.colors.textSoft }}>Add flies to the rig before logging practice catches.</Text>
          ) : (
            currentRigSetup.assignments.map((assignment, index) => (
              <View
                key={`${assignment.position}-${assignment.fly.name}-${index}`}
                style={{ backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radius.md, padding: 12, gap: 8, borderWidth: 1, borderColor: theme.colors.border }}
              >
                <Text style={{ color: theme.colors.text, fontWeight: '800' }}>
                  {assignment.position}: {assignment.fly.name} #{assignment.fly.hookSize} {assignment.fly.beadColor} {assignment.fly.beadSizeMm}
                </Text>
                <AppButton
                  label="Log Catch"
                  onPress={() => {
                    setPendingCatchFly(assignment.fly);
                    setPendingCatchSpecies(lastLoggedSpecies);
                    setPendingCatchLength('');
                  }}
                  disabled={timer.hasEnded}
                  variant="tertiary"
                />
              </View>
            ))
          )}
        </SectionCard>

        <SectionCard title="Recent Catches" subtitle="A quick read on what has connected lately." tone="light">
          {!recentCatches.length ? (
            <Text style={{ color: theme.colors.textDarkSoft }}>No catches logged yet in this journal entry.</Text>
          ) : (
            recentCatches.map((event) => (
              <Text key={event.id} style={{ color: theme.colors.textDarkSoft }}>
                {new Date(event.caughtAt).toLocaleTimeString()} - {event.flyName || fishingStyleSetup.method || 'Catch'}{event.species ? ` - ${event.species}` : ''}
              </Text>
            ))
          )}
        </SectionCard>
      </ScrollView>
        <BottomSheetSurface
          visible={activeSetupSheet !== null}
          title={
            activeSetupSheet === 'technique'
              ? 'Change Technique'
              : activeSetupSheet === 'leader'
              ? 'Change Leader'
              : activeSetupSheet === 'rigging'
                ? 'Change Rigging'
                : 'Change Flies'
          }
          subtitle={
            activeSetupSheet === 'technique'
              ? 'Switch methods quickly without slowing down the active journal entry.'
              : activeSetupSheet === 'leader'
              ? 'Update the active segment leader in the foreground, then return right to practice.'
              : activeSetupSheet === 'rigging'
                ? 'Adjust rig count, preset, and tippet details without interrupting catch logging.'
                : 'Replace flies or fill empty slots in one focused editor.'
          }
          onClose={() => setActiveSetupSheet(null)}
        >
          <View style={{ gap: 12 }}>
            {activeSetupSheet === 'technique' ? (
              <SectionCard title="Technique" subtitle="Use the same active session and switch methods without leaving the water flow." tone="modal">
                <OptionChips
                  label="Technique"
                  options={TECHNIQUES}
                  value={activeTechnique ?? null}
                  onChange={(value) => {
                    updateActiveTechnique(value as Technique).catch((error) => {
                      Alert.alert('Unable to change technique', formatSharedBackendError(error, 'practice'));
                    });
                  }}
                  tone="modal"
                />
              </SectionCard>
            ) : null}
            {activeSetupSheet === 'leader' ? (
              <RigSetupPanel
                title="Leader"
                rigSetup={currentRigSetup}
                flyCount={currentRigSetup.assignments.length}
                editMode="leader"
                forceEditorOpen
                tone="modal"
                foregroundQuickAdd
                savedLeaderFormulas={savedLeaderFormulas}
                savedRigPresets={savedRigPresets}
                onChange={(nextRigSetup) => {
                  updateActiveSegment(nextRigSetup).catch((error) => {
                    Alert.alert('Unable to update leader', formatSharedBackendError(error, 'practice'));
                  });
                }}
                onCreateLeaderFormula={saveLeaderFormula}
                onCreateRigPreset={saveRigPreset}
                onApplyRigPreset={(preset) => {
                  updateActiveSegment(applyRigPresetToRig(currentRigSetup, preset, { clearSinglePointFly: preset.flyCount === 1 })).catch((error) => {
                    Alert.alert('Unable to apply rig preset', formatSharedBackendError(error, 'practice'));
                  });
                }}
                onDeleteLeaderFormula={deleteSavedLeaderFormula}
                onDeleteRigPreset={deleteSavedRigPreset}
              />
            ) : null}
            {activeSetupSheet === 'rigging' ? (
              <RigSetupPanel
                title="Rigging"
                rigSetup={currentRigSetup}
                flyCount={currentRigSetup.assignments.length}
                onFlyCountChange={(nextCount) => {
                  updateActiveSegment(
                    setRigFlyCount(currentRigSetup, nextCount, {
                      clearPointFly: nextCount === 1 && currentRigSetup.assignments.length > 1
                    })
                  ).catch((error) => {
                    Alert.alert('Unable to update rigging', formatSharedBackendError(error, 'practice'));
                  });
                }}
                editMode="rig"
                forceEditorOpen
                tone="modal"
                foregroundQuickAdd
                savedLeaderFormulas={savedLeaderFormulas}
                savedRigPresets={savedRigPresets}
                onChange={(nextRigSetup) => {
                  updateActiveSegment(nextRigSetup).catch((error) => {
                    Alert.alert('Unable to update rigging', formatSharedBackendError(error, 'practice'));
                  });
                }}
                onCreateLeaderFormula={saveLeaderFormula}
                onCreateRigPreset={saveRigPreset}
                onApplyRigPreset={(preset) => {
                  updateActiveSegment(applyRigPresetToRig(currentRigSetup, preset, { clearSinglePointFly: preset.flyCount === 1 })).catch((error) => {
                    Alert.alert('Unable to apply rig preset', formatSharedBackendError(error, 'practice'));
                  });
                }}
                onDeleteLeaderFormula={deleteSavedLeaderFormula}
                onDeleteRigPreset={deleteSavedRigPreset}
              />
            ) : null}
            {activeSetupSheet === 'flies' ? (
              <RigFlyManager
                title="Fly Assignments"
                rigSetup={currentRigSetup}
                savedFlies={savedFlies}
                onChange={(nextRigSetup) => {
                  updateActiveSegment(nextRigSetup).catch((error) => {
                    Alert.alert('Unable to update flies', formatSharedBackendError(error, 'practice'));
                  });
                }}
                onCreateFly={saveFlyToLibrary}
                tone="modal"
                editorOnly
                foregroundQuickAdd
              />
            ) : null}
            <AppButton label="Done" onPress={() => setActiveSetupSheet(null)} />
          </View>
        </BottomSheetSurface>
      <PracticeCatchModal
        visible={pendingCatchFly !== null || pendingGeneralCatch}
        title={pendingGeneralCatch ? 'Log Catch' : `Log catch for ${pendingCatchFly?.name ?? 'Fly'}`}
        selectedSpecies={pendingCatchSpecies}
        recommendedSpecies={getRecommendedSpeciesForStyle(fishingStyle)}
        recentSpecies={recentPracticeSpecies}
        measurementEnabled={session.practiceMeasurementEnabled}
        lengthUnit={session.practiceLengthUnit ?? 'in'}
        selectedLength={pendingCatchLength}
        onSelectSpecies={setPendingCatchSpecies}
        onSelectLength={setPendingCatchLength}
        isSubmitting={isSavingCatch}
        onCancel={() => {
          if (isSavingCatch) return;
          setPendingCatchFly(null);
          setPendingGeneralCatch(false);
          setPendingCatchSpecies(null);
          setPendingCatchLength('');
        }}
        onConfirm={() => {
          confirmPracticeCatch().catch((error) => {
            Alert.alert('Unable to log catch', formatSharedBackendError(error, 'practice'));
          });
        }}
      />
      <DictationHelpModal visible={showDictationHelp} onClose={() => setShowDictationHelp(false)} />
      <WaterGuideDrawer
        visible={showWaterGuide}
        waterType={nextWaterType}
        onSelectWaterType={setNextWaterType}
        onClose={() => setShowWaterGuide(false)}
      />
    </ScreenBackground>
  );
};
