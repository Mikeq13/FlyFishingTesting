export type WaterType = 'riffle' | 'run' | 'pool' | 'lake';
export type DepthRange = 'surface' | '1-3 ft' | '3-6 ft' | '6+ ft';
export type InsectType = 'mayfly' | 'caddis' | 'midge' | 'stonefly' | 'terrestrial';
export type InsectStage = 'larva' | 'emerger' | 'adult';
export type Confidence = 'low' | 'medium' | 'high';

export interface Session {
  id: number;
  userId: number;
  date: string;
  waterType: WaterType;
  depthRange: DepthRange;
  insectType: InsectType;
  insectStage: InsectStage;
  insectConfidence: Confidence;
  notes?: string;
}

export interface Observation {
  id?: number;
  sessionId: number;
  type: 'success' | 'failure' | 'hatch' | 'behavior' | 'water';
  text: string;
  timestamp: string;
}
