import { InsectStage, InsectType } from './session';

export type FlyIntent = 'imitative' | 'attractor';
export type BodyType = 'thread' | 'dubbing' | 'natural';
export type TailType = 'natural' | 'tag';
export type CollarType = 'none' | 'cdc' | 'dubbing' | 'hackle';

export interface FlySetup {
  name: string;
  intent: FlyIntent;
  hookSize: number;
  beadSizeMm: number;
  bodyType: BodyType;
  bugFamily: InsectType;
  bugStage: InsectStage;
  tail: TailType;
  collar: CollarType;
}

export interface SavedFly extends FlySetup {
  id: number;
  userId: number;
  createdAt: string;
}
