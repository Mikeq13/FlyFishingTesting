import { FlySetup } from './fly';
import { RigSetup } from './rig';
import { Technique } from './session';

export type ExperimentWinner = string;
export type ExperimentOutcome = 'decisive' | 'tie' | 'inconclusive';
export type ExperimentStatus = 'draft' | 'complete';
export type ExperimentFlyRole = 'baseline' | 'test';
export type TroutSpecies = 'Brook' | 'Brown' | 'Cutthroat' | 'Rainbow' | 'Tiger' | 'Whitefish';
export type ExperimentControlFocus = 'pattern' | 'fly type' | 'hook size' | 'tail' | 'collar' | 'body type' | 'bead size' | 'bead color' | 'number of flies';

export interface ExperimentFlyEntry {
  slotId: string;
  label: string;
  role: ExperimentFlyRole;
  fly: FlySetup;
  casts: number;
  catches: number;
  fishSizesInches: number[];
  fishSpecies: TroutSpecies[];
  catchTimestamps: string[];
}

export interface Experiment {
  id: number;
  userId: number;
  sessionId: number;
  hypothesis: string;
  controlFocus: ExperimentControlFocus;
  technique?: Technique;
  rigSetup?: RigSetup;
  flyEntries: ExperimentFlyEntry[];
  controlFly: FlySetup;
  variantFly: FlySetup;
  controlCasts: number;
  controlCatches: number;
  variantCasts: number;
  variantCatches: number;
  winner: ExperimentWinner;
  outcome: ExperimentOutcome;
  status: ExperimentStatus;
  confidenceScore: number;
  archivedAt?: string;
  legacyStatusMissing?: boolean;
}

export interface Insight {
  type: 'pattern' | 'warning' | 'recommendation';
  message: string;
  confidence: 'low' | 'medium' | 'high';
  supportingData: Record<string, unknown>;
}
