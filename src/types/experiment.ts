import { FlySetup } from './fly';

export type ExperimentWinner = 'control' | 'variant' | 'tie' | 'inconclusive';
export type ExperimentOutcome = 'decisive' | 'tie' | 'inconclusive';

export interface Experiment {
  id: number;
  userId: number;
  sessionId: number;
  hypothesis: string;
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
