import { BodyType, CollarType, FlyIntent } from '@/types/fly';
import { Confidence, DepthRange, InsectStage, InsectType, WaterType } from '@/types/session';

export const WATER_TYPES: WaterType[] = ['glide', 'lake', 'pocket water', 'pool', 'riffle', 'run'];
export const DEPTH_RANGES: DepthRange[] = ['surface', '1-3 ft', '3-6 ft', '6+ ft'];
export const INSECT_TYPES: InsectType[] = ['ant', 'beetle', 'caddis', 'grasshopper', 'leech', 'mayfly', 'midge', 'scud/sowbug', 'stonefly', 'yellow sally'];
export const INSECT_STAGES_BY_TYPE: Record<InsectType, InsectStage[]> = {
  ant: ['adult'],
  beetle: ['adult'],
  caddis: ['adult', 'larva', 'pupa/emerger'],
  grasshopper: ['adult'],
  leech: ['adult'],
  mayfly: ['dun', 'nymph', 'pupa/emerger', 'spinner'],
  midge: ['adult', 'larva', 'pupa/emerger'],
  'scud/sowbug': ['adult'],
  stonefly: ['adult', 'nymph'],
  'yellow sally': ['adult', 'nymph']
};
export const CONFIDENCE_LEVELS: Confidence[] = ['low', 'medium', 'high'];

export const FLY_INTENTS: FlyIntent[] = ['attractor', 'imitative'];
export const BODY_TYPES: BodyType[] = ['dubbing', 'natural', 'thread'];
export const COLLAR_TYPES: CollarType[] = ['cdc', 'hackle', 'none'];
export const BEAD_SIZES_MM = [0, 2, 2.3, 2.5, 2.8, 3, 3.2, 3.5, 3.8, 4] as const;
