import { Session, SessionGroupShare } from '@/types/session';

export const getSessionSharedGroupIds = (
  session: Pick<Session, 'id' | 'sharedGroupId' | 'sharedGroupIds'>,
  sessionGroupShares: Array<Pick<SessionGroupShare, 'sessionId' | 'groupId'>>
) => {
  const shareGroupIds = sessionGroupShares
    .filter((share) => share.sessionId === session.id)
    .map((share) => share.groupId);
  const allGroupIds = [...shareGroupIds, ...(session.sharedGroupIds ?? []), ...(session.sharedGroupId ? [session.sharedGroupId] : [])];
  return [...new Set(allGroupIds)];
};

export const applySessionShareIds = (
  sessions: Session[],
  sessionGroupShares: Array<Pick<SessionGroupShare, 'sessionId' | 'groupId'>>
) =>
  sessions.map((session) => {
    const sharedGroupIds = getSessionSharedGroupIds(session, sessionGroupShares);
    return {
      ...session,
      sharedGroupIds,
      sharedGroupId: sharedGroupIds[0] ?? session.sharedGroupId
    };
  });

export const describeSessionShareIntent = (selectedGroups: { id: number; name: string }[]) => {
  if (!selectedGroups.length) return 'Private';
  if (selectedGroups.length === 1) return `Shared with ${selectedGroups[0].name}`;
  if (selectedGroups.length === 2) return `Shared with ${selectedGroups[0].name} and ${selectedGroups[1].name}`;
  return `Shared with ${selectedGroups.length} groups`;
};
