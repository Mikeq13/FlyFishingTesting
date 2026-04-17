import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { ScreenBackground } from '@/components/ScreenBackground';
import { OptionChips } from '@/components/OptionChips';
import { DepthSelector } from '@/components/DepthSelector';
import { PracticeCatchModal } from '@/components/PracticeCatchModal';
import { RigFlyManager } from '@/components/RigFlyManager';
import { RigSetupPanel } from '@/components/RigSetupPanel';
import { WATER_TYPES } from '@/constants/options';
import { useAppStore } from './store';
import { useSessionTimer } from '@/hooks/useSessionTimer';
import { FlySetup } from '@/types/fly';
import { TroutSpecies } from '@/types/experiment';
import { RigSetup } from '@/types/rig';
import { applyRigPresetToRig, createDefaultRigSetup, setRigFlyCount } from '@/utils/rigSetup';
import { buildSessionSegmentUpdatePayload, buildSessionUpdatePayload, getSessionPlannedDurationMinutes } from '@/utils/sessionState';
import { useSessionAlerts } from '@/hooks/useSessionAlerts';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { StatusBanner } from '@/components/ui/StatusBanner';
import { AppButton } from '@/components/ui/AppButton';
import { useTheme } from '@/design/theme';

export const PracticeScreen = ({ route }: any) => {
  const { theme } = useTheme();
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
    notificationPermissionStatus
  } = useAppStore();
  const session = sessions.find((candidate) => candidate.id === sessionId) ?? null;
  const [isBootstrappingSegment, setIsBootstrappingSegment] = useState(false);
  const [pendingCatchFly, setPendingCatchFly] = useState<FlySetup | null>(null);
  const [pendingCatchSpecies, setPendingCatchSpecies] = useState<TroutSpecies | null>(null);
  const [pendingCatchLength, setPendingCatchLength] = useState('');
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
      notes: session.notes
    }).finally(() => setIsBootstrappingSegment(false));
  }, [activeSegment, addSessionSegment, isBootstrappingSegment, session]);

  useEffect(() => {
    if (!activeSegment) return;
    setNextWaterType(activeSegment.waterType);
    setNextDepthRange(activeSegment.depthRange);
  }, [activeSegment]);

  const currentRigSetup = activeSegment?.rigSetup ?? createDefaultRigSetup(activeSegment?.flySnapshots ?? []);

  if (!session) {
    return (
      <ScreenBackground>
        <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
          <Text style={{ color: '#f7fdff', textAlign: 'center' }}>Practice session not found.</Text>
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
      notes: activeSegment.notes
    });
    Alert.alert('Water updated', `Started a new practice segment in ${nextWaterType}.`);
  };

  const updateActiveSegment = async (nextRigSetup: RigSetup) => {
    if (!activeSegment) return;
    const nextFlies = nextRigSetup.assignments.map((assignment) => assignment.fly);
    await updateSessionSegmentEntry(activeSegment.id, buildSessionSegmentUpdatePayload(activeSegment, { rigSetup: nextRigSetup, flySnapshots: nextFlies }));
  };

  const confirmPracticeCatch = async () => {
    if (!activeSegment || !pendingCatchFly || !pendingCatchSpecies) return;
    const parsedLength = Number(pendingCatchLength);
    await addCatchEvent({
      sessionId: session.id,
      segmentId: activeSegment.id,
      mode: 'practice',
      flyName: pendingCatchFly.name,
      flySnapshot: pendingCatchFly,
      species: pendingCatchSpecies,
      lengthValue:
        session.practiceMeasurementEnabled && Number.isFinite(parsedLength) && parsedLength > 0 ? parsedLength : undefined,
      lengthUnit: session.practiceLengthUnit ?? 'in',
      caughtAt: new Date().toISOString()
    });
    setPendingCatchFly(null);
    setPendingCatchSpecies(null);
    setPendingCatchLength('');
  };

  const endSessionEarly = () => {
    if (!session || session.endedAt) return;

    Alert.alert('End Session Early?', 'This will stop the timer and cancel any remaining reminders for this practice session.', [
      { text: 'Keep Fishing', style: 'cancel' },
      {
        text: 'End Session',
        style: 'destructive',
        onPress: async () => {
          const endedAt = new Date().toISOString();
          if (activeSegment) {
            await updateSessionSegmentEntry(activeSegment.id, buildSessionSegmentUpdatePayload(activeSegment, { endedAt }));
          }
          await updateSessionEntry(session.id, buildSessionUpdatePayload(session, { endedAt }));
        }
      }
    ]);
  };

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <ScreenHeader
          title="Practice Session"
          subtitle="Stay light, change water fast, and log what is producing without breaking your rhythm."
          eyebrow={session.riverName ?? 'On-Water Workflow'}
        />

        {timer.activeAlertMinute ? (
          <StatusBanner tone="warning" text={`Time marker: ${timer.activeAlertMinute} minutes into your practice session.`} />
        ) : null}
        {notificationPermissionStatus === 'denied' ? (
          <StatusBanner tone="info" text="Phone notifications are off on this device, so reminder banners will only appear while the app is open." />
        ) : null}

        <SectionCard title="Session Timer" subtitle="Keep your timing, reminders, and practice measuring in one glance.">
            <Text style={{ color: theme.colors.text }}>Elapsed: {timer.elapsedLabel}</Text>
          {timer.remainingLabel ? <Text style={{ color: theme.colors.text }}>Remaining: {timer.remainingLabel}</Text> : null}
          {timer.hasEnded ? <StatusBanner tone="error" text="Session ended early." /> : null}
          {!timer.hasEnded && timer.nextAlertMinute ? <Text style={{ color: theme.colors.text }}>Next alert: {timer.nextAlertMinute} min</Text> : null}
          {session.practiceMeasurementEnabled ? (
            <Text style={{ color: theme.colors.textSoft }}>
              Practice measuring is on. Add length in {session.practiceLengthUnit ?? 'in'} whenever it helps your scouting notes.
            </Text>
          ) : null}
          {!timer.hasEnded ? (
            <AppButton label="End Session Early" onPress={endSessionEarly} variant="danger" />
          ) : null}
        </SectionCard>

        <SectionCard title="Active Water Segment" subtitle="Track the current water, then move fast when you want a new segment.">
          <Text style={{ color: theme.colors.text }}>Current water: {activeSegment?.waterType ?? session.waterType}</Text>
          <Text style={{ color: theme.colors.text }}>Current depth: {activeSegment?.depthRange ?? session.depthRange}</Text>
          <OptionChips label="Next Water Type" options={WATER_TYPES} value={nextWaterType} onChange={setNextWaterType} />
          <Text style={{ color: theme.colors.text, fontWeight: '700' }}>Next Water Depth</Text>
          <DepthSelector value={nextDepthRange} onChange={setNextDepthRange} />
          <AppButton label="Change Water" onPress={() => { changeWater().catch(console.error); }} disabled={timer.hasEnded} variant="secondary" />
        </SectionCard>

        <RigSetupPanel
          title="Rig Setup"
          rigSetup={currentRigSetup}
          flyCount={currentRigSetup.assignments.length}
          onFlyCountChange={(nextCount) => {
            updateActiveSegment(
              setRigFlyCount(currentRigSetup, nextCount, {
                clearPointFly: nextCount === 1 && currentRigSetup.assignments.length > 1
              })
            ).catch(console.error);
          }}
          savedLeaderFormulas={savedLeaderFormulas}
          savedRigPresets={savedRigPresets}
          onChange={(nextRigSetup) => {
            updateActiveSegment(nextRigSetup).catch(console.error);
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
            updateActiveSegment(applyRigPresetToRig(currentRigSetup, preset, { clearSinglePointFly: preset.flyCount === 1 })).catch(console.error);
          }}
          onDeleteLeaderFormula={deleteSavedLeaderFormula}
          onDeleteRigPreset={deleteSavedRigPreset}
        />

        <RigFlyManager
          title="Fly Assignments"
          rigSetup={currentRigSetup}
          savedFlies={savedFlies}
          onChange={(nextRigSetup) => {
            updateActiveSegment(nextRigSetup).catch(console.error);
          }}
          onCreateFly={async (fly) => {
            const normalizedFly = { ...fly, name: fly.name.trim() };
            if (!normalizedFly.name) return;
            await addSavedFly(normalizedFly);
          }}
        />

        <SectionCard title="Log Catches" subtitle="Quick tap logging stays front and center while you practice.">
          {!currentRigSetup.assignments.length ? (
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
                    setPendingCatchSpecies(null);
                    setPendingCatchLength('');
                  }}
                  disabled={timer.hasEnded}
                  variant="tertiary"
                />
              </View>
            ))
          )}
        </SectionCard>

        <SectionCard title="Recent Success" subtitle="A quick read on what has connected lately." tone="light">
          {!recentCatches.length ? (
            <Text style={{ color: theme.colors.textDarkSoft }}>No catches logged yet in this practice session.</Text>
          ) : (
            recentCatches.map((event) => (
              <Text key={event.id} style={{ color: theme.colors.textDarkSoft }}>
                {new Date(event.caughtAt).toLocaleTimeString()} - {event.flyName || 'Fly'}{event.species ? ` - ${event.species}` : ''}
              </Text>
            ))
          )}
        </SectionCard>
      </ScrollView>
      <PracticeCatchModal
        visible={pendingCatchFly !== null}
        title={`Log catch for ${pendingCatchFly?.name ?? 'Fly'}`}
        selectedSpecies={pendingCatchSpecies}
        measurementEnabled={session.practiceMeasurementEnabled}
        lengthUnit={session.practiceLengthUnit ?? 'in'}
        selectedLength={pendingCatchLength}
        onSelectSpecies={setPendingCatchSpecies}
        onSelectLength={setPendingCatchLength}
        onCancel={() => {
          setPendingCatchFly(null);
          setPendingCatchSpecies(null);
          setPendingCatchLength('');
        }}
        onConfirm={() => {
          confirmPracticeCatch().catch(console.error);
        }}
      />
    </ScreenBackground>
  );
};
