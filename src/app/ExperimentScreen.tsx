import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
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
import { InlineSummaryRow } from '@/components/ui/InlineSummaryRow';
import { useTheme } from '@/design/theme';
import { CastCounter } from '@/components/CastCounter';
import { CatchCounter } from '@/components/CatchCounter';
import { TECHNIQUES, WATER_TYPES } from '@/constants/options';
import { Technique, WaterType } from '@/types/session';
import { BottomSheetSurface } from '@/components/ui/BottomSheetSurface';

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
type SetupSheetKey = 'technique' | 'leader' | 'rigging' | 'flies' | null;

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
    sessions,
    refresh,
    remoteSession,
    syncStatus
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
  const [pendingFishSpecies, setPendingFishSpecies] = useState<TroutSpecies | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<ExperimentSectionKey, boolean>>({
    hypothesis: true,
    waterType: false,
    leaders: false,
    rigging: false,
    flies: false
  });
  const [activeSetupSheet, setActiveSetupSheet] = useState<SetupSheetKey>(null);
  const isCompactLayout = width < 720;
  const contentMaxWidth = Platform.OS === 'web' ? Math.min(width - 24, 980) : undefined;
  const hydratedRef = useRef(false);
  const hydratedSourceKeyRef = useRef<string | null>(null);
  const draftRevisionRef = useRef(0);
  const latestSaveTokenRef = useRef(0);
  const toFriendlySyncMessage = (error: unknown) => {
    const rawMessage = error instanceof Error ? error.message : 'Please try again.';
    const normalized = rawMessage.toLowerCase();
    if (normalized.includes('502 bad gateway') || normalized.includes('bad gateway') || normalized.includes('<!doctype html')) {
      return 'Shared beta backend is temporarily unavailable right now. Your experiment changes are still safe on this device.';
    }
    return rawMessage;
  };

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
  const lastLoggedSpecies = useMemo<TroutSpecies | null>(() => {
    const allSpecies = visibleEntries.flatMap((entry) => entry.fishSpecies);
    return (allSpecies.length ? allSpecies[allSpecies.length - 1] : null) as TroutSpecies | null;
  }, [visibleEntries]);
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

  const resetForNextExperiment = (overrides?: { waterType?: WaterType; technique?: Technique }) => {
    const seededEntries = createEmptyExperimentEntries(flyCount, baselineIndex).map((entry, index) => ({
      ...entry,
      fly: visibleEntries[index]?.fly ?? entry.fly
    }));
    setFlyCount(flyCount);
    setBaselineIndex(baselineIndex);
    setFlyEntries(seededEntries);
    setRigSetup(syncRigSetupFromFlies(rigSetup, seededEntries.map((entry) => entry.fly)));
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
      Alert.alert('Unable to save experiment', toFriendlySyncMessage(error));
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
  const syncStatusText =
    !remoteSession
      ? null
      : syncStatus.lastError
        ? `Saved locally. Shared sync is temporarily unavailable: ${syncStatus.lastError}`
        : syncStatus.pendingCount
          ? 'Saved locally. Syncing the latest experiment changes to the shared backend now.'
          : null;

  const saveCurrentAndStartFresh = async (changes: { waterType?: WaterType; technique?: Technique }) => {
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
        technique: changes.technique ?? currentTechnique
      });
      setActiveSetupSheet(null);
      Alert.alert('Started a fresh experiment', 'The current experiment was saved and a fresh comparison is ready with the new context.');
    } catch (error) {
      Alert.alert('Unable to change context', toFriendlySyncMessage(error));
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

  const updateWaterType = async (nextWaterType: WaterType) => {
    if (hasMeaningfulLogging && nextWaterType !== currentWaterType) {
      requestFreshContext({ waterType: nextWaterType });
      return;
    }
    try {
      setCurrentWaterType(nextWaterType);
      markDraftDirty();
      setActiveSetupSheet(null);
    } catch (error) {
      Alert.alert('Unable to update water type', toFriendlySyncMessage(error));
    }
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
      Alert.alert('Unable to update technique', toFriendlySyncMessage(error));
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

  const flySummaryText = visibleEntries
    .map((entry, index) =>
      `${entry.label} ${index === baselineIndex ? '(Baseline)' : '(Test)'}: ${entry.fly.name.trim() || 'No fly selected'}`
    )
    .join(' | ');

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
        {syncStatusText ? <StatusBanner tone={syncStatus.lastError ? 'warning' : 'info'} text={syncStatusText} /> : null}
        {comparisonWarning?.check.warning ? (
          <StatusBanner
            tone="info"
            text={`Design note for ${comparisonWarning.entry.label}: ${comparisonWarning.check.warning}`}
          />
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
          subtitle: 'Use the session as your broad outing, but keep each experiment water change on the experiment itself.',
          summary: `Current water type: ${currentWaterType}`,
          children: (
            <View style={{ gap: 10 }}>
              <Text style={{ color: theme.colors.textSoft, lineHeight: 20 }}>
                Before logging starts, you can change the experiment water type directly. After logging starts, the app saves the current comparison and starts a fresh experiment so the earlier result keeps its original context.
              </Text>
              <OptionChips
                label="New Water Type"
                options={WATER_TYPES}
                value={currentWaterType}
                onChange={(value) => {
                  void updateWaterType(value as WaterType);
                }}
                tone="light"
              />
            </View>
          )
        })}

        <SectionCard title="Baseline Fly" subtitle="Keep the control fly obvious on the main screen while you test changes below.">
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
        </SectionCard>

        {renderSetupSummaryCard({
          title: 'Technique',
          subtitle: 'Keep the current method visible and lightweight to change without blurring the experiment context.',
          summaryTitle: 'Current Technique',
          summaryText: currentTechnique ?? 'Not chosen',
          buttonLabel: 'Change Technique',
          sheetKey: 'technique'
        })}

        {renderSetupSummaryCard({
          title: 'Leader',
          subtitle: 'Leader setup persists from Session and can be changed here without leaving the experiment.',
          summaryTitle: 'Current Leader',
          summaryText: leaderSummary,
          buttonLabel: 'Change Leader',
          sheetKey: 'leader'
        })}

        {renderSetupSummaryCard({
          title: 'Rigging',
          subtitle: 'Rigging persists from Session. Change fly count, preset, or tippet details in one focused step.',
          summaryTitle: 'Current Rigging',
          summaryText: rigSummary,
          buttonLabel: 'Change Rigging',
          sheetKey: 'rigging'
        })}

        {renderSetupSummaryCard({
          title: 'Flies',
          subtitle: 'Flies persist from Session. Replace them or fill empty slots without pushing Results off screen.',
          summaryTitle: 'Current Flies',
          summaryText: flySummaryText,
          buttonLabel: 'Change Flies',
          sheetKey: 'flies'
        })}

        <SectionCard title="Results" subtitle="Record casts and catches without reopening the fly builder each time.">
          <View
            style={{
              gap: 8,
              borderRadius: theme.radius.md,
              padding: 12,
              backgroundColor: theme.colors.nestedSurface,
              borderWidth: 1,
              borderColor: theme.colors.nestedSurfaceBorder
            }}
          >
            <InlineSummaryRow label="Comparison Status" value={comparisonStatus.outcome === 'decisive' ? 'Decisive' : comparisonStatus.outcome === 'tie' ? 'Tie' : 'Inconclusive'} tone="light" />
            <InlineSummaryRow label="Current Read" value={comparisonStatus.comparison.summary} tone="light" />
          </View>
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
        </SectionCard>

      </ScrollView>
      </KeyboardDismissView>
      <Modal visible={activeSetupSheet !== null} transparent animationType="fade" onRequestClose={() => setActiveSetupSheet(null)}>
        <BottomSheetSurface
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
              ? 'Keep the method quick to change while protecting experiment integrity once logging has started.'
              : activeSetupSheet === 'leader'
              ? 'Keep the current experiment visible while you swap leader setup.'
              : activeSetupSheet === 'rigging'
                ? 'Adjust rig count, preset, and tippet details without losing your place in Results.'
                : 'Replace flies or fill empty slots in one focused editor.'
          }
          onClose={() => setActiveSetupSheet(null)}
        >
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 12 }}>
            {activeSetupSheet === 'technique' ? (
              <SectionCard title="Technique" subtitle="Switch methods without losing your place in the experiment." tone="light">
                <OptionChips
                  label="Technique"
                  options={TECHNIQUES}
                  value={currentTechnique ?? null}
                  onChange={(value) => {
                    void updateTechnique(value as Technique);
                  }}
                  tone="light"
                />
              </SectionCard>
            ) : null}
            {activeSetupSheet === 'leader' ? (
              <RigSetupPanel
                title="Leader"
                rigSetup={rigSetup}
                flyCount={visibleEntries.length}
                editMode="leader"
                forceEditorOpen
                tone="light"
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
                tone="light"
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
                onApplyRigPreset={(preset) => {
                  setFlyCount(getFlyCount(preset.flyCount));
                  setRigSetup((current) => applyRigPresetToRig(current, preset, { clearSinglePointFly: false }));
                  markDraftDirty();
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
                tone="light"
                editorOnly
                foregroundQuickAdd
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
            ) : null}
            <AppButton label="Done" onPress={() => setActiveSetupSheet(null)} />
          </ScrollView>
        </BottomSheetSurface>
      </Modal>
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
