import { Experiment } from '@/types/experiment';
import { CatchEvent, SessionSegment } from '@/types/activity';

export interface SessionDeleteConsequences {
  experimentCount: number;
  catchLogCount: number;
  sessionSegmentCount: number;
}

export const getSessionDeleteConsequences = (
  sessionId: number,
  experiments: Experiment[],
  catchEvents: CatchEvent[],
  sessionSegments: SessionSegment[]
): SessionDeleteConsequences => ({
  experimentCount: experiments.filter((experiment) => experiment.sessionId === sessionId).length,
  catchLogCount: catchEvents.filter((event) => event.sessionId === sessionId).length,
  sessionSegmentCount: sessionSegments.filter((segment) => segment.sessionId === sessionId).length
});

export const buildSessionDeleteMessage = (consequences: SessionDeleteConsequences) => {
  const consequenceParts = [
    'this session',
    consequences.experimentCount
      ? `${consequences.experimentCount} linked experiment${consequences.experimentCount === 1 ? '' : 's'}`
      : null,
    consequences.catchLogCount
      ? `${consequences.catchLogCount} catch log${consequences.catchLogCount === 1 ? '' : 's'}`
      : null,
    consequences.sessionSegmentCount
      ? `${consequences.sessionSegmentCount} session segment${consequences.sessionSegmentCount === 1 ? '' : 's'}`
      : null
  ].filter((value): value is string => !!value);

  if (consequenceParts.length === 1) {
    return 'This will permanently delete this session.';
  }

  const lastPart = consequenceParts.pop();
  return `This will permanently delete ${consequenceParts.join(', ')}, and ${lastPart}.`;
};
