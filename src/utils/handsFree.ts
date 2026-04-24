import * as Linking from 'expo-linking';
import { TECHNIQUES, WATER_TYPES } from '@/constants/options';
import { CatchLengthUnit } from '@/types/activity';
import {
  ActiveOuting,
  ActiveOutingRoute,
  HandsFreeCommand,
  HandsFreeExample,
  HandsFreePreferences
} from '@/types/handsFree';
import { TroutSpecies } from '@/types/experiment';
import { SessionMode, Technique, WaterType } from '@/types/session';

export const ACTIVE_OUTING_SETTING_KEY = 'continuity.active_outing';
export const AUTO_RESUME_ENABLED_KEY = 'continuity.auto_resume_enabled';
export const NOTIFICATION_RESUME_ENABLED_KEY = 'continuity.notification_resume_enabled';
export const DICTATION_ENABLED_KEY = 'dictation.enabled';
export const DICTATION_SHOW_HELP_KEY = 'dictation.show_help_in_sessions';
export const DICTATION_CONFIRMATION_NOTIFICATIONS_KEY = 'dictation.confirmation_notifications_enabled';

export const DEFAULT_AUTO_RESUME_ENABLED = true;
export const DEFAULT_NOTIFICATION_RESUME_ENABLED = true;
export const DEFAULT_DICTATION_ENABLED = true;
export const DEFAULT_DICTATION_SHOW_HELP = true;
export const DEFAULT_DICTATION_CONFIRMATION_NOTIFICATIONS = true;

export const HANDS_FREE_EXAMPLES: HandsFreeExample[] = [
  {
    title: 'Log Fish',
    phrase: 'Log fish in Fishing Lab',
    description: 'Quick catch logging for the current practice or competition outing.'
  },
  {
    title: 'Add Note',
    phrase: 'Add note in Fishing Lab',
    description: 'Attach a short field note to the active outing without hunting through screens.'
  },
  {
    title: 'Change Water',
    phrase: 'Change water to riffle in Fishing Lab',
    description: 'Start a fresh practice segment or update the experiment water context.'
  },
  {
    title: 'Change Technique',
    phrase: 'Change technique to euro nymphing in Fishing Lab',
    description: 'Update the current practice or experiment method using the supported technique list.'
  },
  {
    title: 'Resume Current Outing',
    phrase: 'Resume current outing in Fishing Lab',
    description: 'Jump straight back into the session that is still active on your phone or Apple Watch.'
  }
];

export const SUPPORTED_SPECIES: TroutSpecies[] = ['Brook', 'Brown', 'Cutthroat', 'Rainbow', 'Tiger', 'Whitefish'];
export const SUPPORTED_WATER_TYPES: WaterType[] = WATER_TYPES;
export const SUPPORTED_TECHNIQUES: Technique[] = TECHNIQUES;
export const SUPPORTED_LENGTH_UNITS: CatchLengthUnit[] = ['in', 'mm', 'cm'];

export const parseStoredBoolean = (raw: string | null, fallback: boolean) => {
  if (raw === null) return fallback;
  return raw === 'true';
};

export const parseActiveOuting = (raw: string | null): ActiveOuting | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ActiveOuting;
    if (
      !parsed ||
      typeof parsed.sessionId !== 'number' ||
      typeof parsed.lastActiveAt !== 'string' ||
      !isActiveOutingRoute(parsed.targetRoute)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

export const serializeActiveOuting = (outing: ActiveOuting | null) =>
  outing ? JSON.stringify(outing) : null;

export const serializeHandsFreePreferences = (preferences: HandsFreePreferences) => JSON.stringify(preferences);

export const isActiveOutingRoute = (value: unknown): value is ActiveOutingRoute =>
  value === 'Practice' || value === 'Experiment' || value === 'Competition';

export const routeForSessionMode = (mode: SessionMode): ActiveOutingRoute =>
  mode === 'practice' ? 'Practice' : mode === 'competition' ? 'Competition' : 'Experiment';

export const buildActiveOutingLabel = (outing: ActiveOuting | null) => {
  if (!outing) return 'No current outing';
  if (outing.targetRoute === 'Practice') return 'Practice session ready to resume';
  if (outing.targetRoute === 'Competition') return 'Competition session ready to resume';
  return outing.experimentId ? 'Experiment ready to resume' : 'Experiment session ready to resume';
};

export const buildActiveOutingNavigationTarget = (outing: ActiveOuting) =>
  outing.targetRoute === 'Experiment'
    ? {
        route: outing.targetRoute,
        params: outing.experimentId ? { sessionId: outing.sessionId, experimentId: outing.experimentId } : { sessionId: outing.sessionId }
      }
    : {
        route: outing.targetRoute,
        params: { sessionId: outing.sessionId }
      };

const normalizeTechnique = (value: string | undefined | null): Technique | null => {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  const match = SUPPORTED_TECHNIQUES.find((technique) => technique.toLowerCase() === normalized);
  return match ?? null;
};

const normalizeWaterType = (value: string | undefined | null): WaterType | null => {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  const match = SUPPORTED_WATER_TYPES.find((waterType) => waterType.toLowerCase() === normalized);
  return match ?? null;
};

const normalizeSpecies = (value: string | undefined | null): TroutSpecies | null => {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  const match = SUPPORTED_SPECIES.find((species) => species.toLowerCase() === normalized);
  return match ?? null;
};

const normalizeLengthUnit = (value: string | undefined | null): CatchLengthUnit | null => {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  const match = SUPPORTED_LENGTH_UNITS.find((unit) => unit === normalized);
  return match ?? null;
};

export const parseHandsFreeUrlCommand = (url: string): HandsFreeCommand | null => {
  const parsed = Linking.parse(url);
  if (parsed.hostname !== 'hands-free') return null;
  const params = parsed.queryParams ?? {};
  const action = typeof params.action === 'string' ? params.action : null;
  if (!action) return null;

  return {
    action: action as HandsFreeCommand['action'],
    source: typeof params.source === 'string' ? (params.source as HandsFreeCommand['source']) : null,
    species: normalizeSpecies(typeof params.species === 'string' ? params.species : null),
    noteText: typeof params.noteText === 'string' ? params.noteText : null,
    waterType: normalizeWaterType(typeof params.waterType === 'string' ? params.waterType : null),
    technique: normalizeTechnique(typeof params.technique === 'string' ? params.technique : null),
    lengthUnit: normalizeLengthUnit(typeof params.lengthUnit === 'string' ? params.lengthUnit : null),
    lengthValue: typeof params.lengthValue === 'string' ? Number(params.lengthValue) : null,
    experimentId: typeof params.experimentId === 'string' ? Number(params.experimentId) : null,
    sessionId: typeof params.sessionId === 'string' ? Number(params.sessionId) : null,
    targetRoute: typeof params.targetRoute === 'string' && isActiveOutingRoute(params.targetRoute) ? params.targetRoute : null
  };
};

export const parsePendingHandsFreeCommand = (raw: string | null): HandsFreeCommand | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as HandsFreeCommand;
    if (!parsed?.action) return null;
    return {
      ...parsed,
      source: typeof parsed.source === 'string' ? (parsed.source as HandsFreeCommand['source']) : null,
      species: normalizeSpecies(parsed.species ?? null),
      technique: normalizeTechnique(parsed.technique ?? null),
      waterType: normalizeWaterType(parsed.waterType ?? null),
      lengthUnit: normalizeLengthUnit(parsed.lengthUnit ?? null)
    };
  } catch {
    return null;
  }
};
