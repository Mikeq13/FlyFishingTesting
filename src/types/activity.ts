import { TroutSpecies } from './experiment';
import { FlySetup } from './fly';
import { DepthRange, SessionMode, WaterType } from './session';

export type CatchLengthUnit = 'in' | 'mm' | 'cm';

export interface SessionSegment {
  id: number;
  userId: number;
  sessionId: number;
  mode: SessionMode;
  riverName?: string;
  waterType: WaterType;
  depthRange: DepthRange;
  startedAt: string;
  endedAt?: string;
  flySnapshots: FlySetup[];
  notes?: string;
}

export interface CatchEvent {
  id: number;
  userId: number;
  sessionId: number;
  segmentId?: number;
  mode: SessionMode;
  flyName?: string;
  flySnapshot?: FlySetup;
  species?: TroutSpecies;
  lengthValue?: number;
  lengthUnit: CatchLengthUnit;
  caughtAt: string;
  notes?: string;
}
