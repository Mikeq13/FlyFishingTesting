import { BodyType, CollarType, FlyIntent } from '@/types/fly';
import { Confidence, DepthRange, InsectStage, InsectType, WaterType } from '@/types/session';

export const WATER_TYPES: WaterType[] = ['riffle', 'run', 'glide', 'pool', 'pocket water', 'lake'];
export const DEPTH_RANGES: DepthRange[] = ['surface', '1-3 ft', '3-6 ft', '6+ ft'];
export const INSECT_TYPES: InsectType[] = ['mayfly', 'caddis', 'midge', 'stonefly', 'yellow sally', 'ant', 'grasshopper', 'beetle', 'scud/sowbug', 'leech'];
export const INSECT_STAGES_BY_TYPE: Record<InsectType, InsectStage[]> = {
  mayfly: ['nymph', 'pupa/emerger', 'dun', 'spinner'],
  caddis: ['larva', 'pupa/emerger', 'adult'],
  midge: ['larva', 'pupa/emerger', 'adult'],
  stonefly: ['nymph', 'adult'],
  'yellow sally': ['nymph', 'adult'],
  ant: ['adult'],
  grasshopper: ['adult'],
  beetle: ['adult'],
  'scud/sowbug': ['adult'],
  leech: ['adult']
};
export const CONFIDENCE_LEVELS: Confidence[] = ['low', 'medium', 'high'];

export const FLY_INTENTS: FlyIntent[] = ['imitative', 'attractor'];
export const BODY_TYPES: BodyType[] = ['thread', 'dubbing', 'natural'];
export const COLLAR_TYPES: CollarType[] = ['none', 'cdc', 'hackle'];
export const BEAD_SIZES_MM = [0, 2, 2.3, 2.5, 2.8, 3, 3.2, 3.5, 3.8, 4] as const;
