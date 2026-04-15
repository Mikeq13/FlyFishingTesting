import { FlySetup } from './fly';

export type ExperimentWinner = string;
export type ExperimentOutcome = 'decisive' | 'tie' | 'inconclusive';
export type ExperimentFlyRole = 'baseline' | 'test';
export type TroutSpecies = 'Brook' | 'Brown' | 'Cutthroat' | 'Rainbow' | 'Tiger' | 'Whitefish';

export interface ExperimentFlyEntry {
  slotId: string;
  label: string;
  role: ExperimentFlyRole;
  fly: FlySetup;
  casts: number;
  catches: number;
  fishSizesInches: number[];
  fishSpecies: TroutSpecies[];
}

export interface Experiment {
  id: number;
  userId: number;
  sessionId: number;
  hypothesis: string;
  flyEntries: ExperimentFlyEntry[];
  controlFly: FlySetup;
  variantFly: FlySetup;
  controlCasts: number;
  controlCatches: number;
  variantCasts: number;
  variantCatches: number;
  winner: ExperimentWinner;
  outcome: ExperimentOutcome;
  confidenceScore: number;
  archivedAt?: string;
}

export interface Insight {
  type: 'pattern' | 'warning' | 'recommendation';
  message: string;
  confidence: 'low' | 'medium' | 'high';
  supportingData: Record<string, unknown>;
}
