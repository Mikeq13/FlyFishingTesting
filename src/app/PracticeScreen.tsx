import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
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
  const [isFinishingSession, setIsFinishingSession] = useState(false);
  const [fieldFeedback, setFieldFeedback] = useState<FieldFeedback | null>(null);
  const catchSubmitLockedRef = useRef(false);
  const [showDictationHelp, setShowDictationHelp] = useState(false);
  const activeOutingSignatureRef = useRef<string | null>(null);
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
  const sessionTimerEnabled =
    typeof getSessionPlannedDurationMinutes(session) === 'number' ||
    typeof session?.alertIntervalMinutes === 'number' ||
    !!session?.alertMarkersMinutes?.length;
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
    if (!sessionTimerEnabled) return;
    if (timer.remainingSeconds !== 0) return;
    const activeSession = session;

    setReviewPromptShown(true);
    const endedAt = new Date().toISOString();
    const finishAndPrompt = async () => {
      await finalizePracticeSession(activeSession, endedAt);
      Alert.alert('Fishing timer complete', 'Your planned fishing time is up. Review this entry now, or come back from History later.', [
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
  }, [finalizePracticeSession, navigation, reviewPromptShown, session, sessionTimerEnabled, timer.remainingSeconds]);

  useEffect(() => {
    if (!session || session.endedAt) {
      if (activeOutingSignatureRef.current === 'cleared') return;
      activeOutingSignatureRef.current = 'cleared';
      clearActiveOuting().catch(() => undefined);
      return;
    }
    const activeOutingSignature = JSON.stringify({
      sessionId: session.id,
      mode: session.mode,
      segmentId: activeSegment?.id ?? null,
      waterType: activeSegment?.waterType ?? session.waterType,
      depthRange: activeSegment?.depthRange ?? session.depthRange,
      technique: activeSegment?.technique ?? session.startingTechnique ?? null
    });
    if (activeOutingSignatureRef.current === activeOutingSignature) return;
    activeOutingSignatureRef.current = activeOutingSignature;
    setActiveOuting({
      mode: session.mode,
      targetRoute: 'Practice',
      sessionId: session.id,
      lastActiveAt: new Date().toISOString()
    }).catch(() => undefined);
  }, [activeSegment, clearActiveOuting, session, setActiveOuting]);

  const currentRigSetup = activeSegment?.rigSetup ?? createDefaultRigSetup(activeSegment?.flySnapshots ?? []);
  const activeTechnique = activeSegment?.technique ?? session?.startingTechnique;
  const fishingStyle = getFishingStyleForSession(session);
  const fishingStyleSetup = describeFishingStyleSetup(session);
  const isFlyJournal = fishingStyle === 'fly';
  const isSpinBaitJournal = fishingStyle === 'spin_bait';
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
    if (catchSubmitLockedRef.current || (!pendingCatchFly && !pendingGeneralCatch)) return;
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
    const catchSpecies = pendingCatchSpecies ?? 'Fish';
    try {
      await addCatchEvent({
        sessionId: session.id,
        segmentId: activeSegment.id,
        mode: 'practice',
        flyName: pendingCatchFly?.name,
        flySnapshot: pendingCatchFly ?? undefined,
        species: catchSpecies,
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
    if (!session || session.endedAt || !sessionTimerEnabled) return;

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

  const finishJournalEntry = async () => {
    if (!session || isFinishingSession) return;
    setIsFinishingSession(true);
    try {
      if (!session.endedAt) {
        await finalizePracticeSession(session, new Date().toISOString());
      }
      navigation.navigate('PracticeReview', { sessionId: session.id });
    } catch (error) {
      Alert.alert('Unable to finish journal entry', formatSharedBackendError(error, 'practice'));
    } finally {
      setIsFinishingSession(false);
    }
  };

  const renderFlySetupRow = (label: string, value: string, sheetKey: Exclude<SetupSheetKey, null>) => (
    <View
      style={{
        gap: 8,
        borderRadius: theme.radius.md,
        padding: 12,
        backgroundColor: activeSetupSheet === sheetKey ? theme.colors.surfaceMuted : theme.colors.surfaceAlt,
        borderWidth: 1,
        borderColor: activeSetupSheet === sheetKey ? theme.colors.borderStrong : theme.colors.border
      }}
    >
      <View style={{ flexDirection: layout.stackDirection, gap: 8, alignItems: layout.isCompactLayout ? 'stretch' : 'center' }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ color: theme.colors.text, fontWeight: '800' }}>{label}</Text>
          <Text style={{ color: theme.colors.textSoft, lineHeight: 20 }}>{value}</Text>
        </View>
        <AppButton
          label={activeSetupSheet === sheetKey ? 'Done' : 'Edit'}
          onPress={() => setActiveSetupSheet((current) => (current === sheetKey ? null : sheetKey))}
          variant={activeSetupSheet === sheetKey ? 'secondary' : 'ghost'}
        />
      </View>
      {activeSetupSheet === sheetKey ? renderFlySetupEditor(sheetKey) : null}
    </View>
  );

  const renderFlySetupEditor = (sheetKey: Exclude<SetupSheetKey, null>) => (
    <View style={{ gap: 12 }}>
      {sheetKey === 'technique' ? (
        <View style={{ gap: 10 }}>
          <Text style={{ color: theme.colors.textSoft, lineHeight: 20 }}>Switch methods without leaving the active practice flow.</Text>
          <OptionChips
            label="Technique"
            options={TECHNIQUES}
            value={activeTechnique ?? null}
            onChange={(value) => {
              updateActiveTechnique(value as Technique).catch((error) => {
                Alert.alert('Unable to change technique', formatSharedBackendError(error, 'practice'));
              });
            }}
          />
        </View>
      ) : null}
      {sheetKey === 'leader' ? (
        <RigSetupPanel
          title="Leader"
          rigSetup={currentRigSetup}
          flyCount={currentRigSetup.assignments.length}
          editMode="leader"
          forceEditorOpen
          tone="light"
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
      {sheetKey === 'rigging' ? (
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
          tone="light"
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
      {sheetKey === 'flies' ? (
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
          tone="light"
          editorOnly
          foregroundQuickAdd
        />
      ) : null}
    </View>
  );

  const renderFlySetupCard = () => (
    <SectionCard title="Fly Setup" subtitle="Technique, leader, rigging, and flies stay compact until you need to change one thing.">
      <View
        style={{
          gap: 8,
        }}
      >
        {renderFlySetupRow('Technique', activeTechnique ?? 'Not chosen', 'technique')}
        {renderFlySetupRow('Leader', leaderSummary, 'leader')}
        {renderFlySetupRow('Rigging', rigSummary, 'rigging')}
        {renderFlySetupRow('Flies', flySummary, 'flies')}
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

        {sessionTimerEnabled && timer.activeAlertMinute ? (
          <StatusBanner tone="warning" text={`Time marker: ${timer.activeAlertMinute} minutes into your journal entry.`} />
        ) : null}
        {sessionTimerEnabled && notificationPermissionStatus === 'denied' ? (
          <StatusBanner tone="info" text="Phone notifications are off on this device, so reminder banners will only appear while the app is open." />
        ) : null}

        <SectionCard title="Practice Cockpit" subtitle="The essentials stay visible while logging stays one tap away.">
          <View
            style={{
              gap: 8,
              borderRadius: theme.radius.md,
              padding: 12,
              backgroundColor: theme.colors.surfaceMuted,
              borderWidth: 1,
              borderColor: theme.colors.border
            }}
          >
            <View style={{ flexDirection: layout.stackDirection, gap: 8 }}>
              <View style={{ flex: 1 }}>
                <InlineSummaryRow label="Water" value={activeSegment?.waterType ?? session.waterType} />
              </View>
              {!isSpinBaitJournal ? (
                <View style={{ flex: 1 }}>
                  <InlineSummaryRow label="Depth" value={activeSegment?.depthRange ?? session.depthRange} />
                </View>
              ) : null}
            </View>
            <View style={{ flexDirection: layout.stackDirection, gap: 8 }}>
              {isFlyJournal ? (
                <View style={{ flex: 1 }}>
                  <InlineSummaryRow label="Technique" value={activeTechnique ?? 'Not chosen'} valueMuted={!activeTechnique} />
                </View>
              ) : null}
              <View style={{ flex: 1 }}>
                <InlineSummaryRow label="Catches" value={`${recentCatches.length}`} />
              </View>
              {sessionTimerEnabled ? (
                <View style={{ flex: 1 }}>
                  <InlineSummaryRow label="Timer" value={timer.remainingLabel ? `${timer.elapsedLabel} elapsed` : timer.elapsedLabel} />
                </View>
              ) : null}
            </View>
            {session.practiceMeasurementEnabled ? (
              <Text style={{ color: theme.colors.textSoft, lineHeight: 20 }}>
                Measuring is on. Add length in {session.practiceLengthUnit ?? 'in'} when it helps this journal entry.
              </Text>
            ) : null}
          </View>
        </SectionCard>

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

        <SectionCard title="Quick Changes" subtitle="Change field context without hunting through setup cards.">
          <View style={{ gap: 10 }}>
            <AppButton label="Open Water Guide" onPress={() => setShowWaterGuide(true)} variant="ghost" />
            <OptionChips label="Next Water Type" options={WATER_TYPES} value={nextWaterType} onChange={setNextWaterType} />
            {!isSpinBaitJournal ? (
              <>
                <Text style={{ color: theme.colors.text, fontWeight: '700' }}>Next Water Depth</Text>
                <DepthSelector value={nextDepthRange} onChange={setNextDepthRange} />
              </>
            ) : null}
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
          </View>
        </SectionCard>

        {isFlyJournal ? renderFlySetupCard() : null}

        {!isFlyJournal ? (
          <SectionCard title="Setup Used" subtitle="Lightweight setup for the fishing style you chose.">
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
            <InlineSummaryRow
              label="Current Setup"
              value={fishingStyleSetup.method ?? 'Not set'}
              valueMuted={!fishingStyleSetup.method}
              tone="light"
            />
            <InlineSummaryRow label="Best Early Species" value={topSessionSpecies ?? 'Need a few catches'} valueMuted={!topSessionSpecies} tone="light" />
            <Text style={{ color: theme.colors.textDarkSoft, lineHeight: 20 }}>{nonFlySignalHint}</Text>
          </SectionCard>
        ) : null}

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

        <SectionCard
          title={session.endedAt ? 'Journal Entry Finished' : 'Journal Controls'}
          subtitle={
            session.endedAt
              ? 'This entry is saved and ready to review whenever you need it.'
              : sessionTimerEnabled
                ? 'Timer controls live here so logging stays cleaner above.'
                : 'Finish when you are done fishing for the day.'
          }
          tone="light"
        >
          {sessionTimerEnabled ? (
            <>
              <InlineSummaryRow label="Elapsed" value={timer.elapsedLabel} tone="light" />
              {timer.remainingLabel ? <InlineSummaryRow label="Remaining" value={timer.remainingLabel} tone="light" /> : null}
              {timer.hasEnded ? <StatusBanner tone="error" text="Session ended early." /> : null}
              {!timer.hasEnded && timer.nextAlertMinute ? (
                <Text style={{ color: theme.colors.textDarkSoft }}>Next alert: {timer.nextAlertMinute} min</Text>
              ) : null}
            </>
          ) : null}
          {sessionTimerEnabled && !timer.hasEnded && !session.endedAt ? (
            <AppButton label="End Session Early" onPress={endSessionEarly} variant="danger" surfaceTone="light" />
          ) : null}
          <AppButton
            label={session.endedAt ? 'Review Journal Entry' : isFinishingSession ? 'Finishing...' : 'Finish Journal Entry'}
            onPress={() => {
              finishJournalEntry().catch((error) => {
                Alert.alert('Unable to finish journal entry', formatSharedBackendError(error, 'practice'));
              });
            }}
            disabled={isFinishingSession}
            variant="secondary"
            surfaceTone="light"
          />
          {showDictationHelpInSessions ? (
            <AppButton label="Voice Commands" onPress={() => setShowDictationHelp(true)} variant="ghost" surfaceTone="light" />
          ) : null}
        </SectionCard>
      </ScrollView>
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
