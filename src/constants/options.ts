import { BodyType, CollarType, FlyIntent, TailType } from '@/types/fly';
import { Confidence, DepthRange, InsectStage, InsectType, WaterType } from '@/types/session';

export const WATER_TYPES: WaterType[] = ['glide', 'pocket water', 'pool', 'riffle', 'run'];
export const DEPTH_RANGES: DepthRange[] = ['<1.5 ft', '1.5-3 ft', '3-5 ft', '>5 ft'];
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] as const;
export const INSECT_TYPES: InsectType[] = ['ant', 'beetle', 'caddis', 'grasshopper', 'leech', 'mayfly', 'midge', 'scud/sowbug', 'stonefly', 'yellow sally'];
export const INSECT_STAGES_BY_TYPE: Record<InsectType, InsectStage[]> = {
  ant: ['adult'],
  beetle: ['adult'],
  caddis: ['adult', 'larva', 'pupa/emerger'],
  grasshopper: ['adult'],
  leech: ['subsurface'],
  mayfly: ['dun', 'nymph', 'pupa/emerger', 'spinner'],
  midge: ['adult', 'larva', 'pupa/emerger'],
  'scud/sowbug': ['subsurface'],
  stonefly: ['adult', 'nymph'],
  'yellow sally': ['adult', 'nymph']
};
export const CONFIDENCE_LEVELS: Confidence[] = ['low', 'medium', 'high'];

export const FLY_INTENTS: FlyIntent[] = ['attractor', 'imitative'];
export const BODY_TYPES: BodyType[] = ['dubbing', 'natural', 'thread'];
export const TAIL_TYPES: TailType[] = ['natural', 'tag'];
export const COLLAR_TYPES: CollarType[] = ['cdc', 'dubbing', 'hackle', 'none'];
export const HOOK_SIZES = [8, 10, 12, 14, 16, 18, 20, 22, 24] as const;
export const BEAD_SIZES_MM = [0, 2, 2.3, 2.5, 2.8, 3, 3.2, 3.5, 3.8, 4] as const;

export const BUG_FAMILY_LABEL = 'Bug Family';
export const BUG_STAGE_LABEL = 'Bug Stage';
