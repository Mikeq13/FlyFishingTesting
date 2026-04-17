import { CatchLengthUnit, CatchEvent, SessionSegment } from '@/types/activity';
import { Session } from '@/types/session';

export const getSessionPlannedDurationMinutes = (session: Session | null | undefined): number | undefined => {
  if (!session) return undefined;
  if (typeof session.plannedDurationMinutes === 'number') {
    return session.plannedDurationMinutes;
  }
  if (session.startAt && session.endAt) {
    return Math.max(0, Math.round((new Date(session.endAt).getTime() - new Date(session.startAt).getTime()) / 60000));
  }
  return undefined;
};

export const buildSessionUpdatePayload = (
  session: Session,
  overrides: Partial<Omit<Session, 'id' | 'userId'>> = {}
): Omit<Session, 'id' | 'userId'> => ({
  date: session.date,
  mode: session.mode,
  plannedDurationMinutes: session.plannedDurationMinutes,
  alertIntervalMinutes: session.alertIntervalMinutes,
  alertMarkersMinutes: session.alertMarkersMinutes,
  notificationSoundEnabled: session.notificationSoundEnabled,
  notificationVibrationEnabled: session.notificationVibrationEnabled,
  endedAt: session.endedAt,
  startAt: session.startAt,
  endAt: session.endAt,
  waterType: session.waterType,
  depthRange: session.depthRange,
  sharedGroupId: session.sharedGroupId,
  practiceMeasurementEnabled: session.practiceMeasurementEnabled,
  practiceLengthUnit: session.practiceLengthUnit,
  competitionId: session.competitionId,
  competitionAssignmentId: session.competitionAssignmentId,
  competitionGroupId: session.competitionGroupId,
  competitionSessionId: session.competitionSessionId,
  competitionAssignedGroup: session.competitionAssignedGroup,
  competitionRole: session.competitionRole,
  competitionBeat: session.competitionBeat,
  competitionSessionNumber: session.competitionSessionNumber,
  competitionRequiresMeasurement: session.competitionRequiresMeasurement,
  competitionLengthUnit: session.competitionLengthUnit,
  startingRigSetup: session.startingRigSetup,
  riverName: session.riverName,
  hypothesis: session.hypothesis,
  notes: session.notes,
  ...overrides
});

export const buildSessionSegmentUpdatePayload = (
  segment: SessionSegment,
  overrides: Partial<Omit<SessionSegment, 'id' | 'userId'>> = {}
): Omit<SessionSegment, 'id' | 'userId'> => ({
  sessionId: segment.sessionId,
  mode: segment.mode,
  riverName: segment.riverName,
  waterType: segment.waterType,
  depthRange: segment.depthRange,
  startedAt: segment.startedAt,
  endedAt: segment.endedAt,
  flySnapshots: segment.flySnapshots,
  rigSetup: segment.rigSetup,
  notes: segment.notes,
  ...overrides
});

export const getSessionMeasurementConfig = (
  session: Session | null | undefined
): { enabled: boolean; unit: CatchLengthUnit } => {
  if (!session) {
    return { enabled: false, unit: 'in' };
  }
  if (session.mode === 'competition') {
    return {
      enabled: session.competitionRequiresMeasurement ?? true,
      unit: session.competitionLengthUnit ?? 'mm'
    };
  }
  return {
    enabled: session.practiceMeasurementEnabled ?? false,
    unit: session.practiceLengthUnit ?? 'in'
  };
};

export const getCompetitionMinimumLength = (lengthUnit: 'mm' | 'cm') => (lengthUnit === 'cm' ? 20 : 200);

export const sumCatchLengths = (events: CatchEvent[]) =>
  events.reduce((sum, event) => sum + (event.lengthValue ?? 0), 0);
