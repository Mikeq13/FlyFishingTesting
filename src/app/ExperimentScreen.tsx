import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
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
import { ExperimentControlFocus, ExperimentFlyEntry, ExperimentStatus, FishSpecies } from '@/types/experiment';
import { RigSetup } from '@/types/rig';
import { alignExperimentEntries, createEmptyExperimentEntries, getExperimentRigSetup, getLegacyExperimentFields } from '@/utils/experimentEntries';
import { applyRigPresetToRig, createDefaultRigSetup, getFlyCount, syncRigSetupFromFlies } from '@/utils/rigSetup';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { AppButton } from '@/components/ui/AppButton';
import { StatusBanner } from '@/components/ui/StatusBanner';
import { SectionCard } from '@/components/ui/SectionCard';
import { InlineSummaryRow } from '@/components/ui/InlineSummaryRow';
import { useTheme } from '@/design/theme';
import { useResponsiveLayout } from '@/design/layout';
import { CastCounter } from '@/components/CastCounter';
import { CatchCounter } from '@/components/CatchCounter';
import { TECHNIQUES, WATER_TYPES } from '@/constants/options';
import { Technique, WaterType } from '@/types/session';
import { ModalSurface } from '@/components/ui/ModalSurface';
import { formatSharedBackendError, getPendingSyncFeedback, getPendingSyncFeedbackTone } from '@/utils/syncFeedback';
import { getExperimentRigIdentitySignature } from '@/utils/dataIdentity';
import { DictationHelpModal } from '@/components/DictationHelpModal';
import { FLY_SPECIES_OPTIONS, getRecentExperimentSpecies } from '@/utils/fishSpecies';

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
type DraftSaveState = 'dirty' | 'saving' | 'save_failed' | 'saved';
type SetupSheetKey = 'water' | 'technique' | 'leader' | 'rigging' | 'flies' | 'more' | null;

export const ExperimentScreen = ({ route, navigation }: any) => {
  const { theme } = useTheme();
  const layout = useResponsiveLayout();
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
    sessions,
    refresh,
    remoteSession,
    syncStatus,
    setActiveOuting,
    clearActiveOuting,
    showDictationHelpInSessions
  } = useAppStore();
  const activeUser = users.find((user) => user.id === activeUserId);
  const sessionId: number = route.params.sessionId;
  const [currentRouteExperimentId, setCurrentRouteExperimentId] = useState<number | undefined>(route.params?.experimentId);
  const session = useMemo(() => sessions.find((candidate) => candidate.id === sessionId) ?? null, [sessionId, sessions]);
  const routeExperiment = useMemo(
    () => experiments.find((experiment) => experiment.id === currentRouteExperimentId) ?? null,
    [currentRouteExperimentId, experiments]
  );
  const autosavedDraft = useMemo(
    () => (currentRouteExperimentId ? null : experiments.find((experiment) => experiment.sessionId === sessionId && experiment.status === 'draft') ?? null),
    [currentRouteExperimentId, experiments, sessionId]
  );
  const existingExperiment = routeExperiment ?? autosavedDraft;
  const [flyCount, setFlyCount] = useState<1 | 2 | 3>(2);
  const [baselineIndex, setBaselineIndex] = useState(0);
  const [controlFocus, setControlFocus] = useState<ExperimentControlFocus>('pattern');
  const [flyEntries, setFlyEntries] = useState<ExperimentFlyEntry[]>(() => createEmptyExperimentEntries(2, 0));
  const [rigSetup, setRigSetup] = useState<RigSetup>(() => createDefaultRigSetup(createEmptyExperimentEntries(2, 0).map((entry) => entry.fly)));
  const [currentWaterType, setCurrentWaterType] = useState<WaterType>('run');
  const [currentTechnique, setCurrentTechnique] = useState<Technique | undefined>(undefined);
  const [castStep, setCastStep] = useState<5 | 10>(5);
  const [isSaving, setIsSaving] = useState(false);
  const [showSavedExperimentActions, setShowSavedExperimentActions] = useState(false);
  const [draftExperimentId, setDraftExperimentId] = useState<number | null>(null);
  const [draftSaveState, setDraftSaveState] = useState<DraftSaveState>('saved');
  const [draftRevision, setDraftRevision] = useState(0);
  const [pendingFishEntryIndex, setPendingFishEntryIndex] = useState<number | null>(null);
  const [pendingFishSize, setPendingFishSize] = useState<number | null>(null);
  const [pendingFishSpecies, setPendingFishSpecies] = useState<FishSpecies | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<ExperimentSectionKey, boolean>>({
    hypothesis: false,
    waterType: false,
    leaders: false,
    rigging: false,
    flies: false
  });
  const [activeSetupSheet, setActiveSetupSheet] = useState<SetupSheetKey>(null);
  const [showDictationHelp, setShowDictationHelp] = useState(false);
  const isCompactLayout = layout.isCompactLayout;
  const hydratedRef = useRef(false);
  const hydratedSourceKeyRef = useRef<string | null>(null);
  const draftRevisionRef = useRef(0);
  const latestSaveTokenRef = useRef(0);
  const activeOutingSignatureRef = useRef<string | null>(null);
  const syncFeedback = remoteSession ? getPendingSyncFeedback(syncStatus, 'experiment', 'experiment') : null;

  useEffect(() => {
    setCurrentRouteExperimentId(route.params?.experimentId);
  }, [route.params?.experimentId]);

  const markDraftDirty = () => {
    if (routeExperiment?.status === 'complete') return;
    draftRevisionRef.current += 1;
    setDraftRevision(draftRevisionRef.current);
    setDraftSaveState('dirty');
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

  const resetDraftTracking = (nextState: DraftSaveState = 'saved') => {
    draftRevisionRef.current = 0;
    latestSaveTokenRef.current = 0;
    setDraftRevision(0);
    setDraftSaveState(nextState);
  };

  const hydrateFromExperiment = (experiment: NonNullable<typeof existingExperiment>, sourceKey: string) => {
    const existingEntries = alignExperimentEntries(experiment.flyEntries, experiment.flyEntries.length || 2, Math.max(0, experiment.flyEntries.findIndex((entry) => entry.role === 'baseline')));
    const nextBaselineIndex = Math.max(0, existingEntries.findIndex((entry) => entry.role === 'baseline'));
    setFlyCount(existingEntries.length as 1 | 2 | 3);
    setBaselineIndex(nextBaselineIndex);
    setControlFocus(experiment.controlFocus ?? 'pattern');
    setFlyEntries(existingEntries);
    setRigSetup(getExperimentRigSetup(experiment));
    setCurrentWaterType(experiment.waterType ?? session?.waterType ?? 'run');
    setCurrentTechnique(experiment.technique ?? session?.startingTechnique);
    setDraftExperimentId(experiment.status === 'draft' ? experiment.id : null);
    resetDraftTracking('saved');
    hydratedSourceKeyRef.current = sourceKey;
    hydratedRef.current = true;
  };

  useEffect(() => {
    if (!routeExperiment) return;
    const sourceKey = `route:${routeExperiment.id}`;
    if (hydratedSourceKeyRef.current === sourceKey) return;
    hydrateFromExperiment(routeExperiment, sourceKey);
  }, [routeExperiment, session?.waterType]);

  useEffect(() => {
    if (routeExperiment || !autosavedDraft || hydratedRef.current) return;
    const sourceKey = `draft:${autosavedDraft.id}`;
    hydrateFromExperiment(autosavedDraft, sourceKey);
  }, [autosavedDraft, routeExperiment, session?.waterType]);

  useEffect(() => {
    if (routeExperiment || autosavedDraft || !session?.startingRigSetup) return;
    const sourceKey = `seed:${sessionId}`;
    if (hydratedSourceKeyRef.current === sourceKey) return;
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
    setCurrentTechnique(session.startingTechnique);
    setDraftExperimentId(null);
    resetDraftTracking('saved');
    hydratedSourceKeyRef.current = sourceKey;
    hydratedRef.current = true;
  }, [autosavedDraft, routeExperiment, session?.startingRigSetup, session?.waterType, sessionId]);

  useEffect(() => {
    if (!routeExperiment && !autosavedDraft && !session?.startingRigSetup && !hydratedRef.current) {
      setCurrentWaterType(session?.waterType ?? 'run');
      setCurrentTechnique(session?.startingTechnique);
      resetDraftTracking('saved');
      hydratedSourceKeyRef.current = `empty:${sessionId}`;
      hydratedRef.current = true;
    }
  }, [autosavedDraft, routeExperiment, session?.startingRigSetup, session?.waterType, sessionId]);

  const visibleEntries = useMemo(() => flyEntries.slice(0, flyCount), [flyCount, flyEntries]);
  const isDraft = useMemo(() => isDraftExperiment(visibleEntries), [visibleEntries]);
  const hasMeaningfulLogging = useMemo(
    () => visibleEntries.some((entry) => entry.casts > 0 || entry.catches > 0 || entry.catchTimestamps.length > 0),
    [visibleEntries]
  );
  const activeExperimentId = routeExperiment?.id ?? draftExperimentId;
  const lastLoggedSpecies = useMemo<FishSpecies | null>(() => {
    const allSpecies = visibleEntries.flatMap((entry) => entry.fishSpecies);
    return allSpecies.length ? allSpecies[allSpecies.length - 1] : null;
  }, [visibleEntries]);
  const recentExperimentSpecies = useMemo(() => getRecentExperimentSpecies(experiments), [experiments]);
  const leaderSummary = rigSetup.leaderFormulaName ?? (rigSetup.leaderFormulaSectionsSnapshot.length ? 'Custom leader' : 'Not chosen');
  const rigSummary = `${rigSetup.assignments.length} ${rigSetup.assignments.length === 1 ? 'fly' : 'flies'} | ${rigSetup.assignments.map((assignment) => assignment.position).join(' | ')}`;
  const comparisonWarning = useMemo(() => {
    if (visibleEntries.length <= 1) return null;
    const baselineEntry = visibleEntries[baselineIndex];
    return (
      visibleEntries
        .filter((_, index) => index !== baselineIndex)
        .map((entry) => ({ entry, check: validateExperimentPair(baselineEntry.fly, entry.fly, controlFocus) }))
        .find(({ check }) => !!check.warning) ?? null
    );
  }, [baselineIndex, controlFocus, visibleEntries]);
  const comparisonStatus = useMemo(() => deriveExperimentStatus(visibleEntries), [visibleEntries]);
  const currentComparisonIdentity = useMemo(
    () => getExperimentRigIdentitySignature(rigSetup, visibleEntries),
    [rigSetup, visibleEntries]
  );

  const buildExperimentPayload = (nextStatus?: ExperimentStatus) => {
    const status = comparisonStatus;
    const legacy = getLegacyExperimentFields(visibleEntries);
    const resolvedStatus = nextStatus ?? (isDraft ? 'draft' : 'complete');
    const isResolvedDraft = resolvedStatus === 'draft';
    return {
      sessionId,
      hypothesis: session?.hypothesis || existingExperiment?.hypothesis || 'No hypothesis provided',
      controlFocus,
      waterType: currentWaterType,
      technique: currentTechnique,
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
    if (!hydratedRef.current || draftSaveState !== 'dirty' || routeExperiment?.status === 'complete') return;

    const revisionToPersist = draftRevision;

    const timeoutId = setTimeout(() => {
      const payload = buildExperimentPayload('draft');
      const saveToken = latestSaveTokenRef.current + 1;
      latestSaveTokenRef.current = saveToken;
      setDraftSaveState('saving');
      const persist = async () => {
        if (activeExperimentId) {
          await updateExperimentEntry(activeExperimentId, payload, { refresh: false });
        } else {
          const createdId = await addExperiment(payload, { refresh: false });
          setDraftExperimentId(createdId);
        }
      };

      persist()
        .then(() => {
          if (latestSaveTokenRef.current !== saveToken || draftRevisionRef.current !== revisionToPersist) {
            return;
          }
          setDraftSaveState('saved');
        })
        .catch((error) => {
          if (latestSaveTokenRef.current !== saveToken) return;
          setDraftSaveState('save_failed');
        });
    }, 700);

    return () => clearTimeout(timeoutId);
  }, [activeExperimentId, addExperiment, buildExperimentPayload, draftRevision, draftSaveState, routeExperiment?.status, sessionId, updateExperimentEntry]);

  const updateEntry = (index: number, nextEntry: ExperimentFlyEntry) => {
    setFlyEntries((current) => {
      const nextEntries = current.map((entry, entryIndex) => (entryIndex === index ? nextEntry : entry));
      setRigSetup((existingRigSetup) => syncRigSetupFromFlies(existingRigSetup, nextEntries.slice(0, flyCount).map((entry) => entry.fly)));
      return nextEntries;
    });
    markDraftDirty();
  };

  const updateEntryWith = (index: number, updater: (entry: ExperimentFlyEntry) => ExperimentFlyEntry) => {
    setFlyEntries((current) => {
      const nextEntries = current.map((entry, entryIndex) => (entryIndex === index ? updater(entry) : entry));
      setRigSetup((existingRigSetup) => syncRigSetupFromFlies(existingRigSetup, nextEntries.slice(0, flyCount).map((entry) => entry.fly)));
      return nextEntries;
    });
    markDraftDirty();
  };

  const isSameFlyTuningChange = (nextRigSetup: RigSetup, nextEntries: ExperimentFlyEntry[], nextFlyCount: 1 | 2 | 3) => {
    if (nextFlyCount !== visibleEntries.length || nextRigSetup.assignments.length !== rigSetup.assignments.length) {
      return false;
    }

    const currentRigContext = JSON.stringify({
      leaderFormulaId: rigSetup.leaderFormulaId ?? null,
      leaderFormulaName: rigSetup.leaderFormulaName ?? null,
      leaderFormulaSectionsSnapshot: rigSetup.leaderFormulaSectionsSnapshot,
      addedTippetSections: rigSetup.addedTippetSections,
      positions: rigSetup.assignments.map((assignment) => assignment.position)
    });
    const nextRigContext = JSON.stringify({
      leaderFormulaId: nextRigSetup.leaderFormulaId ?? null,
      leaderFormulaName: nextRigSetup.leaderFormulaName ?? null,
      leaderFormulaSectionsSnapshot: nextRigSetup.leaderFormulaSectionsSnapshot,
      addedTippetSections: nextRigSetup.addedTippetSections,
      positions: nextRigSetup.assignments.map((assignment) => assignment.position)
    });

    if (currentRigContext !== nextRigContext) {
      return false;
    }

    return visibleEntries.every((entry, index) => {
      const nextEntry = nextEntries[index];
      if (!nextEntry) return false;
      return (
        entry.fly.name === nextEntry.fly.name &&
        entry.fly.intent === nextEntry.fly.intent &&
        entry.fly.bodyType === nextEntry.fly.bodyType &&
        entry.fly.bugFamily === nextEntry.fly.bugFamily &&
        entry.fly.bugStage === nextEntry.fly.bugStage &&
        entry.fly.tail === nextEntry.fly.tail &&
        entry.fly.collar === nextEntry.fly.collar
      );
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

  const resetForNextExperiment = (overrides?: {
    waterType?: WaterType;
    technique?: Technique;
    flyCount?: 1 | 2 | 3;
    baselineIndex?: number;
    flyEntries?: ExperimentFlyEntry[];
    rigSetup?: RigSetup;
  }) => {
    const nextFlyCount = overrides?.flyCount ?? flyCount;
    const nextBaselineIndex = Math.min(overrides?.baselineIndex ?? baselineIndex, nextFlyCount - 1);
    const seededEntries =
      overrides?.flyEntries ??
      createEmptyExperimentEntries(nextFlyCount, nextBaselineIndex).map((entry, index) => ({
        ...entry,
        fly: visibleEntries[index]?.fly ?? entry.fly
      }));
    const nextRigSetup =
      overrides?.rigSetup ??
      syncRigSetupFromFlies(rigSetup, seededEntries.map((entry) => entry.fly));
    setFlyCount(nextFlyCount);
    setBaselineIndex(nextBaselineIndex);
    setFlyEntries(seededEntries);
    setRigSetup(nextRigSetup);
    setCurrentWaterType(overrides?.waterType ?? currentWaterType);
    setCurrentTechnique(overrides?.technique ?? currentTechnique);
    setShowSavedExperimentActions(false);
    setPendingFishEntryIndex(null);
    setPendingFishSize(null);
    setPendingFishSpecies(null);
    setDraftExperimentId(null);
    setCurrentRouteExperimentId(undefined);
    resetDraftTracking('saved');
  };

  const modifyAndContinue = () => {
    resetForNextExperiment();
  };

  const confirmCatch = () => {
    if (pendingFishEntryIndex === null || pendingFishSpecies === null) {
      return;
    }

    const index = pendingFishEntryIndex;
    updateEntryWith(index, (entry) => ({
      ...entry,
      catches: entry.catches + 1,
      fishSizesInches: pendingFishSize === null ? entry.fishSizesInches : [...entry.fishSizesInches, pendingFishSize],
      fishSpecies: [...entry.fishSpecies, pendingFishSpecies],
      catchTimestamps: [...entry.catchTimestamps, new Date().toISOString()]
    }));
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
    updateEntryWith(index, (entry) => {
      if (entry.catches <= 0) return entry;
      return {
        ...entry,
        catches: Math.max(0, entry.catches - 1),
        fishSizesInches: entry.fishSizesInches.slice(0, Math.max(0, entry.fishSizesInches.length - 1)),
        fishSpecies: entry.fishSpecies.slice(0, Math.max(0, entry.fishSpecies.length - 1)),
        catchTimestamps: entry.catchTimestamps.slice(0, Math.max(0, entry.catchTimestamps.length - 1))
      };
    });
  };

  const removeCasts = (index: number) => {
    updateEntryWith(index, (entry) => ({
      ...entry,
      casts: Math.max(0, entry.casts - castStep)
    }));
  };

  const save = async () => {
    if (isSaving) return;

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
      resetDraftTracking('saved');
      setShowSavedExperimentActions(true);
      cancelCatchModal();
    } catch (error) {
      Alert.alert('Unable to save experiment', formatSharedBackendError(error, 'experiment'));
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    return () => {
      if (draftExperimentId || draftSaveState === 'dirty' || draftSaveState === 'saving' || draftSaveState === 'save_failed') {
        refresh(activeUserId).catch(() => undefined);
      }
    };
  }, [activeUserId, draftExperimentId, draftSaveState, refresh]);

  const draftStatusText =
    routeExperiment?.status === 'complete'
      ? null
      : draftSaveState === 'dirty'
        ? 'Draft changes are waiting to autosave.'
        : draftSaveState === 'saving'
          ? 'Saving the latest draft changes now.'
          : draftSaveState === 'save_failed'
            ? 'Draft autosave failed in the background. Your local changes are still on screen, and Save Progress will retry.'
            : activeExperimentId
              ? 'Draft changes autosave in the background while you keep fishing.'
              : 'The first meaningful change will create a draft automatically.';
  const syncStatusText = activeExperimentId ? syncFeedback : null;

  const saveCurrentAndStartFresh = async (changes: {
    waterType?: WaterType;
    technique?: Technique;
    flyCount?: 1 | 2 | 3;
    baselineIndex?: number;
    flyEntries?: ExperimentFlyEntry[];
    rigSetup?: RigSetup;
    successMessage?: string;
  }) => {
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
        await addExperiment(payload);
      }
      resetForNextExperiment({
        waterType: changes.waterType ?? currentWaterType,
        technique: changes.technique ?? currentTechnique,
        flyCount: changes.flyCount,
        baselineIndex: changes.baselineIndex,
        flyEntries: changes.flyEntries,
        rigSetup: changes.rigSetup
      });
      setActiveSetupSheet(null);
      Alert.alert(
        'Started a fresh experiment',
        changes.successMessage ?? 'The current experiment was saved and a fresh comparison is ready with the new context.'
      );
    } catch (error) {
      Alert.alert('Unable to change context', formatSharedBackendError(error, 'experiment'));
    } finally {
      setIsSaving(false);
    }
  };

  const requestFreshContext = (changes: { waterType?: WaterType; technique?: Technique }) => {
    Alert.alert(
      'Start a fresh experiment?',
      'Water type or technique changed after logging began. Save this experiment and start a new one with the updated context so the comparison stays clean.',
      [
        { text: 'Keep Current Context', style: 'cancel' },
        {
          text: 'Save And Start Fresh',
          style: 'destructive',
          onPress: () => {
            void saveCurrentAndStartFresh(changes);
          }
        }
      ]
    );
  };

  const requestWaterTypeChoice = (nextWaterType: WaterType) => {
    Alert.alert(
      'Update water type?',
      'The water changed after logging began. You can keep this experiment going with the new water type, or save this comparison and start a fresh one so the earlier result keeps its original context.',
      [
        { text: 'Keep Current Water Type', style: 'cancel' },
        {
          text: 'Continue Current Experiment',
          onPress: () => {
            setCurrentWaterType(nextWaterType);
            markDraftDirty();
            setActiveSetupSheet(null);
          }
        },
        {
          text: 'Save And Start Fresh',
          style: 'destructive',
          onPress: () => {
            void saveCurrentAndStartFresh({ waterType: nextWaterType });
          }
        }
      ]
    );
  };

  const updateWaterType = async (nextWaterType: WaterType) => {
    if (hasMeaningfulLogging && nextWaterType !== currentWaterType) {
      requestWaterTypeChoice(nextWaterType);
      return;
    }
    try {
      setCurrentWaterType(nextWaterType);
      markDraftDirty();
      setActiveSetupSheet(null);
    } catch (error) {
      Alert.alert('Unable to update water type', formatSharedBackendError(error, 'experiment'));
    }
  };

  const buildEntriesForRigChange = (nextRigSetup: RigSetup, nextFlyCount: 1 | 2 | 3, nextBaselineIndex: number) =>
    alignExperimentEntries(
      flyEntries.map((entry, index) => ({
        ...entry,
        fly: nextRigSetup.assignments[index]?.fly ?? entry.fly
      })),
      nextFlyCount,
      nextBaselineIndex
    );

  const applyComparisonIdentityChange = async (nextRigSetup: RigSetup) => {
    const nextFlyCount = getFlyCount(nextRigSetup.assignments.length || 1);
    const nextBaselineIndex = Math.min(baselineIndex, nextFlyCount - 1);
    const nextEntries = buildEntriesForRigChange(nextRigSetup, nextFlyCount, nextBaselineIndex);
    const nextIdentity = getExperimentRigIdentitySignature(nextRigSetup, nextEntries.slice(0, nextFlyCount));
    const tuningOnlyChange = nextIdentity !== currentComparisonIdentity && isSameFlyTuningChange(nextRigSetup, nextEntries, nextFlyCount);

    if (hasMeaningfulLogging && nextIdentity !== currentComparisonIdentity && !tuningOnlyChange) {
      Alert.alert(
        'Start a fresh experiment?',
        'Changing the fly lineup after logging began would mix two different comparisons. Save this experiment and start a new draft with the updated flies instead.',
        [
          { text: 'Keep Current Comparison', style: 'cancel' },
          {
            text: 'Save And Start Fresh',
            style: 'destructive',
            onPress: () => {
              void saveCurrentAndStartFresh({
                flyCount: nextFlyCount,
                baselineIndex: nextBaselineIndex,
                flyEntries: nextEntries.map((entry) => ({
                  ...entry,
                  casts: 0,
                  catches: 0,
                  fishSizesInches: [],
                  fishSpecies: [],
                  catchTimestamps: []
                })),
                rigSetup: nextRigSetup,
                successMessage: 'The previous experiment was saved, and a fresh comparison was started with the updated fly lineup.'
              });
            }
          }
        ]
      );
      return;
    }

    setBaselineIndex(nextBaselineIndex);
    setFlyEntries(nextEntries);
    setFlyCount(nextFlyCount);
    setRigSetup(nextRigSetup);
    markDraftDirty();
  };

  const updateTechnique = async (nextTechnique: Technique) => {
    if (hasMeaningfulLogging && nextTechnique !== currentTechnique) {
      requestFreshContext({ technique: nextTechnique });
      return;
    }
    try {
      setCurrentTechnique(nextTechnique);
      markDraftDirty();
      setActiveSetupSheet(null);
    } catch (error) {
      Alert.alert('Unable to update technique', formatSharedBackendError(error, 'experiment'));
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

  const flySummaryText = visibleEntries
    .map((entry, index) =>
      `${entry.label} ${index === baselineIndex ? '(Baseline)' : '(Test)'}: ${entry.fly.name.trim() || 'No fly selected'}`
    )
    .join(' | ');

  useEffect(() => {
    if (!session || session.endedAt) {
      activeOutingSignatureRef.current = null;
      clearActiveOuting().catch(() => undefined);
      return;
    }
    const activeOutingSignature = JSON.stringify({
      sessionId: session.id,
      mode: session.mode,
      activeExperimentId: activeExperimentId ?? null,
      waterType: currentWaterType,
      technique: currentTechnique ?? null
    });
    if (activeOutingSignatureRef.current === activeOutingSignature) return;
    activeOutingSignatureRef.current = activeOutingSignature;
    setActiveOuting({
      mode: session.mode,
      targetRoute: 'Experiment',
      sessionId: session.id,
      experimentId: activeExperimentId ?? undefined,
      lastActiveAt: new Date().toISOString()
    }).catch(() => undefined);
  }, [activeExperimentId, clearActiveOuting, currentTechnique, currentWaterType, session, setActiveOuting]);

  return (
    <ScreenBackground>
      <KeyboardDismissView>
      <ScrollView
        style={{ flex: 1, minHeight: 0 }}
        contentContainerStyle={layout.buildScrollContentStyle({ gap: 12 })}
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
        {syncStatusText ? <StatusBanner tone={getPendingSyncFeedbackTone(syncStatus)} text={syncStatusText} /> : null}
        {comparisonWarning?.check.warning ? (
          <StatusBanner
            tone="info"
            text={`Design note for ${comparisonWarning.entry.label}: ${comparisonWarning.check.warning}`}
          />
        ) : null}

        <SectionCard title="Experiment Cockpit" subtitle="The active comparison, water, method, and save state stay visible while you fish.">
          <InlineSummaryRow label="Hypothesis" value={session?.hypothesis?.trim() || 'No hypothesis provided'} valueMuted={!session?.hypothesis?.trim()} />
          <View style={{ flexDirection: layout.stackDirection, gap: 10 }}>
            <View style={{ flex: 1 }}>
              <InlineSummaryRow label="Water" value={currentWaterType} />
            </View>
            <View style={{ flex: 1 }}>
              <InlineSummaryRow label="Technique" value={currentTechnique ?? 'Not chosen'} valueMuted={!currentTechnique} />
            </View>
          </View>
          <InlineSummaryRow label="Save State" value={routeExperiment?.status === 'complete' ? 'Complete experiment' : draftStatusText ?? 'Draft status unavailable'} />
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
            <InlineSummaryRow label="Comparison Status" value={comparisonStatus.outcome === 'decisive' ? 'Decisive' : comparisonStatus.outcome === 'tie' ? 'Tie' : 'Inconclusive'} />
            <InlineSummaryRow label="Current Read" value={comparisonStatus.comparison.summary} />
          </View>
        </SectionCard>

        <SectionCard title="Log Results" subtitle="Casts and catches stay one tap away when you resume on the water.">
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
                    onIncrement={() =>
                      updateEntryWith(index, (currentEntry) => ({
                        ...currentEntry,
                        casts: currentEntry.casts + castStep
                      }))
                    }
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
                    Fish log: {entry.fishSizesInches.map((size, fishIndex) => `${size}" ${entry.fishSpecies[fishIndex] ?? 'Fish'}`).join(', ')}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        </SectionCard>

        <SectionCard title="Quick Changes" subtitle="Change field context without hunting through setup cards.">
          <View style={{ flexDirection: layout.stackDirection, gap: 10 }}>
            <View style={{ flex: 1 }}>
              <AppButton label="Change Water" onPress={() => setActiveSetupSheet('water')} variant="secondary" />
            </View>
            <View style={{ flex: 1 }}>
              <AppButton label="Adjust Flies" onPress={() => setActiveSetupSheet('flies')} variant="secondary" />
            </View>
          </View>
          <View style={{ flexDirection: layout.stackDirection, gap: 10 }}>
            <View style={{ flex: 1 }}>
              <AppButton label="Change Technique" onPress={() => setActiveSetupSheet('technique')} variant="tertiary" />
            </View>
            <View style={{ flex: 1 }}>
              <AppButton label="More Setup" onPress={() => setActiveSetupSheet('more')} variant="tertiary" />
            </View>
          </View>
        </SectionCard>

        {renderExperimentSection({
          sectionKey: 'hypothesis',
          title: 'Experiment Details',
          subtitle: 'Keep comparison settings available without putting them ahead of logging.',
          summary: `${session?.hypothesis?.trim() || 'No hypothesis provided'} | Control focus: ${controlFocus} | Cast step: ${castStep} | Baseline: ${visibleEntries[baselineIndex]?.label ?? 'Not set'}`,
          children: (
            <View style={{ gap: 10 }}>
              <Text style={{ color: theme.colors.text, lineHeight: 22 }}>
                {session?.hypothesis?.trim() || 'No hypothesis was saved on the session screen.'}
              </Text>
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
              />
              <OptionChips
                label="Control Focus"
                options={CONTROL_FOCUS_OPTIONS}
                value={controlFocus}
                onChange={(value) => {
                  setControlFocus(value as ExperimentControlFocus);
                  markDraftDirty();
                }}
              />
              <OptionChips
                label="Cast Step"
                options={['5', '10'] as const}
                value={String(castStep) as '5' | '10'}
                onChange={(value) => {
                  setCastStep(Number(value) as 5 | 10);
                  markDraftDirty();
                }}
              />
            </View>
          )
        })}

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
              {draftStatusText}
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
              void save();
            }}
            disabled={isSaving}
          />
          {showDictationHelpInSessions ? (
            <AppButton label="Voice Commands" onPress={() => setShowDictationHelp(true)} variant="ghost" />
          ) : null}
        </SectionCard>

      </ScrollView>
      </KeyboardDismissView>
        <ModalSurface
          visible={activeSetupSheet !== null}
          title={
            activeSetupSheet === 'water'
              ? 'Change Water'
              : activeSetupSheet === 'technique'
              ? 'Change Technique'
              : activeSetupSheet === 'leader'
              ? 'Change Leader'
              : activeSetupSheet === 'rigging'
                ? 'Change Rigging'
                : activeSetupSheet === 'flies'
                  ? 'Change Flies'
                  : 'More Setup'
          }
          subtitle={
            activeSetupSheet === 'water'
              ? 'Change the water context while keeping experiment integrity clear.'
              : activeSetupSheet === 'technique'
              ? 'Keep the method quick to change while protecting experiment integrity once logging has started.'
              : activeSetupSheet === 'leader'
              ? 'Keep the current experiment visible while you swap leader setup.'
              : activeSetupSheet === 'rigging'
                ? 'Adjust rig count, preset, and tippet details without losing your place in Results.'
                : activeSetupSheet === 'flies'
                  ? 'Replace flies or fill empty slots in one focused editor.'
                  : 'Leader and rigging details stay available without crowding the field cockpit.'
          }
          onClose={() => setActiveSetupSheet(null)}
        >
          <View style={{ gap: 12 }}>
            {activeSetupSheet === 'water' ? (
              <SectionCard title="Water" subtitle="Choose the water you are testing right now." tone="modal">
                <Text style={{ color: theme.colors.modalTextSoft, lineHeight: 20 }}>
                  After logging starts, Fishing Lab will ask whether to keep this comparison going or save and start fresh.
                </Text>
                <OptionChips
                  label="Water Type"
                  options={WATER_TYPES}
                  value={currentWaterType}
                  onChange={(value) => {
                    void updateWaterType(value as WaterType);
                  }}
                  tone="modal"
                />
              </SectionCard>
            ) : null}
            {activeSetupSheet === 'technique' ? (
              <SectionCard title="Technique" subtitle="Switch methods without losing your place in the experiment." tone="modal">
                <OptionChips
                  label="Technique"
                  options={TECHNIQUES}
                  value={currentTechnique ?? null}
                  onChange={(value) => {
                    void updateTechnique(value as Technique);
                  }}
                  tone="modal"
                />
              </SectionCard>
            ) : null}
            {activeSetupSheet === 'more' ? (
              <SectionCard title="Setup Summary" subtitle="Open only the setup editor you need, then return to logging." tone="modal">
                <InlineSummaryRow label="Leader" value={leaderSummary} tone="modal" />
                <InlineSummaryRow label="Rigging" value={rigSummary} tone="modal" />
                <InlineSummaryRow label="Flies" value={flySummaryText} tone="modal" />
                <View style={{ flexDirection: layout.stackDirection, gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <AppButton label="Change Leader" onPress={() => setActiveSetupSheet('leader')} variant="secondary" surfaceTone="modal" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppButton label="Change Rigging" onPress={() => setActiveSetupSheet('rigging')} variant="secondary" surfaceTone="modal" />
                  </View>
                </View>
              </SectionCard>
            ) : null}
            {activeSetupSheet === 'leader' ? (
              <RigSetupPanel
                title="Leader"
                rigSetup={rigSetup}
                flyCount={visibleEntries.length}
                editMode="leader"
                forceEditorOpen
                tone="modal"
                foregroundQuickAdd
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
            ) : null}
            {activeSetupSheet === 'rigging' ? (
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
                tone="modal"
                foregroundQuickAdd
                savedLeaderFormulas={savedLeaderFormulas}
                savedRigPresets={savedRigPresets}
                onChange={(next) => {
                  void applyComparisonIdentityChange(next);
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
                  const nextRigSetup = applyRigPresetToRig(rigSetup, preset, { clearSinglePointFly: false });
                  void applyComparisonIdentityChange(nextRigSetup);
                }}
                onDeleteLeaderFormula={deleteSavedLeaderFormula}
                onDeleteRigPreset={deleteSavedRigPreset}
              />
            ) : null}
            {activeSetupSheet === 'flies' ? (
              <RigFlyManager
                title="Flies"
                rigSetup={rigSetup}
                savedFlies={savedFlies}
                tone="modal"
                editorOnly
                foregroundQuickAdd
                onChange={(nextRigSetup) => {
                  void applyComparisonIdentityChange(nextRigSetup);
                }}
                onCreateFly={saveFlyToLibrary}
              />
            ) : null}
            <AppButton label="Done" onPress={() => setActiveSetupSheet(null)} />
          </View>
        </ModalSurface>
      <ExperimentCatchModal
        visible={pendingFishEntryIndex !== null}
        title={`Log catch for ${pendingFishEntryIndex !== null && visibleEntries[pendingFishEntryIndex] ? visibleEntries[pendingFishEntryIndex].label : 'Fly'}`}
        selectedSpecies={pendingFishSpecies}
        recommendedSpecies={FLY_SPECIES_OPTIONS}
        recentSpecies={recentExperimentSpecies}
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
      <DictationHelpModal visible={showDictationHelp} onClose={() => setShowDictationHelp(false)} />
    </ScreenBackground>
  );
};
