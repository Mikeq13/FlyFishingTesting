import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { ExperimentCatchModal } from '@/components/ExperimentCatchModal';
import { ExperimentSavedActionsModal } from '@/components/ExperimentSavedActionsModal';
import { KeyboardDismissView } from '@/components/KeyboardDismissView';
import { OptionChips } from '@/components/OptionChips';
import { RigFlyManager } from '@/components/RigFlyManager';
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
import { CastCounter } from '@/components/CastCounter';
import { CatchCounter } from '@/components/CatchCounter';
import { WATER_TYPES } from '@/constants/options';
import { WaterType } from '@/types/session';

const isDraftExperiment = (entries: ExperimentFlyEntry[]) =>
  entries.some((entry) => entry.casts <= 0 || !entry.fly.name.trim());

const CONTROL_FOCUS_OPTIONS: ExperimentControlFocus[] = [
  'pattern',
  'fly type',
  'hook size',
  'tail',
  'collar',
  'body type',
  'bead size',
  'bead color',
  'number of flies'
];

type ExperimentSectionKey = 'hypothesis' | 'waterType' | 'leaders' | 'rigging' | 'flies';

export const ExperimentScreen = ({ route, navigation }: any) => {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const {
    addExperiment,
    addSavedFly,
    addSavedLeaderFormula,
    deleteSavedLeaderFormula,
    addSavedRigPreset,
    deleteSavedRigPreset,
    savedFlies,
    savedLeaderFormulas,
    savedRigPresets,
    users,
    activeUserId,
    experiments,
    updateExperimentEntry,
    updateSessionEntry,
    sessions
  } = useAppStore();
  const activeUser = users.find((user) => user.id === activeUserId);
  const sessionId: number = route.params.sessionId;
  const experimentId: number | undefined = route.params?.experimentId;
  const session = useMemo(() => sessions.find((candidate) => candidate.id === sessionId) ?? null, [sessionId, sessions]);
  const routeExperiment = useMemo(
    () => experiments.find((experiment) => experiment.id === experimentId) ?? null,
    [experimentId, experiments]
  );
  const autosavedDraft = useMemo(
    () => (experimentId ? null : experiments.find((experiment) => experiment.sessionId === sessionId && experiment.status === 'draft') ?? null),
    [experimentId, experiments, sessionId]
  );
  const existingExperiment = routeExperiment ?? autosavedDraft;
  const [flyCount, setFlyCount] = useState<1 | 2 | 3>(2);
  const [baselineIndex, setBaselineIndex] = useState(0);
  const [controlFocus, setControlFocus] = useState<ExperimentControlFocus>('pattern');
  const [flyEntries, setFlyEntries] = useState<ExperimentFlyEntry[]>(() => createEmptyExperimentEntries(2, 0));
  const [rigSetup, setRigSetup] = useState<RigSetup>(() => createDefaultRigSetup(createEmptyExperimentEntries(2, 0).map((entry) => entry.fly)));
  const [currentWaterType, setCurrentWaterType] = useState<WaterType>('run');
  const [castStep, setCastStep] = useState<5 | 10>(5);
  const [isSaving, setIsSaving] = useState(false);
  const [showSavedExperimentActions, setShowSavedExperimentActions] = useState(false);
  const [draftExperimentId, setDraftExperimentId] = useState<number | null>(null);
  const [hasDraftChanges, setHasDraftChanges] = useState(false);
  const [pendingFishEntryIndex, setPendingFishEntryIndex] = useState<number | null>(null);
  const [pendingFishSize, setPendingFishSize] = useState<number | null>(null);
  const [pendingFishSpecies, setPendingFishSpecies] = useState<TroutSpecies | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<ExperimentSectionKey, boolean>>({
    hypothesis: true,
    waterType: false,
    leaders: false,
    rigging: false,
    flies: false
  });
  const isCompactLayout = width < 720;
  const contentMaxWidth = Platform.OS === 'web' ? Math.min(width - 24, 980) : undefined;
  const hydratedRef = useRef(false);

  const markDraftDirty = () => {
    if (routeExperiment?.status === 'complete') return;
    setHasDraftChanges(true);
  };

  const toggleSection = (key: ExperimentSectionKey) => {
    setExpandedSections((current) => ({ ...current, [key]: !current[key] }));
  };

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
    setCurrentWaterType(session?.waterType ?? 'run');
    setDraftExperimentId(existingExperiment.status === 'draft' ? existingExperiment.id : null);
    setHasDraftChanges(false);
    hydratedRef.current = true;
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
    setCurrentWaterType(session.waterType);
    setDraftExperimentId(null);
    setHasDraftChanges(false);
    hydratedRef.current = true;
  }, [existingExperiment, session?.startingRigSetup]);

  useEffect(() => {
    if (!existingExperiment && !session?.startingRigSetup) {
      setCurrentWaterType(session?.waterType ?? 'run');
      hydratedRef.current = true;
    }
  }, [existingExperiment, session?.startingRigSetup, session?.waterType]);

  const visibleEntries = useMemo(() => flyEntries.slice(0, flyCount), [flyCount, flyEntries]);
  const isDraft = useMemo(() => isDraftExperiment(visibleEntries), [visibleEntries]);
  const activeExperimentId = routeExperiment?.id ?? draftExperimentId;
  const lastLoggedSpecies = useMemo<TroutSpecies | null>(() => {
    const allSpecies = visibleEntries.flatMap((entry) => entry.fishSpecies);
    return (allSpecies.length ? allSpecies[allSpecies.length - 1] : null) as TroutSpecies | null;
  }, [visibleEntries]);
  const flySummary = visibleEntries.map((entry) => `${entry.label}: ${entry.fly.name.trim() || 'No fly selected'}`).join(' | ');
  const leaderSummary = rigSetup.leaderFormulaName ?? (rigSetup.leaderFormulaSectionsSnapshot.length ? 'Custom leader' : 'Not chosen');
  const rigSummary = `${rigSetup.assignments.length} ${rigSetup.assignments.length === 1 ? 'fly' : 'flies'} | ${rigSetup.assignments.map((assignment) => assignment.position).join(' | ')}`;

  const buildExperimentPayload = (nextStatus?: ExperimentStatus) => {
    const status = deriveExperimentStatus(visibleEntries);
    const legacy = getLegacyExperimentFields(visibleEntries);
    const resolvedStatus = nextStatus ?? (isDraft ? 'draft' : 'complete');
    const isResolvedDraft = resolvedStatus === 'draft';
    return {
      sessionId,
      hypothesis: session?.hypothesis || existingExperiment?.hypothesis || 'No hypothesis provided',
      controlFocus,
      rigSetup: syncRigSetupFromFlies(rigSetup, visibleEntries.map((entry) => entry.fly)),
      flyEntries: visibleEntries,
      ...legacy,
      winner: isResolvedDraft ? 'draft' : status.winner,
      outcome: isResolvedDraft ? 'inconclusive' : status.outcome,
      status: resolvedStatus as ExperimentStatus,
      confidenceScore: isResolvedDraft ? 0 : status.confidenceScore
    };
  };

  useEffect(() => {
    if (!hydratedRef.current || !hasDraftChanges || routeExperiment?.status === 'complete') return;

    const timeoutId = setTimeout(() => {
      const payload = buildExperimentPayload('draft');
      const persist = async () => {
        if (activeExperimentId) {
          await updateExperimentEntry(activeExperimentId, payload);
        } else {
          const createdId = await addExperiment(payload);
          setDraftExperimentId(createdId);
        }
        setHasDraftChanges(false);
      };

      persist().catch((error) => {
        console.error(error);
      });
    }, 700);

    return () => clearTimeout(timeoutId);
  }, [activeExperimentId, addExperiment, controlFocus, hasDraftChanges, rigSetup, routeExperiment?.status, sessionId, updateExperimentEntry, visibleEntries]);

  const updateEntry = (index: number, nextEntry: ExperimentFlyEntry) => {
    setFlyEntries((current) => {
      const nextEntries = current.map((entry, entryIndex) => (entryIndex === index ? nextEntry : entry));
      setRigSetup((existingRigSetup) => syncRigSetupFromFlies(existingRigSetup, nextEntries.slice(0, flyCount).map((entry) => entry.fly)));
      return nextEntries;
    });
    markDraftDirty();
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
    setCurrentWaterType(session?.waterType ?? 'run');
    setShowSavedExperimentActions(false);
    setPendingFishEntryIndex(null);
    setPendingFishSize(null);
    setPendingFishSpecies(null);
    setDraftExperimentId(null);
    setHasDraftChanges(false);
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
    markDraftDirty();
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
      const payload = buildExperimentPayload();

      if (activeExperimentId) {
        await updateExperimentEntry(activeExperimentId, payload);
      } else {
        const createdId = await addExperiment(payload);
        setDraftExperimentId(createdId);
      }
      setHasDraftChanges(false);
      setShowSavedExperimentActions(true);
      cancelCatchModal();
    } finally {
      setIsSaving(false);
    }
  };

  const updateWaterType = async (nextWaterType: WaterType) => {
    setCurrentWaterType(nextWaterType);
    if (!session) return;
    try {
      await updateSessionEntry(session.id, {
        ...session,
        waterType: nextWaterType
      });
    } catch (error) {
      Alert.alert('Unable to update water type', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const renderExperimentSection = ({
    sectionKey,
    title,
    subtitle,
    summary,
    children
  }: {
    sectionKey: ExperimentSectionKey;
    title: string;
    subtitle: string;
    summary: string;
    children: React.ReactNode;
  }) => (
    <SectionCard title={title} subtitle={subtitle}>
      {!expandedSections[sectionKey] ? (
        <Text style={{ color: theme.colors.textSoft, lineHeight: 20 }}>{summary}</Text>
      ) : null}
      <Pressable
        onPress={() => toggleSection(sectionKey)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 6
        }}
      >
        <Text style={{ color: theme.colors.textSoft, fontWeight: '700' }}>
          {expandedSections[sectionKey] ? 'Hide details' : 'Show details'}
        </Text>
        <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '800' }}>
          {expandedSections[sectionKey] ? '-' : '+'}
        </Text>
      </Pressable>
      {expandedSections[sectionKey] ? children : null}
    </SectionCard>
  );

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
          subtitle="Start from the session setup, make quick changes when the water shifts, and keep the experiment easier to scan."
          eyebrow={`Angler: ${activeUser?.name ?? 'Loading...'}`}
        />
        {isDraft ? (
          <StatusBanner tone="warning" text="Draft mode: incomplete experiments can be saved now and finished later. Only invalid counts are blocked." />
        ) : null}

        {renderExperimentSection({
          sectionKey: 'hypothesis',
          title: 'Hypothesis',
          subtitle: 'Keep the test intent and control focus visible without crowding the experiment screen.',
          summary: `${session?.hypothesis?.trim() || 'No hypothesis provided'} | Control focus: ${controlFocus} | Cast step: ${castStep}`,
          children: (
            <View style={{ gap: 10 }}>
              <Text style={{ color: theme.colors.text, lineHeight: 22 }}>
                {session?.hypothesis?.trim() || 'No hypothesis was saved on the session screen.'}
              </Text>
              <OptionChips
                label="Control Focus"
                options={CONTROL_FOCUS_OPTIONS}
                value={controlFocus}
                onChange={(value) => {
                  setControlFocus(value as ExperimentControlFocus);
                  markDraftDirty();
                }}
                tone="light"
              />
              <OptionChips
                label="Cast Step"
                options={['5', '10'] as const}
                value={String(castStep) as '5' | '10'}
                onChange={(value) => {
                  setCastStep(Number(value) as 5 | 10);
                  markDraftDirty();
                }}
                tone="light"
              />
            </View>
          )
        })}

        {renderExperimentSection({
          sectionKey: 'waterType',
          title: 'Water Type',
          subtitle: 'Start from the session water type and change it quickly when the water changes.',
          summary: `Current water type: ${currentWaterType}`,
          children: (
            <View style={{ gap: 10 }}>
              <Text style={{ color: theme.colors.textSoft, lineHeight: 20 }}>
                This persists from the session setup, and changing it here updates the current session so the experiment stays aligned with the water you are actually fishing.
              </Text>
              <OptionChips
                label="New Water Type"
                options={WATER_TYPES}
                value={currentWaterType}
                onChange={(value) => {
                  updateWaterType(value as WaterType).catch(console.error);
                }}
                tone="light"
              />
            </View>
          )
        })}

        {renderExperimentSection({
          sectionKey: 'leaders',
          title: 'Leaders',
          subtitle: 'Keep leader choice separate from rigging so you only see leader decisions here.',
          summary: `Current leader: ${leaderSummary}`,
          children: (
            <RigSetupPanel
              title="Leaders"
              rigSetup={rigSetup}
              flyCount={visibleEntries.length}
              editMode="leader"
              forceEditorOpen
              tone="light"
              savedLeaderFormulas={savedLeaderFormulas}
              savedRigPresets={savedRigPresets}
              onChange={(next) => {
                setRigSetup(next);
                markDraftDirty();
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
              onApplyRigPreset={() => undefined}
              onDeleteLeaderFormula={deleteSavedLeaderFormula}
              onDeleteRigPreset={deleteSavedRigPreset}
            />
          )
        })}

        {renderExperimentSection({
          sectionKey: 'rigging',
          title: 'Rigging',
          subtitle: 'Use rigging to control fly count, tippet path, and saved rig presets without mixing in fly editing.',
          summary: `Current rigging: ${rigSummary}`,
          children: (
            <RigSetupPanel
              title="Rigging"
              rigSetup={rigSetup}
              flyCount={visibleEntries.length}
              onFlyCountChange={(nextCount) => {
                setFlyCount(nextCount);
                markDraftDirty();
              }}
              editMode="rig"
              forceEditorOpen
              tone="light"
              savedLeaderFormulas={savedLeaderFormulas}
              savedRigPresets={savedRigPresets}
              onChange={(next) => {
                setRigSetup(next);
                markDraftDirty();
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
                setFlyCount(getFlyCount(preset.flyCount));
                setRigSetup((current) => applyRigPresetToRig(current, preset, { clearSinglePointFly: false }));
                markDraftDirty();
              }}
              onDeleteLeaderFormula={deleteSavedLeaderFormula}
              onDeleteRigPreset={deleteSavedRigPreset}
            />
          )
        })}

        {renderExperimentSection({
          sectionKey: 'flies',
          title: 'Flies',
          subtitle: 'Keep fly selection persistent from the session setup, but make position changes obvious whenever this section is open.',
          summary: flySummary,
          children: (
            <View style={{ gap: 10 }}>
              <OptionChips
                label="Baseline Fly"
                options={visibleEntries.map((entry) => entry.label) as [string, ...string[]]}
                value={visibleEntries[baselineIndex]?.label}
                onChange={(value) => {
                  const nextIndex = visibleEntries.findIndex((entry) => entry.label === value);
                  if (nextIndex >= 0) {
                    setBaselineIndex(nextIndex);
                    markDraftDirty();
                  }
                }}
                tone="light"
              />
              <RigFlyManager
                title="Flies"
                rigSetup={rigSetup}
                savedFlies={savedFlies}
                tone="light"
                onChange={(nextRigSetup) => {
                  setRigSetup(nextRigSetup);
                  setFlyEntries((current) =>
                    alignExperimentEntries(
                      current.map((entry, index) => ({
                        ...entry,
                        fly: nextRigSetup.assignments[index]?.fly ?? entry.fly
                      })),
                      nextRigSetup.assignments.length as 1 | 2 | 3,
                      baselineIndex
                    )
                  );
                  setFlyCount(getFlyCount(nextRigSetup.assignments.length || 1));
                  markDraftDirty();
                }}
                onCreateFly={saveFlyToLibrary}
              />
            </View>
          )
        })}

        <SectionCard title="Results" subtitle="Record casts and catches without reopening the fly builder each time.">
          <View style={{ gap: 10 }}>
            {visibleEntries.map((entry, index) => (
              <View
                key={`results-${entry.slotId}`}
                style={{
                  gap: 10,
                  borderRadius: theme.radius.md,
                  padding: 12,
                  backgroundColor: theme.colors.surfaceAlt,
                  borderWidth: 1,
                  borderColor: theme.colors.border
                }}
              >
                <Text style={{ color: theme.colors.text, fontWeight: '800' }}>
                  {entry.label} {index === baselineIndex ? '(Baseline)' : '(Test)'}
                </Text>
                <Text style={{ color: theme.colors.textSoft }}>
                  {entry.fly.name.trim()
                    ? `${entry.fly.name} #${entry.fly.hookSize} | ${entry.fly.beadColor} | ${entry.fly.beadSizeMm.toFixed(1)} mm`
                    : 'No fly selected yet'}
                </Text>
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
                {!!entry.fishSizesInches.length ? (
                  <Text style={{ color: theme.colors.textSoft, fontSize: 12 }}>
                    Fish log: {entry.fishSizesInches.map((size, fishIndex) => `${size}" ${entry.fishSpecies[fishIndex] ?? 'Trout'}`).join(', ')}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        </SectionCard>

        <SectionCard title="Save Progress" subtitle="This is the primary action for this screen.">
          <Text style={{ color: theme.colors.textSoft }}>
            {activeExperimentId
              ? 'Saving here updates the experiment you already started.'
              : isDraft
                ? 'Draft saves keep incomplete experiments available for later.'
                : 'Save the finished experiment once the comparison looks right.'}
          </Text>
          {routeExperiment?.status !== 'complete' ? (
            <Text style={{ color: theme.colors.textSoft }}>
              {hasDraftChanges ? 'Draft changes are waiting to autosave.' : activeExperimentId ? 'Draft changes autosave in the background while you keep fishing.' : 'The first meaningful change will create a draft automatically.'}
            </Text>
          ) : null}
          <AppButton
            label={
              isSaving
                ? activeExperimentId
                  ? 'Updating...'
                  : 'Saving...'
                : activeExperimentId
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
