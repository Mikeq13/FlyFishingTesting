import { CatchEvent, CatchLengthUnit, SessionSegment } from './activity';
import { Experiment, TroutSpecies } from './experiment';
import { Session, SessionMode, Technique, WaterType } from './session';

export type ActiveOutingRoute = 'Practice' | 'Experiment' | 'Competition';

export interface ActiveOuting {
  mode: SessionMode;
  targetRoute: ActiveOutingRoute;
  sessionId: number;
  experimentId?: number | null;
  lastActiveAt: string;
}

export type HandsFreeCommandSource = 'siri' | 'assistant' | 'watch' | 'app';

export type HandsFreeAction =
  | 'log_fish'
  | 'add_note'
  | 'change_water'
  | 'change_technique'
  | 'resume_outing';

export interface HandsFreeCommand {
  action: HandsFreeAction;
  source?: HandsFreeCommandSource | null;
  species?: TroutSpecies | null;
  lengthValue?: number | null;
  lengthUnit?: CatchLengthUnit | null;
  noteText?: string | null;
  waterType?: WaterType | null;
  technique?: Technique | null;
  experimentId?: number | null;
  targetRoute?: ActiveOutingRoute | null;
  sessionId?: number | null;
}

export interface HandsFreeExample {
  title: string;
  phrase: string;
  description: string;
}

export interface HandsFreePreferences {
  autoResumePromptEnabled: boolean;
  resumeFromNotificationsEnabled: boolean;
  dictationEnabled: boolean;
  showDictationHelpInSessions: boolean;
  confirmationNotificationsEnabled: boolean;
}

export interface WatchCompanionStatus {
  isSupported: boolean;
  isPaired: boolean;
  isWatchAppInstalled: boolean;
  isReachable: boolean;
  activationState: 'inactive' | 'activating' | 'activated' | 'unknown';
}

export interface HandsFreeActionContext {
  activeOuting: ActiveOuting | null;
  dictationEnabled: boolean;
  sessions: Session[];
  sessionSegments: SessionSegment[];
  experiments: Experiment[];
  addCatchEvent: (payload: Omit<CatchEvent, 'id' | 'userId'>) => Promise<number>;
  addSessionSegment: (payload: Omit<SessionSegment, 'id' | 'userId'>) => Promise<number>;
  updateSessionEntry: (sessionId: number, payload: Omit<Session, 'id' | 'userId'>) => Promise<void>;
  updateSessionSegmentEntry: (segmentId: number, payload: Omit<SessionSegment, 'id' | 'userId'>) => Promise<void>;
  updateExperimentEntry: (experimentId: number, payload: Omit<Experiment, 'id' | 'userId'>, options?: { refresh?: boolean }) => Promise<void>;
}

export interface HandsFreeActionResult {
  ok: boolean;
  message: string;
  code:
    | 'success'
    | 'dictation_disabled'
    | 'no_active_outing'
    | 'stale_outing'
    | 'unsupported_command'
    | 'missing_payload'
    | 'unsupported_context'
    | 'command_failed';
  successTitle?: string;
  navigateToOuting?: boolean;
}
