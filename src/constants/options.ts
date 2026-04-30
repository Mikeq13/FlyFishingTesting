import { BeadColor, BodyType, CollarType, FlyIntent, TailType } from '@/types/fly';
import { Confidence, DepthRange, InsectStage, InsectType, Technique, WaterType } from '@/types/session';

export const WATER_TYPES: WaterType[] = ['glide', 'lake', 'pocket water', 'pool', 'riffle', 'run'];
export const DEPTH_RANGES: DepthRange[] = ['<1.5 ft', '1.5-3 ft', '3-5 ft', '>5 ft'];
export const LAKE_DEPTH_RANGES: DepthRange[] = ['0-10 ft', '10-20 ft', '20-40 ft', '40+ ft'];
export const TECHNIQUES: Technique[] = ['Dry Fly', 'Dry Dropper', 'Euro Nymphing'];
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] as const;
export const SESSION_ALERT_INTERVALS = ['Off', '15 min', '30 min', '60 min'] as const;
export const SESSION_ALERT_MARKERS = [15, 30, 45, 60, 90, 120, 150, 180] as const;
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
export const BEAD_COLORS: BeadColor[] = ['black', 'chartreuse', 'copper', 'gold', 'orange', 'pink', 'red', 'silver', 'white'];

export const BUG_FAMILY_LABEL = 'Bug Family';
export const BUG_STAGE_LABEL = 'Bug Stage';
