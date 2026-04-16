import { FlySetup } from '@/types/fly';
import { AddedTippetSection, LeaderFormula, RigFlyAssignment, RigFlyPosition, RigSetup, TippetSize } from '@/types/rig';

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

const inferBaseTippetSize = (sections: LeaderFormula['sections']): TippetSize =>
  (sections
    .slice()
    .sort((left, right) => left.order - right.order)
    .map((section) => section.materialLabel.toLowerCase().match(/\b([5-8]x)\b/))
    .find(Boolean)?.[1] as TippetSize | undefined) ?? '5x';

const defaultTippetLabelsForCount = (count: number): string[] => {
  if (count <= 1) return ['Point Section'];
  if (count === 2) return ['Dropper Section', 'Point Section'];
  return ['Dropper Section', 'Middle Section', 'Point Section'];
};

export const createRigAssignments = (flies: FlySetup[] = []): RigFlyAssignment[] =>
  flies.slice(0, 3).map((fly, index, entries) => ({
    position: getRigPositionsForCount(entries.length)[index],
    fly
  }));

export const createDefaultRigSetup = (flies: FlySetup[] = [], baseSections: LeaderFormula['sections'] = []): RigSetup => {
  const assignments = createRigAssignments(flies);
  const baseTippetSize = inferBaseTippetSize(baseSections);
  return {
    leaderFormulaSectionsSnapshot: baseSections,
    assignments,
    addedTippetSections: defaultTippetLabelsForCount(assignments.length || 1).map((label, index) => ({
      order: index,
      label,
      size: baseTippetSize
    })),
    lengthToFirstDropperInches: undefined,
    firstToSecondDropperInches: undefined
  };
};

export const applyLeaderFormulaToRig = (rigSetup: RigSetup, formula: LeaderFormula | null): RigSetup => {
  if (!formula) {
    return {
      ...rigSetup,
      leaderFormulaId: undefined,
      leaderFormulaName: undefined,
      leaderFormulaSectionsSnapshot: [],
      addedTippetSections: rigSetup.addedTippetSections.map((section) => ({
        ...section,
        size: '5x'
      }))
    };
  }

  const inferredTippetSize = inferBaseTippetSize(formula.sections);
  return {
    ...rigSetup,
    leaderFormulaId: formula.id,
    leaderFormulaName: formula.name,
    leaderFormulaSectionsSnapshot: formula.sections.map((section) => ({ ...section })),
    addedTippetSections: rigSetup.addedTippetSections.map((section) => ({
      ...section,
      size: section.size || inferredTippetSize
    }))
  };
};

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
    addedTippetSections: normalizeTippetSections(rigSetup.addedTippetSections, nextAssignments.length || 1, fallbackSize),
    lengthToFirstDropperInches: nextAssignments.length > 1 ? rigSetup.lengthToFirstDropperInches : undefined,
    firstToSecondDropperInches: nextAssignments.length > 2 ? rigSetup.firstToSecondDropperInches : undefined
  };
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
