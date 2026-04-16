import { FlySetup } from '@/types/fly';
import { LeaderFormula, RigSetup } from '@/types/rig';

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

export const createDefaultRigSetup = (flies: FlySetup[] = []): RigSetup => ({
  leaderFormulaSectionsSnapshot: [],
  tippetSize: '5x',
  totalTippetLengthFeet: 15,
  lengthToFirstDropperInches: flies.length > 1 ? 8 : undefined,
  firstToSecondDropperInches: flies.length > 2 ? 20 : undefined,
  flies
});

export const applyLeaderFormulaToRig = (rigSetup: RigSetup, formula: LeaderFormula | null): RigSetup => {
  if (!formula) {
    return {
      ...rigSetup,
      leaderFormulaId: undefined,
      leaderFormulaName: undefined,
      leaderFormulaSectionsSnapshot: []
    };
  }

  return {
    ...rigSetup,
    leaderFormulaId: formula.id,
    leaderFormulaName: formula.name,
    leaderFormulaSectionsSnapshot: formula.sections.map((section) => ({ ...section }))
  };
};

export const syncRigFlyCount = (rigSetup: RigSetup, flies: FlySetup[]): RigSetup => ({
  ...rigSetup,
  flies,
  lengthToFirstDropperInches: flies.length > 1 ? rigSetup.lengthToFirstDropperInches ?? 8 : undefined,
  firstToSecondDropperInches: flies.length > 2 ? rigSetup.firstToSecondDropperInches ?? 20 : undefined
});
