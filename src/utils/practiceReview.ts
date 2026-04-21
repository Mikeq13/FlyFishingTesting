import { CatchEvent, SessionSegment } from '@/types/activity';
import { Session } from '@/types/session';

export interface PracticeReviewSegment {
  segment: SessionSegment;
  catches: CatchEvent[];
  durationMs: number | null;
}

const formatDuration = (totalSeconds: number) => {
  const safeSeconds = Math.max(0, totalSeconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
};

export const getPracticeSessionDurationMs = (session: Session): number | null => {
  const startedAt = session.startAt ?? session.date;
  if (!startedAt || !session.endedAt) return null;
  const durationMs = new Date(session.endedAt).getTime() - new Date(startedAt).getTime();
  return Number.isFinite(durationMs) && durationMs > 0 ? durationMs : null;
};

export const getPracticeCatchesPerHour = (session: Session, catches: CatchEvent[]): number | null => {
  const durationMs = getPracticeSessionDurationMs(session);
  if (!durationMs) return null;
  const hours = durationMs / 3_600_000;
  if (!Number.isFinite(hours) || hours <= 0) return null;
  return catches.length / hours;
};

export const formatPracticeDuration = (durationMs: number | null): string | null => {
  if (!durationMs) return null;
  return formatDuration(Math.floor(durationMs / 1000));
};

export const buildPracticeReviewSegments = (
  session: Session,
  sessionSegments: SessionSegment[],
  catchEvents: CatchEvent[]
): PracticeReviewSegment[] => {
  const sortedSegments = sessionSegments
    .filter((segment) => segment.sessionId === session.id)
    .slice()
    .sort((left, right) => new Date(left.startedAt).getTime() - new Date(right.startedAt).getTime());

  return sortedSegments.map((segment, index) => {
    const nextSegment = sortedSegments[index + 1];
    const endedAt = segment.endedAt ?? nextSegment?.startedAt ?? session.endedAt;
    const durationMs =
      endedAt != null
        ? Math.max(0, new Date(endedAt).getTime() - new Date(segment.startedAt).getTime()) || null
        : null;

    return {
      segment,
      catches: catchEvents
        .filter((event) => event.sessionId === session.id && event.segmentId === segment.id)
        .slice()
        .sort((left, right) => new Date(left.caughtAt).getTime() - new Date(right.caughtAt).getTime()),
      durationMs
    };
  });
};

export const describePracticeRig = (segment: SessionSegment): string => {
  const rigSetup = segment.rigSetup;
  if (!rigSetup) return 'Rig not logged';
  const leader = rigSetup.leaderFormulaName?.trim() || (rigSetup.leaderFormulaSectionsSnapshot.length ? 'Custom leader' : 'Leader not set');
  const flyCount = rigSetup.assignments.length || segment.flySnapshots.length || 0;
  return `${leader} | ${flyCount} ${flyCount === 1 ? 'fly' : 'flies'}`;
};

export const describePracticeFlies = (segment: SessionSegment): string => {
  const flies = segment.flySnapshots
    .map((fly) => fly.name.trim())
    .filter((name) => !!name);

  return flies.length ? flies.join(', ') : 'No fly snapshot logged';
};

