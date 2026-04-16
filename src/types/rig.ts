import { FlySetup } from './fly';

export type TippetSize = '5x' | '6x' | '7x' | '8x';

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

export interface RigSetup {
  leaderFormulaId?: number;
  leaderFormulaName?: string;
  leaderFormulaSectionsSnapshot: LeaderFormulaSection[];
  tippetSize: TippetSize;
  totalTippetLengthFeet?: number;
  lengthToFirstDropperInches?: number;
  firstToSecondDropperInches?: number;
  rigNotes?: string;
  flies: FlySetup[];
}
