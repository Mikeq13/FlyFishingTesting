import { Experiment, ExperimentFlyEntry, FishSpecies } from '@/types/experiment';
import { FlySetup } from '@/types/fly';
import { createDefaultRigSetup, createEmptyFly } from './rigSetup';
const normalizeFly = (fly: FlySetup): FlySetup => ({
  ...fly,
  hookSize: fly.hookSize ?? 16,
  beadColor: fly.beadColor ?? 'black',
  bugFamily: fly.bugFamily ?? 'mayfly',
  bugStage: fly.bugStage ?? 'nymph',
  tail: fly.tail ?? 'natural'
});

export const createExperimentLabel = (index: number, total: number, baselineIndex: number): string => {
  if (total === 1) return 'Fly';
  if (index === baselineIndex) return 'Baseline';

  const testOrder = Array.from({ length: total }, (_, slot) => slot)
    .filter((slot) => slot !== baselineIndex)
    .indexOf(index);

  if (total === 2) return 'Test';
  return testOrder === 0 ? 'Test A' : 'Test B';
};

const normalizeFishSizes = (fishSizesInches: number[] | undefined, catches: number): number[] =>
  (fishSizesInches ?? [])
    .filter((size): size is number => typeof size === 'number' && Number.isFinite(size))
    .slice(0, Math.max(catches, 0));

const normalizeFishSpecies = (fishSpecies: string[] | undefined, catches: number): FishSpecies[] =>
  (fishSpecies ?? [])
    .filter((species): species is FishSpecies => typeof species === 'string' && species.trim().length > 0)
    .slice(0, Math.max(catches, 0));

const normalizeCatchTimestamps = (catchTimestamps: string[] | undefined, catches: number): string[] =>
  (catchTimestamps ?? [])
    .filter((timestamp): timestamp is string => typeof timestamp === 'string' && timestamp.trim().length > 0)
    .slice(0, Math.max(catches, 0));

export const createEmptyExperimentEntries = (count: number, baselineIndex = 0): ExperimentFlyEntry[] =>
  Array.from({ length: count }, (_, index) => ({
    slotId: `slot-${index + 1}`,
    label: createExperimentLabel(index, count, baselineIndex),
    role: index === baselineIndex ? 'baseline' : 'test',
    fly: index === 1 ? { ...createEmptyFly(), intent: 'attractor' } : { ...createEmptyFly() },
    casts: 0,
    catches: 0,
    fishSizesInches: [],
    fishSpecies: [],
    catchTimestamps: []
  }));

export const alignExperimentEntries = (entries: ExperimentFlyEntry[], count: number, baselineIndex = 0): ExperimentFlyEntry[] => {
  const next = createEmptyExperimentEntries(count, baselineIndex);

  return next.map((entry, index) => {
    const existing = entries[index];
    if (!existing) return entry;
    return {
      ...existing,
      slotId: existing.slotId || entry.slotId,
      label: createExperimentLabel(index, count, baselineIndex),
      role: index === baselineIndex ? 'baseline' : 'test',
      fishSizesInches: normalizeFishSizes(existing.fishSizesInches, existing.catches),
      fishSpecies: normalizeFishSpecies(existing.fishSpecies, existing.catches),
      catchTimestamps: normalizeCatchTimestamps(existing.catchTimestamps, existing.catches)
    };
  });
};

export const getExperimentEntries = (experiment: Experiment): ExperimentFlyEntry[] => {
  if (experiment.flyEntries?.length) {
    return experiment.flyEntries.map((entry) => ({
      ...entry,
      fly: normalizeFly(entry.fly),
      fishSizesInches: normalizeFishSizes(entry.fishSizesInches, entry.catches),
      fishSpecies: normalizeFishSpecies(entry.fishSpecies, entry.catches),
      catchTimestamps: normalizeCatchTimestamps(entry.catchTimestamps, entry.catches)
    }));
  }

  return [
    {
      slotId: 'slot-1',
      label: 'Baseline',
      role: 'baseline',
      fly: normalizeFly(experiment.controlFly),
      casts: experiment.controlCasts,
      catches: experiment.controlCatches,
      fishSizesInches: [],
      fishSpecies: [],
      catchTimestamps: []
    },
    {
      slotId: 'slot-2',
      label: 'Test',
      role: 'test',
      fly: normalizeFly(experiment.variantFly),
      casts: experiment.variantCasts,
      catches: experiment.variantCatches,
      fishSizesInches: [],
      fishSpecies: [],
      catchTimestamps: []
    }
  ];
};

export const getExperimentRigSetup = (experiment: Experiment) =>
  experiment.rigSetup ?? createDefaultRigSetup(getExperimentEntries(experiment).map((entry) => entry.fly));

export const getLegacyExperimentFields = (entries: ExperimentFlyEntry[]) => {
  const primary = entries[0] ?? createEmptyExperimentEntries(1)[0];
  const secondary = entries[1] ?? {
    slotId: 'slot-2',
    label: 'Test',
    role: 'test' as const,
    fly: primary.fly,
    casts: 0,
    catches: 0
  };

  return {
    controlFly: primary.fly,
    variantFly: secondary.fly,
    controlCasts: primary.casts,
    controlCatches: primary.catches,
    variantCasts: secondary.casts,
    variantCatches: secondary.catches
  };
};
