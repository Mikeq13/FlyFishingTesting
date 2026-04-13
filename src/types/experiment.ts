import { FlySetup } from './fly';

export interface Experiment {
  id: number;
  sessionId: number;
  hypothesis: string;
  controlFly: FlySetup;
  variantFly: FlySetup;
  controlCasts: number;
  controlCatches: number;
  variantCasts: number;
  variantCatches: number;
  winner: 'control' | 'variant' | 'tie' | 'inconclusive';
  confidenceScore: number;
}

export interface Insight {
  type: 'pattern' | 'warning' | 'recommendation';
  message: string;
  confidence: 'low' | 'medium' | 'high';
  supportingData: Record<string, unknown>;
}
