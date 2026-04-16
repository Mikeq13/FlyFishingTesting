import { FlySetup } from '@/types/fly';
import { AddedTippetSection, LeaderFormula, RigFlyAssignment, RigFlyPosition, RigPreset, RigSetup, TippetSize } from '@/types/rig';

export const createEmptyFly = (): FlySetup => ({
  name: '',
  intent: 'imitative',
  hookSize: 16,
  beadSizeMm: 0,
  beadColor: 'black',
  bodyType: 'thread',
  bugFamily: 'mayfly',
  bugStage: 'nymph',
  tail: 'natural',
  collar: 'none'
});

export const getRigPositionsForCount = (count: number): RigFlyPosition[] => {
  if (count <= 1) return ['point'];
  if (count === 2) return ['dropper', 'point'];
  return ['dropper', 'middle dropper', 'point'];
};

export const getFlyCount = (count: number): 1 | 2 | 3 => {
  if (count <= 1) return 1;
  if (count === 2) return 2;
  return 3;
};

const inferBaseTippetSize = (sections: LeaderFormula['sections']): TippetSize =>
  (sections
    .slice()
    .sort((left, right) => left.order - right.order)
    .map((section) => section.materialLabel.toLowerCase().match(/\b([5-8]x)\b/))
    .find(Boolean)?.[1] as TippetSize | undefined) ?? '5x';

const defaultTippetLabelsForCount = (count: number): string[] => {
  if (count <= 1) return ['Leader to Point'];
  if (count === 2) return ['Leader to First Dropper', 'First Dropper to Point'];
  return ['Leader to First Dropper', 'First Dropper to Middle Dropper', 'Middle Dropper to Point'];
};

export const createRigAssignments = (flies: FlySetup[] = []): RigFlyAssignment[] =>
  flies.slice(0, 3).map((fly, index, entries) => ({
    position: getRigPositionsForCount(entries.length)[index],
    fly
  }));

const createEmptyAssignments = (count: 1 | 2 | 3): RigFlyAssignment[] =>
  getRigPositionsForCount(count).map((position) => ({
    position,
    fly: createEmptyFly()
  }));

const normalizeTippetSections = (sections: AddedTippetSection[], count: number, fallbackSize: TippetSize): AddedTippetSection[] => {
  const labels = defaultTippetLabelsForCount(count || 1);
  return labels.map((label, index) => {
    const existing = sections.find((section) => section.label === label) ?? sections[index];
    return {
      order: index,
      label,
      size: existing?.size ?? fallbackSize,
      lengthFeet: existing?.lengthFeet
    };
  });
};

export const createDefaultRigSetup = (flies: FlySetup[] = [], baseSections: LeaderFormula['sections'] = []): RigSetup => {
  const count = getFlyCount(flies.length || 1);
  const assignments = flies.length ? createRigAssignments(flies) : createEmptyAssignments(count);
  const baseTippetSize = inferBaseTippetSize(baseSections);
  return {
    leaderFormulaSectionsSnapshot: baseSections,
    assignments,
    addedTippetSections: normalizeTippetSections([], assignments.length || 1, baseTippetSize)
  };
};

export const applyLeaderFormulaToRig = (rigSetup: RigSetup, formula: LeaderFormula | null): RigSetup => {
  if (!formula) {
    return {
      ...rigSetup,
      leaderFormulaId: undefined,
      leaderFormulaName: undefined,
      leaderFormulaSectionsSnapshot: [],
      addedTippetSections: normalizeTippetSections(rigSetup.addedTippetSections, rigSetup.assignments.length || 1, '5x')
    };
  }

  const inferredTippetSize = inferBaseTippetSize(formula.sections);
  return {
    ...rigSetup,
    leaderFormulaId: formula.id,
    leaderFormulaName: formula.name,
    leaderFormulaSectionsSnapshot: formula.sections.map((section) => ({ ...section })),
    addedTippetSections: normalizeTippetSections(rigSetup.addedTippetSections, rigSetup.assignments.length || 1, inferredTippetSize)
  };
};

export const syncRigAssignments = (rigSetup: RigSetup, assignments: RigFlyAssignment[]): RigSetup => {
  const limitedAssignments = assignments.slice(0, 3);
  const positions = getRigPositionsForCount(limitedAssignments.length || 1);
  const nextAssignments = limitedAssignments.map((assignment, index) => ({
    ...assignment,
    position: positions[index]
  }));
  const fallbackSize = inferBaseTippetSize(rigSetup.leaderFormulaSectionsSnapshot);

  return {
    ...rigSetup,
    assignments: nextAssignments,
    addedTippetSections: normalizeTippetSections(rigSetup.addedTippetSections, nextAssignments.length || 1, fallbackSize)
  };
};

export const setRigFlyCount = (
  rigSetup: RigSetup,
  nextCount: 1 | 2 | 3,
  options: { clearPointFly?: boolean } = {}
): RigSetup => {
  const currentByPosition = new Map(rigSetup.assignments.map((assignment) => [assignment.position, assignment.fly]));
  const nextPositions = getRigPositionsForCount(nextCount);
  const nextAssignments = nextPositions.map((position) => {
    if (nextCount === 1 && options.clearPointFly) {
      return {
        position,
        fly: createEmptyFly()
      };
    }

    return {
      position,
      fly: currentByPosition.get(position) ?? createEmptyFly()
    };
  });

  return syncRigAssignments(rigSetup, nextAssignments);
};

export const replaceRigAssignmentPosition = (
  assignments: RigFlyAssignment[],
  targetIndex: number,
  nextPosition: RigFlyPosition
): RigFlyAssignment[] => {
  const nextAssignments = assignments.map((assignment) => ({ ...assignment }));
  const target = nextAssignments[targetIndex];
  if (!target || target.position === nextPosition) return assignments;
  const swapIndex = nextAssignments.findIndex((assignment, index) => index !== targetIndex && assignment.position === nextPosition);
  if (swapIndex >= 0) {
    nextAssignments[swapIndex].position = target.position;
  }
  target.position = nextPosition;
  const orderedPositions = getRigPositionsForCount(nextAssignments.length);
  return orderedPositions
    .map((position) => nextAssignments.find((assignment) => assignment.position === position))
    .filter((assignment): assignment is RigFlyAssignment => !!assignment);
};

export const syncRigSetupFromFlies = (rigSetup: RigSetup, flies: FlySetup[]): RigSetup => {
  const nextAssignments = flies.slice(0, 3).map((fly, index) => ({
    fly,
    position: getRigPositionsForCount(flies.slice(0, 3).length)[index]
  }));
  return syncRigAssignments(rigSetup, nextAssignments);
};

export const replaceRigAssignmentFly = (rigSetup: RigSetup, targetIndex: number, fly: FlySetup): RigSetup =>
  syncRigAssignments(
    rigSetup,
    rigSetup.assignments.map((assignment, index) => (index === targetIndex ? { ...assignment, fly } : assignment))
  );

export const clearRigAssignmentFly = (rigSetup: RigSetup, targetIndex: number): RigSetup =>
  replaceRigAssignmentFly(rigSetup, targetIndex, createEmptyFly());

export const createRigPresetPayload = (rigSetup: RigSetup, name: string): Omit<RigPreset, 'id' | 'userId' | 'createdAt'> => ({
  name,
  leaderFormulaId: rigSetup.leaderFormulaId,
  leaderFormulaName: rigSetup.leaderFormulaName,
  leaderFormulaSectionsSnapshot: rigSetup.leaderFormulaSectionsSnapshot.map((section) => ({ ...section })),
  flyCount: getFlyCount(rigSetup.assignments.length || 1),
  positions: rigSetup.assignments.map((assignment) => assignment.position),
  addedTippetSections: rigSetup.addedTippetSections.map((section) => ({ ...section }))
});

export const applyRigPresetToRig = (
  rigSetup: RigSetup,
  preset: RigPreset,
  options: { clearSinglePointFly?: boolean } = {}
): RigSetup => {
  const nextCount = getFlyCount(preset.flyCount || preset.positions.length || 1);
  const currentByPosition = new Map(rigSetup.assignments.map((assignment) => [assignment.position, assignment.fly]));
  const nextPositions = preset.positions?.length ? preset.positions : getRigPositionsForCount(nextCount);
  const nextAssignments = nextPositions.map((position) => {
    const shouldClearPoint = nextCount === 1 && position === 'point' && options.clearSinglePointFly;
    return {
      position,
      fly: shouldClearPoint ? createEmptyFly() : currentByPosition.get(position) ?? createEmptyFly()
    };
  });

  return syncRigAssignments(
    {
      ...rigSetup,
      leaderFormulaId: preset.leaderFormulaId,
      leaderFormulaName: preset.leaderFormulaName,
      leaderFormulaSectionsSnapshot: preset.leaderFormulaSectionsSnapshot.map((section) => ({ ...section })),
      addedTippetSections: preset.addedTippetSections.map((section) => ({ ...section }))
    },
    nextAssignments
  );
};
