export type FlyIntent = 'imitative' | 'attractor';
export type BodyType = 'thread' | 'dubbing' | 'natural';
export type CollarType = 'none' | 'cdc' | 'dubbing' | 'hackle';

export interface FlySetup {
  name: string;
  intent: FlyIntent;
  beadSizeMm: number;
  bodyType: BodyType;
  collar: CollarType;
}

export interface SavedFly extends FlySetup {
  id: number;
  userId: number;
  createdAt: string;
}
