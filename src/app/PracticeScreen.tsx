import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { ScreenBackground } from '@/components/ScreenBackground';
import { OptionChips } from '@/components/OptionChips';
import { DepthSelector } from '@/components/DepthSelector';
import { WATER_TYPES, DEPTH_RANGES } from '@/constants/options';
import { useAppStore } from './store';
import { useSessionTimer } from '@/hooks/useSessionTimer';
import { FlySetup, SavedFly } from '@/types/fly';

const sameFly = (left: FlySetup, right: FlySetup) =>
  left.name === right.name &&
  left.intent === right.intent &&
  left.hookSize === right.hookSize &&
  left.beadSizeMm === right.beadSizeMm &&
  left.beadColor === right.beadColor &&
  left.bodyType === right.bodyType &&
  left.bugFamily === right.bugFamily &&
  left.bugStage === right.bugStage &&
  left.tail === right.tail &&
  left.collar === right.collar;

export const PracticeScreen = ({ route }: any) => {
  const sessionId = route?.params?.sessionId as number;
  const { sessions, sessionSegments, catchEvents, savedFlies, addSessionSegment, updateSessionSegmentEntry, addCatchEvent } = useAppStore();
  const session = sessions.find((candidate) => candidate.id === sessionId) ?? null;
  const [showFlyChooser, setShowFlyChooser] = useState(false);
  const [isBootstrappingSegment, setIsBootstrappingSegment] = useState(false);
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
    alertIntervalMinutes: session?.alertIntervalMinutes
  });

  useEffect(() => {
    if (!session || session.mode !== 'practice' || activeSegment || isBootstrappingSegment) return;
    setIsBootstrappingSegment(true);
    addSessionSegment({
      sessionId: session.id,
      mode: 'practice',
      riverName: session.riverName,
      waterType: session.waterType,
      depthRange: session.depthRange,
      startedAt: new Date().toISOString(),
      flySnapshots: [],
      notes: session.notes
    }).finally(() => setIsBootstrappingSegment(false));
  }, [activeSegment, addSessionSegment, isBootstrappingSegment, session]);

  useEffect(() => {
    if (!activeSegment) return;
    setNextWaterType(activeSegment.waterType);
    setNextDepthRange(activeSegment.depthRange);
  }, [activeSegment]);

  if (!session) {
    return (
      <ScreenBackground>
        <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
          <Text style={{ color: '#f7fdff', textAlign: 'center' }}>Practice session not found.</Text>
        </View>
      </ScreenBackground>
    );
  }

  const toggleSavedFly = async (savedFly: SavedFly) => {
    if (!activeSegment) return;
    const alreadySelected = activeSegment.flySnapshots.some((fly) => sameFly(fly, savedFly));
    const flySnapshots = alreadySelected
      ? activeSegment.flySnapshots.filter((fly) => !sameFly(fly, savedFly))
      : [...activeSegment.flySnapshots, savedFly];

    await updateSessionSegmentEntry(activeSegment.id, {
      sessionId: activeSegment.sessionId,
      mode: activeSegment.mode,
      riverName: activeSegment.riverName,
      waterType: activeSegment.waterType,
      depthRange: activeSegment.depthRange,
      startedAt: activeSegment.startedAt,
      endedAt: activeSegment.endedAt,
      flySnapshots,
      notes: activeSegment.notes
    });
  };

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
      flySnapshots: activeSegment.flySnapshots,
      notes: activeSegment.notes
    });
    Alert.alert('Water updated', `Started a new practice segment in ${nextWaterType}.`);
  };

  const logCatch = async (fly: FlySetup) => {
    if (!activeSegment) return;
    await addCatchEvent({
      sessionId: session.id,
      segmentId: activeSegment.id,
      mode: 'practice',
      flyName: fly.name,
      flySnapshot: fly,
      lengthUnit: 'in',
      caughtAt: new Date().toISOString()
    });
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

        <View style={{ backgroundColor: 'rgba(6, 27, 44, 0.72)', borderRadius: 18, padding: 14, gap: 10, borderWidth: 1, borderColor: 'rgba(202,240,248,0.16)' }}>
          <Pressable onPress={() => setShowFlyChooser((current) => !current)} style={{ backgroundColor: '#2a9d8f', padding: 12, borderRadius: 12 }}>
            <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>
              {showFlyChooser ? 'Hide Saved Flies' : 'Choose Saved Flies For This Water'}
            </Text>
          </Pressable>

          {showFlyChooser ? (
            <View style={{ gap: 8 }}>
              {savedFlies.map((savedFly) => {
                const selected = !!activeSegment?.flySnapshots.some((fly) => sameFly(fly, savedFly));
                return (
                  <Pressable
                    key={savedFly.id}
                    onPress={() => toggleSavedFly(savedFly)}
                    style={{
                      backgroundColor: selected ? 'rgba(42,157,143,0.3)' : 'rgba(255,255,255,0.08)',
                      borderRadius: 12,
                      padding: 12,
                      borderWidth: 1,
                      borderColor: selected ? 'rgba(42,157,143,0.8)' : 'rgba(202,240,248,0.14)'
                    }}
                  >
                    <Text style={{ color: '#f7fdff', fontWeight: '700' }}>
                      {savedFly.name} #{savedFly.hookSize} {savedFly.beadColor} {savedFly.beadSizeMm}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          <Text style={{ color: '#d7f3ff', fontWeight: '700' }}>Current Setup</Text>
          {!activeSegment?.flySnapshots.length ? (
            <Text style={{ color: '#bde6f6' }}>No saved flies selected for this water yet.</Text>
          ) : (
            activeSegment.flySnapshots.map((fly, index) => (
              <View key={`${fly.name}-${index}`} style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 12, gap: 8 }}>
                <Text style={{ color: '#f7fdff', fontWeight: '800' }}>
                  {fly.name} #{fly.hookSize} {fly.beadColor} {fly.beadSizeMm}
                </Text>
                <Pressable onPress={() => logCatch(fly)} style={{ backgroundColor: '#264653', padding: 10, borderRadius: 10 }}>
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
    </ScreenBackground>
  );
};
