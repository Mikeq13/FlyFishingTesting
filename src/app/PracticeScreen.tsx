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
import { applyRigPresetToRig, createDefaultRigSetup } from '@/utils/rigSetup';

export const PracticeScreen = ({ route }: any) => {
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
    addSessionSegment,
    updateSessionSegmentEntry,
    addCatchEvent
  } = useAppStore();
  const session = sessions.find((candidate) => candidate.id === sessionId) ?? null;
  const [isBootstrappingSegment, setIsBootstrappingSegment] = useState(false);
  const [pendingCatchFly, setPendingCatchFly] = useState<FlySetup | null>(null);
  const [pendingCatchSpecies, setPendingCatchSpecies] = useState<TroutSpecies | null>(null);
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
    startedAt: session?.date ?? new Date().toISOString(),
    plannedDurationMinutes: session?.plannedDurationMinutes,
    alertIntervalMinutes: session?.alertIntervalMinutes,
    alertMarkersMinutes: session?.alertMarkersMinutes
  });

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
    await updateSessionSegmentEntry(activeSegment.id, {
      sessionId: activeSegment.sessionId,
      mode: activeSegment.mode,
      riverName: activeSegment.riverName,
      waterType: activeSegment.waterType,
      depthRange: activeSegment.depthRange,
      startedAt: activeSegment.startedAt,
      endedAt,
      rigSetup: activeSegment.rigSetup,
      flySnapshots: activeSegment.flySnapshots,
      notes: activeSegment.notes
    });
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
    await updateSessionSegmentEntry(activeSegment.id, {
      sessionId: activeSegment.sessionId,
      mode: activeSegment.mode,
      riverName: activeSegment.riverName,
      waterType: activeSegment.waterType,
      depthRange: activeSegment.depthRange,
      startedAt: activeSegment.startedAt,
      endedAt: activeSegment.endedAt,
      rigSetup: nextRigSetup,
      flySnapshots: nextFlies,
      notes: activeSegment.notes
    });
  };

  const confirmPracticeCatch = async () => {
    if (!activeSegment || !pendingCatchFly || !pendingCatchSpecies) return;
    await addCatchEvent({
      sessionId: session.id,
      segmentId: activeSegment.id,
      mode: 'practice',
      flyName: pendingCatchFly.name,
      flySnapshot: pendingCatchFly,
      species: pendingCatchSpecies,
      lengthUnit: 'in',
      caughtAt: new Date().toISOString()
    });
    setPendingCatchFly(null);
    setPendingCatchSpecies(null);
  };

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 28, fontWeight: '800', color: '#f7fdff' }}>Practice Session</Text>
          <Text style={{ color: '#d7f3ff', lineHeight: 20 }}>
            Stay light, change water fast, and log which flies are producing without breaking your rhythm.
          </Text>
        </View>

        {timer.activeAlertMinute ? (
          <View style={{ backgroundColor: 'rgba(252,211,77,0.22)', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(252,211,77,0.4)' }}>
            <Text style={{ color: '#fff7d6', fontWeight: '800' }}>
              Time marker: {timer.activeAlertMinute} minutes into your practice session.
            </Text>
          </View>
        ) : null}

        <View style={{ backgroundColor: 'rgba(6, 27, 44, 0.72)', borderRadius: 18, padding: 14, gap: 8, borderWidth: 1, borderColor: 'rgba(202,240,248,0.16)' }}>
          <Text style={{ color: '#f7fdff', fontWeight: '800', fontSize: 18 }}>Session Timer</Text>
          <Text style={{ color: '#d7f3ff' }}>Elapsed: {timer.elapsedLabel}</Text>
          {timer.remainingLabel ? <Text style={{ color: '#d7f3ff' }}>Remaining: {timer.remainingLabel}</Text> : null}
          {timer.nextAlertMinute ? <Text style={{ color: '#d7f3ff' }}>Next alert: {timer.nextAlertMinute} min</Text> : null}
        </View>

        <View style={{ backgroundColor: 'rgba(6, 27, 44, 0.72)', borderRadius: 18, padding: 14, gap: 10, borderWidth: 1, borderColor: 'rgba(202,240,248,0.16)' }}>
          <Text style={{ color: '#f7fdff', fontWeight: '800', fontSize: 18 }}>Active Water Segment</Text>
          <Text style={{ color: '#d7f3ff' }}>Current water: {activeSegment?.waterType ?? session.waterType}</Text>
          <Text style={{ color: '#d7f3ff' }}>Current depth: {activeSegment?.depthRange ?? session.depthRange}</Text>
          <OptionChips label="Next Water Type" options={WATER_TYPES} value={nextWaterType} onChange={setNextWaterType} />
          <Text style={{ color: '#d7f3ff', fontWeight: '700' }}>Next Water Depth</Text>
          <DepthSelector value={nextDepthRange} onChange={setNextDepthRange} />
          <Pressable onPress={changeWater} style={{ backgroundColor: '#1d3557', padding: 12, borderRadius: 12 }}>
            <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Change Water</Text>
          </Pressable>
        </View>

        <RigFlyManager
          title="Current Rig"
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

        <RigSetupPanel
          title="Rig Setup"
          rigSetup={currentRigSetup}
          flyCount={currentRigSetup.assignments.length}
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

        <View style={{ backgroundColor: 'rgba(6, 27, 44, 0.72)', borderRadius: 18, padding: 14, gap: 10, borderWidth: 1, borderColor: 'rgba(202,240,248,0.16)' }}>
          <Text style={{ color: '#d7f3ff', fontWeight: '700' }}>Log Catches</Text>
          {!currentRigSetup.assignments.length ? (
            <Text style={{ color: '#bde6f6' }}>Add flies to the rig before logging practice catches.</Text>
          ) : (
            currentRigSetup.assignments.map((assignment, index) => (
              <View key={`${assignment.position}-${assignment.fly.name}-${index}`} style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 12, gap: 8 }}>
                <Text style={{ color: '#f7fdff', fontWeight: '800' }}>
                  {assignment.position}: {assignment.fly.name} #{assignment.fly.hookSize} {assignment.fly.beadColor} {assignment.fly.beadSizeMm}
                </Text>
                <Pressable
                  onPress={() => {
                    setPendingCatchFly(assignment.fly);
                    setPendingCatchSpecies(null);
                  }}
                  style={{ backgroundColor: '#264653', padding: 10, borderRadius: 10 }}
                >
                  <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Log Catch</Text>
                </Pressable>
              </View>
            ))
          )}
        </View>

        <View style={{ backgroundColor: 'rgba(245,252,255,0.96)', borderRadius: 18, padding: 14, gap: 8 }}>
          <Text style={{ color: '#102a43', fontWeight: '800', fontSize: 18 }}>Recent Success</Text>
          {!recentCatches.length ? (
            <Text style={{ color: '#486581' }}>No catches logged yet in this practice session.</Text>
          ) : (
            recentCatches.map((event) => (
              <Text key={event.id} style={{ color: '#334e68' }}>
                {new Date(event.caughtAt).toLocaleTimeString()} - {event.flyName || 'Fly'}{event.species ? ` - ${event.species}` : ''}
              </Text>
            ))
          )}
        </View>
      </ScrollView>
      <PracticeCatchModal
        visible={pendingCatchFly !== null}
        title={`Log catch for ${pendingCatchFly?.name ?? 'Fly'}`}
        selectedSpecies={pendingCatchSpecies}
        onSelectSpecies={setPendingCatchSpecies}
        onCancel={() => {
          setPendingCatchFly(null);
          setPendingCatchSpecies(null);
        }}
        onConfirm={() => {
          confirmPracticeCatch().catch(console.error);
        }}
      />
    </ScreenBackground>
  );
};
