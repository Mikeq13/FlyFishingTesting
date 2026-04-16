import { FlySetup } from './fly';

export type TippetSize = '5x' | '6x' | '7x' | '8x';
export type RigFlyPosition = 'dropper' | 'middle dropper' | 'point';

export interface LeaderFormulaSection {
  order: number;
  materialLabel: string;
  lengthFeet: number;
}

export interface LeaderFormula {
  id: number;
  userId: number;
  name: string;
  sections: LeaderFormulaSection[];
  createdAt: string;
}

export interface AddedTippetSection {
  order: number;
  label: string;
  size: TippetSize;
  lengthFeet?: number;
}

export interface RigPreset {
  id: number;
  userId: number;
  name: string;
  leaderFormulaId?: number;
  leaderFormulaName?: string;
  leaderFormulaSectionsSnapshot: LeaderFormulaSection[];
  flyCount: 1 | 2 | 3;
  positions: RigFlyPosition[];
  addedTippetSections: AddedTippetSection[];
  createdAt: string;
}

export interface RigFlyAssignment {
  position: RigFlyPosition;
  fly: FlySetup;
}

export interface RigSetup {
  leaderFormulaId?: number;
  leaderFormulaName?: string;
  leaderFormulaSectionsSnapshot: LeaderFormulaSection[];
  assignments: RigFlyAssignment[];
  addedTippetSections: AddedTippetSection[];
  rigNotes?: string;
}
