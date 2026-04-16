import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { CastCounter } from '@/components/CastCounter';
import { CatchCounter } from '@/components/CatchCounter';
import { ExperimentCatchModal } from '@/components/ExperimentCatchModal';
import { ExperimentSavedActionsModal } from '@/components/ExperimentSavedActionsModal';
import { FlySelector } from '@/components/FlySelector';
import { KeyboardDismissView } from '@/components/KeyboardDismissView';
import { useAppStore } from './store';
import { FlySetup } from '@/types/fly';
import { validateExperimentPair } from '@/engine/rules';
import { deriveExperimentStatus } from '@/engine/experimentStatus';
import { ScreenBackground } from '@/components/ScreenBackground';
import { ExperimentControlFocus, ExperimentFlyEntry, TroutSpecies } from '@/types/experiment';
import { alignExperimentEntries, createEmptyExperimentEntries, getLegacyExperimentFields } from '@/utils/experimentEntries';
import { OptionChips } from '@/components/OptionChips';

const FLY_COUNT_OPTIONS = [1, 2, 3] as const;
const CONTROL_FOCUS_OPTIONS: ExperimentControlFocus[] = ['bead color', 'bead size', 'body type', 'collar', 'fly type', 'hook size', 'pattern', 'tail'];

export const ExperimentScreen = ({ route, navigation }: any) => {
  const { width } = useWindowDimensions();
  const { addExperiment, addSavedFly, savedFlies, users, activeUserId, experiments, updateExperimentEntry, sessions } = useAppStore();
  const activeUser = users.find((user) => user.id === activeUserId);
  const sessionId: number = route.params.sessionId;
  const experimentId: number | undefined = route.params?.experimentId;
  const session = useMemo(() => sessions.find((candidate) => candidate.id === sessionId) ?? null, [sessionId, sessions]);
  const existingExperiment = useMemo(
    () => experiments.find((experiment) => experiment.id === experimentId) ?? null,
    [experimentId, experiments]
  );
  const [flyCount, setFlyCount] = useState<1 | 2 | 3>(2);
  const [baselineIndex, setBaselineIndex] = useState(0);
  const [controlFocus, setControlFocus] = useState<ExperimentControlFocus>('pattern');
  const [flyEntries, setFlyEntries] = useState<ExperimentFlyEntry[]>(() => createEmptyExperimentEntries(2, 0));
  const [castStep, setCastStep] = useState<5 | 10>(5);
  const [isSaving, setIsSaving] = useState(false);
  const [showSavedExperimentActions, setShowSavedExperimentActions] = useState(false);
  const [pendingFishEntryIndex, setPendingFishEntryIndex] = useState<number | null>(null);
  const [pendingFishSize, setPendingFishSize] = useState<number | null>(null);
  const [pendingFishSpecies, setPendingFishSpecies] = useState<TroutSpecies | null>(null);
  const isCompactLayout = width < 720;
  const contentMaxWidth = Platform.OS === 'web' ? Math.min(width - 24, 980) : undefined;

  useEffect(() => {
    setFlyEntries((current) => alignExperimentEntries(current, flyCount, baselineIndex));
  }, [baselineIndex, flyCount]);

  useEffect(() => {
    if (!existingExperiment) return;
    const existingEntries = alignExperimentEntries(existingExperiment.flyEntries, existingExperiment.flyEntries.length || 2, Math.max(0, existingExperiment.flyEntries.findIndex((entry) => entry.role === 'baseline')));
    const nextBaselineIndex = Math.max(0, existingEntries.findIndex((entry) => entry.role === 'baseline'));
    setFlyCount(existingEntries.length as 1 | 2 | 3);
    setBaselineIndex(nextBaselineIndex);
    setControlFocus(existingExperiment.controlFocus ?? 'pattern');
    setFlyEntries(existingEntries);
  }, [existingExperiment]);

  const visibleEntries = useMemo(() => flyEntries.slice(0, flyCount), [flyCount, flyEntries]);
  const lastLoggedSpecies = useMemo<TroutSpecies | null>(() => {
    const allSpecies = visibleEntries.flatMap((entry) => entry.fishSpecies);
    return (allSpecies.length ? allSpecies[allSpecies.length - 1] : null) as TroutSpecies | null;
  }, [visibleEntries]);

  const updateEntry = (index: number, nextEntry: ExperimentFlyEntry) => {
    setFlyEntries((current) => current.map((entry, entryIndex) => (entryIndex === index ? nextEntry : entry)));
  };

  const saveFlyToLibrary = async (fly: FlySetup) => {
    const normalizedName = fly.name.trim();

    if (!normalizedName) {
      Alert.alert('Fly name needed', 'Give the fly a name before saving it to the library.');
      return;
    }

    if (savedFlies.some((savedFly) => savedFly.name.trim().toLowerCase() === normalizedName.toLowerCase())) {
      Alert.alert('Fly already saved', 'That fly name already exists in your library.');
      return;
    }

    await addSavedFly({ ...fly, name: normalizedName });
    Alert.alert('Fly saved', `${normalizedName} is now available for future experiments.`);
  };

  const resetForNextExperiment = () => {
    setFlyCount(2);
    setBaselineIndex(0);
    setFlyEntries(createEmptyExperimentEntries(2, 0));
    setShowSavedExperimentActions(false);
    setPendingFishEntryIndex(null);
    setPendingFishSize(null);
    setPendingFishSpecies(null);
  };

  const modifyAndContinue = () => {
    setFlyEntries((current) =>
      current.map((entry) => ({
        ...entry,
        casts: 0,
        catches: 0,
        fishSizesInches: [],
        fishSpecies: []
      }))
    );
    setShowSavedExperimentActions(false);
    setPendingFishEntryIndex(null);
    setPendingFishSize(null);
    setPendingFishSpecies(null);
  };

  const confirmCatch = () => {
    if (pendingFishEntryIndex === null || pendingFishSize === null || pendingFishSpecies === null) {
      return;
    }

    const index = pendingFishEntryIndex;
    const entry = visibleEntries[index];
    if (!entry) return;

    updateEntry(index, {
      ...entry,
      catches: entry.catches + 1,
      fishSizesInches: [...entry.fishSizesInches, pendingFishSize],
      fishSpecies: [...entry.fishSpecies, pendingFishSpecies]
    });
    setPendingFishEntryIndex(null);
    setPendingFishSize(null);
    setPendingFishSpecies(null);
  };

  const cancelCatchModal = () => {
    setPendingFishEntryIndex(null);
    setPendingFishSize(null);
    setPendingFishSpecies(null);
  };

  const removeCatch = (index: number) => {
    const entry = visibleEntries[index];
    if (!entry || entry.catches <= 0) return;

    updateEntry(index, {
      ...entry,
      catches: Math.max(0, entry.catches - 1),
      fishSizesInches: entry.fishSizesInches.slice(0, Math.max(0, entry.fishSizesInches.length - 1)),
      fishSpecies: entry.fishSpecies.slice(0, Math.max(0, entry.fishSpecies.length - 1))
    });
  };

  const removeCasts = (index: number) => {
    const entry = visibleEntries[index];
    if (!entry) return;
    updateEntry(index, {
      ...entry,
      casts: Math.max(0, entry.casts - castStep)
    });
  };

  const save = async () => {
    if (isSaving) return;

    if (visibleEntries.length > 1) {
      const baselineEntry = visibleEntries[baselineIndex];
      const comparisonNote = visibleEntries
        .filter((_, index) => index !== baselineIndex)
        .map((entry) => ({ entry, check: validateExperimentPair(baselineEntry.fly, entry.fly, controlFocus) }))
        .find(({ check }) => !!check.warning);

      if (comparisonNote?.check.warning) {
        console.warn(`Design note for ${comparisonNote.entry.label}: ${comparisonNote.check.warning}`);
      }
    }

    if (visibleEntries.some((entry) => entry.casts <= 0)) {
      Alert.alert('Missing cast data', 'Log casts for every selected fly before saving.');
      return;
    }

    if (visibleEntries.some((entry) => entry.catches > entry.casts)) {
      Alert.alert('Invalid catch count', 'Catches cannot be greater than casts.');
      return;
    }

    setIsSaving(true);

    try {
      const status = deriveExperimentStatus(visibleEntries);
      const legacy = getLegacyExperimentFields(visibleEntries);
      const payload = {
        sessionId,
        hypothesis: session?.hypothesis || existingExperiment?.hypothesis || 'No hypothesis provided',
        controlFocus,
        flyEntries: visibleEntries,
        ...legacy,
        winner: status.winner,
        outcome: status.outcome,
        confidenceScore: status.confidenceScore
      };

      if (existingExperiment) {
        await updateExperimentEntry(existingExperiment.id, payload);
      } else {
        await addExperiment(payload);
      }
      setShowSavedExperimentActions(true);
      cancelCatchModal();
    } finally {
      setIsSaving(false);
    }
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
          <Text style={{ fontSize: 28, fontWeight: '800', color: '#f7fdff' }}>Experiment</Text>
          <Text style={{ color: '#d7f3ff', lineHeight: 20 }}>
            Set your baseline, choose the flies in play, and record cast and catch data cleanly.
          </Text>
          <Text style={{ color: '#dbf5ff', fontWeight: '700' }}>Angler: {activeUser?.name ?? 'Loading...'}</Text>
          {session?.hypothesis ? <Text style={{ color: '#d7f3ff' }}>Hypothesis: {session.hypothesis}</Text> : null}
        </View>

        <View style={{ gap: 8, backgroundColor: 'rgba(6, 27, 44, 0.70)', padding: 14, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(202,240,248,0.16)' }}>
          <Text style={{ color: '#d7f3ff', fontWeight: '700', fontSize: 16 }}>Flies in this experiment</Text>
          <View style={{ flexDirection: isCompactLayout ? 'column' : 'row', gap: 8 }}>
            {FLY_COUNT_OPTIONS.map((option) => (
              <Pressable
                key={option}
                onPress={() => setFlyCount(option)}
                style={{
                  flex: 1,
                  backgroundColor: flyCount === option ? '#2a9d8f' : 'rgba(255,255,255,0.14)',
                  padding: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: flyCount === option ? 'rgba(255,255,255,0.24)' : 'rgba(202,240,248,0.12)'
                }}
              >
                <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>{option}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <OptionChips label="Control Focus" options={CONTROL_FOCUS_OPTIONS} value={controlFocus} onChange={setControlFocus} />

        {flyCount > 1 && (
          <View style={{ gap: 8, backgroundColor: 'rgba(6, 27, 44, 0.70)', padding: 14, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(202,240,248,0.16)' }}>
            <Text style={{ color: '#d7f3ff', fontWeight: '700', fontSize: 16 }}>Choose Baseline</Text>
            <View style={{ flexDirection: isCompactLayout ? 'column' : 'row', gap: 8 }}>
              {visibleEntries.map((entry, index) => (
                <Pressable
                  key={`baseline-${entry.slotId}`}
                  onPress={() => setBaselineIndex(index)}
                  style={{
                    flex: 1,
                    backgroundColor: baselineIndex === index ? '#2a9d8f' : 'rgba(255,255,255,0.14)',
                    padding: 12,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: baselineIndex === index ? 'rgba(255,255,255,0.24)' : 'rgba(202,240,248,0.12)'
                  }}
                >
                  <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>
                    {entry.fly.name.trim() || `Fly ${index + 1}`}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <View style={{ flexDirection: isCompactLayout ? 'column' : 'row', gap: 8 }}>
          <Pressable
            onPress={() => setCastStep(5)}
            style={{ backgroundColor: castStep === 5 ? '#1d3557' : 'rgba(255,255,255,0.14)', padding: 12, borderRadius: 12, flex: 1, borderWidth: 1, borderColor: 'rgba(202,240,248,0.12)' }}
          >
            <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Cast interval: 5</Text>
          </Pressable>
          <Pressable
            onPress={() => setCastStep(10)}
            style={{ backgroundColor: castStep === 10 ? '#1d3557' : 'rgba(255,255,255,0.14)', padding: 12, borderRadius: 12, flex: 1, borderWidth: 1, borderColor: 'rgba(202,240,248,0.12)' }}
          >
            <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Cast interval: 10</Text>
          </Pressable>
        </View>

        {visibleEntries.map((entry, index) => (
          <View key={entry.slotId} style={{ gap: 8 }}>
            <FlySelector
              title={entry.label}
              value={entry.fly}
              savedFlies={savedFlies}
              onChange={(fly) => updateEntry(index, { ...entry, fly })}
              onSave={() => saveFlyToLibrary(entry.fly)}
            />
            <View style={{ flexDirection: isCompactLayout ? 'column' : 'row', gap: 8 }}>
              <CastCounter
                label={`${entry.label} casts`}
                value={entry.casts}
                step={castStep}
                onDecrement={() => removeCasts(index)}
                onIncrement={() => updateEntry(index, { ...entry, casts: entry.casts + castStep })}
              />
              <CatchCounter
                label={`${entry.label} catches`}
                value={entry.catches}
                onDecrement={() => removeCatch(index)}
                onIncrement={() => {
                  setPendingFishEntryIndex(index);
                  setPendingFishSize(null);
                  setPendingFishSpecies(lastLoggedSpecies);
                }}
              />
            </View>
            {!!entry.fishSizesInches.length && (
              <Text style={{ color: '#bde6f6', fontSize: 12 }}>
                Fish log:{' '}
                {entry.fishSizesInches.map((size, fishIndex) => `${size}" ${entry.fishSpecies[fishIndex] ?? 'Trout'}`).join(', ')}
              </Text>
            )}
          </View>
        ))}

        <Pressable onPress={save} disabled={isSaving} style={{ backgroundColor: isSaving ? '#6c757d' : '#264653', padding: 14, borderRadius: 14 }}>
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>
            {isSaving ? (existingExperiment ? 'Updating...' : 'Saving...') : existingExperiment ? 'Update Experiment' : 'Save Experiment'}
          </Text>
        </Pressable>

      </ScrollView>
      </KeyboardDismissView>
      <ExperimentCatchModal
        visible={pendingFishEntryIndex !== null}
        title={`Log catch for ${pendingFishEntryIndex !== null && visibleEntries[pendingFishEntryIndex] ? visibleEntries[pendingFishEntryIndex].label : 'Fly'}`}
        selectedSpecies={pendingFishSpecies}
        selectedSize={pendingFishSize}
        onSelectSpecies={setPendingFishSpecies}
        onSelectSize={setPendingFishSize}
        onCancel={cancelCatchModal}
        onConfirm={confirmCatch}
      />
      <ExperimentSavedActionsModal
        visible={showSavedExperimentActions}
        isEditing={!!existingExperiment}
        onModifyAndContinue={modifyAndContinue}
        onStartFresh={resetForNextExperiment}
        onViewSession={() => {
          setShowSavedExperimentActions(false);
          navigation.navigate('SessionDetail', { sessionId });
        }}
        onGoToInsights={() => {
          setShowSavedExperimentActions(false);
          navigation.navigate('Insights');
        }}
        onClose={() => setShowSavedExperimentActions(false)}
      />
    </ScreenBackground>
  );
};
