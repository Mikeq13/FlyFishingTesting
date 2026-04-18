import { Experiment } from '@/types/experiment';
import { Group, GroupMembership, InsightsContextMode, SharePreference } from '@/types/group';
import { Session } from '@/types/session';
import { UserProfile } from '@/types/user';

const canShareCategory = (
  sharePreferences: SharePreference[],
  userId: number,
  groupId: number,
  mode: Session['mode']
) => {
  const preference = sharePreferences.find((item) => item.userId === userId && item.groupId === groupId);
  if (!preference) return false;
  if (mode === 'practice') return preference.sharePracticeSessions;
  if (mode === 'competition') return preference.shareCompetitionSessions;
  return preference.shareJournalEntries;
};

export const getJoinedGroupsForUser = (
  currentUserId: number | null | undefined,
  groups: Group[],
  groupMemberships: GroupMembership[]
) =>
  groupMemberships
    .filter((membership) => membership.userId === currentUserId)
    .map((membership) => groups.find((group) => group.id === membership.groupId))
    .filter((group): group is Group => !!group);

export const getVisibleFriendOptions = (
  currentUserId: number | null | undefined,
  selectedGroupId: number | null,
  groupMemberships: GroupMembership[],
  users: UserProfile[]
) => {
  if (!selectedGroupId) return [];
  return groupMemberships
    .filter((membership) => membership.groupId === selectedGroupId && membership.userId !== currentUserId)
    .map((membership) => users.find((user) => user.id === membership.userId))
    .filter((user): user is UserProfile => !!user);
};

export const filterSessionsForInsightsContext = (params: {
  currentUserId: number | null | undefined;
  mode: InsightsContextMode;
  selectedGroupId: number | null;
  selectedFriendUserId: number | null;
  sessions: Session[];
  sharePreferences: SharePreference[];
}) =>
  params.sessions.filter((session) => {
    if (params.mode === 'mine') {
      return session.userId === params.currentUserId;
    }
    const sharedGroupIds = session.sharedGroupIds ?? (session.sharedGroupId ? [session.sharedGroupId] : []);
    if (!params.selectedGroupId || !sharedGroupIds.includes(params.selectedGroupId)) {
      return false;
    }
    if (!canShareCategory(params.sharePreferences, session.userId, params.selectedGroupId, session.mode)) {
      return false;
    }
    if (params.mode === 'friend') {
      return session.userId === params.selectedFriendUserId;
    }
    return true;
  });

export const filterExperimentsForInsightsContext = (
  experiments: Experiment[],
  visibleSessionIds: Set<number>
) => experiments.filter((experiment) => visibleSessionIds.has(experiment.sessionId));
