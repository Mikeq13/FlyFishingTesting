export type WaterType = 'riffle' | 'run' | 'glide' | 'pool' | 'pocket water' | 'lake';
export type DepthRange = '<1.5 ft' | '1.5-3 ft' | '3-5 ft' | '>5 ft';
export type InsectType =
  | 'mayfly'
  | 'caddis'
  | 'midge'
  | 'stonefly'
  | 'yellow sally'
  | 'ant'
  | 'grasshopper'
  | 'beetle'
  | 'scud/sowbug'
  | 'leech';
export type InsectStage = 'larva' | 'nymph' | 'pupa/emerger' | 'dun' | 'spinner' | 'adult' | 'subsurface';
export type Confidence = 'low' | 'medium' | 'high';

export interface Session {
  id: number;
  userId: number;
  date: string;
  waterType: WaterType;
  depthRange: DepthRange;
  riverName?: string;
  notes?: string;
}

export interface SavedRiver {
  id: number;
  userId: number;
  name: string;
  createdAt: string;
}

export interface Observation {
  id?: number;
  sessionId: number;
  type: 'success' | 'failure' | 'hatch' | 'behavior' | 'water';
  text: string;
  timestamp: string;
}
