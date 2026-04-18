import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { ExperimentCatchModal } from '@/components/ExperimentCatchModal';
import { ExperimentFlyCard } from '@/components/ExperimentFlyCard';
import { ExperimentSavedActionsModal } from '@/components/ExperimentSavedActionsModal';
import { ExperimentSetupPanel } from '@/components/ExperimentSetupPanel';
import { KeyboardDismissView } from '@/components/KeyboardDismissView';
import { RigSetupPanel } from '@/components/RigSetupPanel';
import { useAppStore } from './store';
import { FlySetup } from '@/types/fly';
import { validateExperimentPair } from '@/engine/rules';
import { deriveExperimentStatus } from '@/engine/experimentStatus';
import { ScreenBackground } from '@/components/ScreenBackground';
import { ExperimentControlFocus, ExperimentFlyEntry, ExperimentStatus, TroutSpecies } from '@/types/experiment';
import { RigSetup } from '@/types/rig';
import { alignExperimentEntries, createEmptyExperimentEntries, getExperimentRigSetup, getLegacyExperimentFields } from '@/utils/experimentEntries';
import { applyRigPresetToRig, createDefaultRigSetup, getFlyCount, syncRigSetupFromFlies } from '@/utils/rigSetup';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { AppButton } from '@/components/ui/AppButton';
import { StatusBanner } from '@/components/ui/StatusBanner';
import { SectionCard } from '@/components/ui/SectionCard';
import { useTheme } from '@/design/theme';

const isDraftExperiment = (entries: ExperimentFlyEntry[]) =>
  entries.some((entry) => entry.casts <= 0 || !entry.fly.name.trim());

export const ExperimentScreen = ({ route, navigation }: any) => {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const { addExperiment, addSavedFly, addSavedLeaderFormula, deleteSavedLeaderFormula, addSavedRigPreset, deleteSavedRigPreset, savedFlies, savedLeaderFormulas, savedRigPresets, users, activeUserId, experiments, updateExperimentEntry, sessions } = useAppStore();
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
  const [rigSetup, setRigSetup] = useState<RigSetup>(() => createDefaultRigSetup(createEmptyExperimentEntries(2, 0).map((entry) => entry.fly)));
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
    setRigSetup((current) => syncRigSetupFromFlies(current, flyEntries.slice(0, flyCount).map((entry) => entry.fly)));
  }, [flyCount, flyEntries]);

  useEffect(() => {
    if (!existingExperiment) return;
    const existingEntries = alignExperimentEntries(existingExperiment.flyEntries, existingExperiment.flyEntries.length || 2, Math.max(0, existingExperiment.flyEntries.findIndex((entry) => entry.role === 'baseline')));
    const nextBaselineIndex = Math.max(0, existingEntries.findIndex((entry) => entry.role === 'baseline'));
    setFlyCount(existingEntries.length as 1 | 2 | 3);
    setBaselineIndex(nextBaselineIndex);
    setControlFocus(existingExperiment.controlFocus ?? 'pattern');
    setFlyEntries(existingEntries);
    setRigSetup(getExperimentRigSetup(existingExperiment));
  }, [existingExperiment]);

  useEffect(() => {
    if (existingExperiment || !session?.startingRigSetup) return;
    const seededAssignments = session.startingRigSetup.assignments.slice(0, 3);
    const seededFlyCount = getFlyCount(seededAssignments.length || 1);
    const seededEntries = createEmptyExperimentEntries(seededFlyCount, 0).map((entry, index) => ({
      ...entry,
      fly: seededAssignments[index]?.fly ?? entry.fly
    }));
    setFlyCount(seededFlyCount);
    setBaselineIndex(0);
    setFlyEntries(seededEntries);
    setRigSetup(session.startingRigSetup);
  }, [existingExperiment, session?.startingRigSetup]);

  const visibleEntries = useMemo(() => flyEntries.slice(0, flyCount), [flyCount, flyEntries]);
  const isDraft = useMemo(() => isDraftExperiment(visibleEntries), [visibleEntries]);
  const lastLoggedSpecies = useMemo<TroutSpecies | null>(() => {
    const allSpecies = visibleEntries.flatMap((entry) => entry.fishSpecies);
    return (allSpecies.length ? allSpecies[allSpecies.length - 1] : null) as TroutSpecies | null;
  }, [visibleEntries]);

  const updateEntry = (index: number, nextEntry: ExperimentFlyEntry) => {
    setFlyEntries((current) => {
      const nextEntries = current.map((entry, entryIndex) => (entryIndex === index ? nextEntry : entry));
      setRigSetup((existingRigSetup) => syncRigSetupFromFlies(existingRigSetup, nextEntries.slice(0, flyCount).map((entry) => entry.fly)));
      return nextEntries;
    });
  };

  const saveFlyToLibrary = async (fly: FlySetup) => {
    const normalizedName = fly.name.trim();

    if (!normalizedName) {
      Alert.alert('Fly name needed', 'Give the fly a name before saving it to the library.');
      return;
    }
    try {
      await addSavedFly({ ...fly, name: normalizedName });
      Alert.alert('Fly saved', `${normalizedName} is now available for future experiments.`);
    } catch (error) {
      Alert.alert('Unable to save fly', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const resetForNextExperiment = () => {
    const seededAssignments = session?.startingRigSetup?.assignments.slice(0, 3) ?? [];
    const seededFlyCount = getFlyCount(seededAssignments.length || 2);
    const seededEntries = createEmptyExperimentEntries(seededFlyCount, 0).map((entry, index) => ({
      ...entry,
      fly: seededAssignments[index]?.fly ?? entry.fly
    }));
    setFlyCount(seededFlyCount);
    setBaselineIndex(0);
    setFlyEntries(seededEntries);
    setRigSetup(session?.startingRigSetup ?? createDefaultRigSetup(seededEntries.map((entry) => entry.fly)));
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
        fishSpecies: [],
        catchTimestamps: []
      }))
    );
    setShowSavedExperimentActions(false);
    setPendingFishEntryIndex(null);
    setPendingFishSize(null);
    setPendingFishSpecies(null);
  };

  const confirmCatch = () => {
    if (pendingFishEntryIndex === null || pendingFishSpecies === null) {
      return;
    }

    const index = pendingFishEntryIndex;
    const entry = visibleEntries[index];
    if (!entry) return;

    updateEntry(index, {
      ...entry,
      catches: entry.catches + 1,
      fishSizesInches: pendingFishSize === null ? entry.fishSizesInches : [...entry.fishSizesInches, pendingFishSize],
      fishSpecies: [...entry.fishSpecies, pendingFishSpecies],
      catchTimestamps: [...entry.catchTimestamps, new Date().toISOString()]
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
      fishSpecies: entry.fishSpecies.slice(0, Math.max(0, entry.fishSpecies.length - 1)),
      catchTimestamps: entry.catchTimestamps.slice(0, Math.max(0, entry.catchTimestamps.length - 1))
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
        rigSetup: syncRigSetupFromFlies(rigSetup, visibleEntries.map((entry) => entry.fly)),
        flyEntries: visibleEntries,
        ...legacy,
        winner: isDraft ? 'draft' : status.winner,
        outcome: isDraft ? 'inconclusive' : status.outcome,
        status: (isDraft ? 'draft' : 'complete') as ExperimentStatus,
        confidenceScore: isDraft ? 0 : status.confidenceScore
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
        <ScreenHeader
          title="Experiment"
          subtitle="Set your baseline, choose the flies in play, and record cast and catch data cleanly."
          eyebrow={`Angler: ${activeUser?.name ?? 'Loading...'}`}
        />
        {session?.hypothesis ? <StatusBanner tone="info" text={`Hypothesis: ${session.hypothesis}`} /> : null}
        {isDraft ? (
          <StatusBanner tone="warning" text="Draft mode: incomplete experiments can be saved now and finished later. Only invalid counts are blocked." />
        ) : null}

        <ExperimentSetupPanel
          flyCount={flyCount}
          onFlyCountChange={setFlyCount}
          controlFocus={controlFocus}
          onControlFocusChange={setControlFocus}
          visibleEntries={visibleEntries}
          baselineIndex={baselineIndex}
          onBaselineIndexChange={setBaselineIndex}
          castStep={castStep}
          onCastStepChange={setCastStep}
          isCompactLayout={isCompactLayout}
        />

        <RigSetupPanel
          title="Rig Setup"
          rigSetup={rigSetup}
          flyCount={visibleEntries.length}
          savedLeaderFormulas={savedLeaderFormulas}
          savedRigPresets={savedRigPresets}
          onChange={setRigSetup}
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
            setFlyCount(getFlyCount(preset.flyCount));
            setRigSetup((current) => applyRigPresetToRig(current, preset, { clearSinglePointFly: false }));
          }}
          onDeleteLeaderFormula={deleteSavedLeaderFormula}
          onDeleteRigPreset={deleteSavedRigPreset}
        />

        {visibleEntries.map((entry, index) => (
          <ExperimentFlyCard
            key={entry.slotId}
            entry={entry}
            savedFlies={savedFlies}
            castStep={castStep}
            isCompactLayout={isCompactLayout}
            onChangeFly={(nextEntry) => updateEntry(index, nextEntry)}
            onSaveFly={() => saveFlyToLibrary(entry.fly)}
            onDecrementCasts={() => removeCasts(index)}
            onIncrementCasts={() => updateEntry(index, { ...entry, casts: entry.casts + castStep })}
            onDecrementCatches={() => removeCatch(index)}
            onIncrementCatches={() => {
              setPendingFishEntryIndex(index);
              setPendingFishSize(null);
              setPendingFishSpecies(lastLoggedSpecies);
            }}
          />
        ))}

        <SectionCard title="Save Progress" subtitle="This is the primary action for this screen." tone="light">
          <Text style={{ color: theme.colors.textDarkSoft }}>
            {existingExperiment
              ? 'Saving here updates the experiment you already started.'
              : isDraft
                ? 'Draft saves keep incomplete experiments available for later.'
                : 'Save the finished experiment once the comparison looks right.'}
          </Text>
          <AppButton
            label={
              isSaving
                ? existingExperiment
                  ? 'Updating...'
                  : 'Saving...'
                : existingExperiment
                  ? isDraft
                    ? 'Update Draft'
                    : 'Update Experiment'
                  : isDraft
                    ? 'Save Draft'
                    : 'Save Experiment'
            }
            onPress={() => {
              save().catch(console.error);
            }}
            disabled={isSaving}
          />
        </SectionCard>

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
