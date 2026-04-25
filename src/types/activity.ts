import { FishSpecies } from './experiment';
import { FlySetup } from './fly';
import { RigSetup } from './rig';
import { DepthRange, SessionMode, Technique, WaterType } from './session';

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
  rigSetup?: RigSetup;
  technique?: Technique;
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
  species?: FishSpecies;
  lengthValue?: number;
  lengthUnit: CatchLengthUnit;
  caughtAt: string;
  notes?: string;
}
