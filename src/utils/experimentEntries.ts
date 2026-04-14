import { Experiment, ExperimentFlyEntry } from '@/types/experiment';
import { FlySetup } from '@/types/fly';

const emptyFly: FlySetup = { name: '', intent: 'imitative', beadSizeMm: 0, bodyType: 'thread', collar: 'none' };

export const createExperimentLabel = (index: number, total: number): string => {
  if (total === 1) return 'Fly';
  if (total === 2) return index === 0 ? 'Control' : 'Variant';
  if (total === 3) return index === 0 ? 'Control' : index === 1 ? 'Variant A' : 'Variant B';
  return `Fly ${index + 1}`;
};

export const createEmptyExperimentEntries = (count: number): ExperimentFlyEntry[] =>
  Array.from({ length: count }, (_, index) => ({
    slotId: `slot-${index + 1}`,
    label: createExperimentLabel(index, count),
    fly: index === 1 ? { ...emptyFly, intent: 'attractor' } : { ...emptyFly },
    casts: 0,
    catches: 0
  }));

export const alignExperimentEntries = (entries: ExperimentFlyEntry[], count: number): ExperimentFlyEntry[] => {
  const next = createEmptyExperimentEntries(count);

  return next.map((entry, index) => {
    const existing = entries[index];
    if (!existing) return entry;
    return {
      ...existing,
      slotId: existing.slotId || entry.slotId,
      label: createExperimentLabel(index, count)
    };
  });
};

export const getExperimentEntries = (experiment: Experiment): ExperimentFlyEntry[] => {
  if (experiment.flyEntries?.length) {
    return experiment.flyEntries;
  }

  return [
    {
      slotId: 'slot-1',
      label: 'Control',
      fly: experiment.controlFly,
      casts: experiment.controlCasts,
      catches: experiment.controlCatches
    },
    {
      slotId: 'slot-2',
      label: 'Variant',
      fly: experiment.variantFly,
      casts: experiment.variantCasts,
      catches: experiment.variantCatches
    }
  ];
};

export const getLegacyExperimentFields = (entries: ExperimentFlyEntry[]) => {
  const primary = entries[0] ?? createEmptyExperimentEntries(1)[0];
  const secondary = entries[1] ?? {
    slotId: 'slot-2',
    label: 'Variant',
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
