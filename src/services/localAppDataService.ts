import { Experiment, Insight } from '@/types/experiment';
import { SavedRiver, Session } from '@/types/session';
import { UserProfile } from '@/types/user';
import { CatchEvent, SessionSegment } from '@/types/activity';
import { SavedFly } from '@/types/fly';
import {
  Competition,
  CompetitionGroup,
  CompetitionParticipant,
  CompetitionSession,
  CompetitionSessionAssignment,
  Group,
  GroupMembership,
  SharePreference
} from '@/types/group';
import { LeaderFormula, RigPreset } from '@/types/rig';
import {
  createCompetition,
  createCompetitionGroup,
  createCompetitionParticipant,
  createCompetitionSession,
  deleteCompetitionsForUser,
  listCompetitionAssignments,
  listCompetitionGroups,
  listCompetitionParticipants,
  listCompetitions,
  listCompetitionSessions,
  upsertCompetitionAssignment
} from '@/db/competitionRepo';
import { deleteDraftExperimentsForUser, deleteExperiments, deleteExperimentsForUser, listExperiments } from '@/db/experimentRepo';
import {
  createGroup,
  createGroupMembership,
  createSharePreference,
  deleteGroup,
  deleteGroupMembership,
  deleteGroupsForUser,
  deleteSharePreferencesForGroup,
  deleteSharePreferencesForUserAndGroup,
  listGroupMemberships,
  listGroups,
  listSharePreferences,
  upsertSharePreference
} from '@/db/groupRepo';
import { createUser, deleteUser, listUsers, updateUser } from '@/db/userRepo';
import { deleteSavedFliesForUser, listSavedFlies } from '@/db/savedFlyRepo';
import { deleteSavedLeaderFormulasForUser, listSavedLeaderFormulas } from '@/db/savedLeaderFormulaRepo';
import { deleteSavedRigPresetsForUser, listSavedRigPresets } from '@/db/savedRigPresetRepo';
import { deleteSavedRiversForUser, listSavedRivers } from '@/db/savedRiverRepo';
import { deleteSessions, deleteSessionsForUser, listSessions } from '@/db/sessionRepo';
import { deleteSessionSegmentsForSessions, deleteSessionSegmentsForUser, listSessionSegments } from '@/db/sessionSegmentRepo';
import { deleteCatchEventsForSessions, deleteCatchEventsForUser, listCatchEvents } from '@/db/catchEventRepo';
import { getActiveUserId as loadActiveUserId, setActiveUserId as saveActiveUserId } from '@/db/settingsRepo';
import { initDb } from '@/db/schema';
import { generateAnglerComparisons } from '@/engine/anglerComparisonEngine';
import { buildTopFlyRecords, TopFlyRecord } from '@/engine/topFlyEngine';
import type { UserDataCleanupCategory } from '@/app/store';
import { Invite, SponsoredAccess, SyncQueueEntry } from '@/types/remote';
import {
  createInvite,
  createSponsoredAccess,
  deleteAccessRecordsForGroup,
  deleteAccessRecordsForUser,
  listInvites,
  listSponsoredAccess,
  updateInvite,
  updateSponsoredAccess
} from '@/db/accessRepo';
import { createSyncQueueEntry, deleteSyncQueueEntriesForUserReset, listSyncQueueEntries, markAllPendingSyncEntriesAsSynced } from '@/db/syncRepo';
import { classifyExperimentIntegrity, classifySessionIntegrity } from '@/services/dataIntegrityService';

export interface LoadedLocalAppData {
  users: UserProfile[];
  activeUserId: number | null;
  sessions: Session[];
  allSessions: Session[];
  sessionSegments: SessionSegment[];
  catchEvents: CatchEvent[];
  allCatchEvents: CatchEvent[];
  experiments: Experiment[];
  allExperiments: Experiment[];
  savedFlies: SavedFly[];
  savedLeaderFormulas: LeaderFormula[];
  savedRigPresets: RigPreset[];
  savedRivers: SavedRiver[];
  groups: Group[];
  groupMemberships: GroupMembership[];
  sharePreferences: SharePreference[];
  competitions: Competition[];
  competitionGroups: CompetitionGroup[];
  competitionSessions: CompetitionSession[];
  competitionParticipants: CompetitionParticipant[];
  competitionAssignments: CompetitionSessionAssignment[];
  invites: Invite[];
  sponsoredAccess: SponsoredAccess[];
  syncQueue: SyncQueueEntry[];
  anglerComparisons: Insight[];
  topFlyRecords: TopFlyRecord[];
}

export const bootstrapLocalApp = async (): Promise<{ users: UserProfile[]; activeUserId: number | null }> => {
  await initDb();
  let existingUsers = await listUsers();
  if (!existingUsers.length) {
    const id = await createUser({ name: 'Owner Account', role: 'owner', accessLevel: 'power_user', subscriptionStatus: 'power_user' });
    await saveActiveUserId(id);
    existingUsers = await listUsers();
    return { users: existingUsers, activeUserId: id };
  }

  const owner = existingUsers.find((user) => user.role === 'owner');
  if (!owner && existingUsers[0]) {
    const storedActiveUserId = await loadActiveUserId();
    const ownerId = storedActiveUserId && existingUsers.some((user) => user.id === storedActiveUserId) ? storedActiveUserId : existingUsers[0].id;
    await updateUser(ownerId, { role: 'owner', accessLevel: 'power_user', subscriptionStatus: 'power_user' });
    existingUsers = await listUsers();
  }

  const storedActiveUserId = await loadActiveUserId();
  const nextActiveUserId = existingUsers.some((user) => user.id === storedActiveUserId) ? storedActiveUserId : existingUsers[0].id;
  if (nextActiveUserId) {
    await saveActiveUserId(nextActiveUserId);
  }
  return { users: existingUsers, activeUserId: nextActiveUserId };
};

export const loadLocalAppData = async (preferredUserId?: number | null): Promise<LoadedLocalAppData> => {
  const users = await listUsers();
  const activeUserId = preferredUserId ?? users[0]?.id ?? null;

  if (!activeUserId) {
    return {
      users,
      activeUserId: null,
      sessions: [],
      allSessions: [],
      sessionSegments: [],
      catchEvents: [],
      allCatchEvents: [],
      experiments: [],
      allExperiments: [],
      savedFlies: [],
      savedLeaderFormulas: [],
      savedRigPresets: [],
      savedRivers: [],
      groups: [],
      groupMemberships: [],
      sharePreferences: [],
      competitions: [],
      competitionGroups: [],
      competitionSessions: [],
      competitionParticipants: [],
      competitionAssignments: [],
      invites: [],
      sponsoredAccess: [],
      syncQueue: [],
      anglerComparisons: [],
      topFlyRecords: []
    };
  }

  const [sessions, sessionSegments, catchEvents, experiments, savedFlies, savedLeaderFormulas, savedRigPresets, savedRivers, groups, groupMemberships, sharePreferences, competitions, competitionGroups, competitionSessions, competitionParticipants, competitionAssignments, invites, sponsoredAccess, syncQueue] = await Promise.all([
    listSessions(activeUserId),
    listSessionSegments(activeUserId),
    listCatchEvents(activeUserId),
    listExperiments(activeUserId),
    listSavedFlies(activeUserId),
    listSavedLeaderFormulas(activeUserId),
    listSavedRigPresets(activeUserId),
    listSavedRivers(activeUserId),
    listGroups(),
    listGroupMemberships(),
    listSharePreferences(),
    listCompetitions(),
    listCompetitionGroups(),
    listCompetitionSessions(),
    listCompetitionParticipants(),
    listCompetitionAssignments(),
    listInvites(),
    listSponsoredAccess(),
    listSyncQueueEntries()
  ]);
  const allSessionLists = await Promise.all(users.map((user) => listSessions(user.id)));
  const allExperimentLists = await Promise.all(users.map((user) => listExperiments(user.id)));
  const allCatchLists = await Promise.all(users.map((user) => listCatchEvents(user.id)));

  return {
    users,
    activeUserId,
    sessions,
    allSessions: allSessionLists.flat(),
    sessionSegments,
    catchEvents,
    allCatchEvents: allCatchLists.flat(),
    experiments,
    allExperiments: allExperimentLists.flat(),
    savedFlies,
    savedLeaderFormulas,
    savedRigPresets,
    savedRivers,
    groups,
    groupMemberships,
    sharePreferences,
    competitions,
    competitionGroups,
    competitionSessions,
    competitionParticipants,
    competitionAssignments,
    invites,
    sponsoredAccess,
    syncQueue,
    anglerComparisons: generateAnglerComparisons(users, allSessionLists.flat(), allExperimentLists.flat().filter((experiment) => experiment.status !== 'draft')),
    topFlyRecords: buildTopFlyRecords(sessions, experiments.filter((experiment) => experiment.status !== 'draft'))
  };
};

export const createLocalGroupWithDefaults = async (activeUserId: number, name: string) => {
  const group = await createGroup({ name, createdByUserId: activeUserId });
  await createGroupMembership({ groupId: group.id, userId: activeUserId, role: 'organizer' });
  await createSharePreference({
    groupId: group.id,
    userId: activeUserId,
    shareJournalEntries: false,
    sharePracticeSessions: false,
    shareCompetitionSessions: false,
    shareInsights: false
  });
  return group;
};

export const joinLocalGroupByCode = async (
  activeUserId: number,
  joinCode: string,
  groups: Group[],
  groupMemberships: GroupMembership[]
) => {
  const target = groups.find((group) => group.joinCode.toLowerCase() === joinCode.trim().toLowerCase());
  if (!target) throw new Error('Group code not found.');
  const existing = groupMemberships.find((membership) => membership.groupId === target.id && membership.userId === activeUserId);
  if (existing) return existing;
  const membership = await createGroupMembership({ groupId: target.id, userId: activeUserId, role: 'member' });
  await createSharePreference({
    groupId: target.id,
    userId: activeUserId,
    shareJournalEntries: false,
    sharePracticeSessions: false,
    shareCompetitionSessions: false,
    shareInsights: false
  });
  return membership;
};

export const updateLocalSharePreference = async (
  activeUserId: number,
  groupId: number,
  updates: Omit<SharePreference, 'id' | 'userId' | 'groupId' | 'updatedAt'>
) => upsertSharePreference({ userId: activeUserId, groupId, ...updates });

const pruneEmptyGroupIfNeeded = async (groupId: number) => {
  const memberships = await listGroupMemberships();
  const remainingMemberships = memberships.filter((membership) => membership.groupId === groupId);
  if (remainingMemberships.length) return false;
  await deleteSharePreferencesForGroup(groupId);
  await deleteAccessRecordsForGroup(groupId);
  await deleteGroup(groupId);
  return true;
};

export const leaveLocalGroup = async (activeUserId: number, groupId: number) => {
  const memberships = await listGroupMemberships();
  const membership = memberships.find((entry) => entry.userId === activeUserId && entry.groupId === groupId);
  if (!membership) throw new Error('Group membership not found.');

  await deleteSharePreferencesForUserAndGroup(activeUserId, groupId);
  await deleteGroupMembership(membership.id);
  const deletedGroup = await pruneEmptyGroupIfNeeded(groupId);

  return {
    membershipId: membership.id,
    groupId,
    deletedGroup
  };
};

export const deleteLocalGroup = async (activeUserId: number, groupId: number) => {
  const groups = await listGroups();
  const targetGroup = groups.find((entry) => entry.id === groupId);
  if (!targetGroup) throw new Error('Group not found.');
  if (targetGroup.createdByUserId !== activeUserId) {
    throw new Error('Only the organizer can delete this group.');
  }

  await deleteSharePreferencesForGroup(groupId);
  await deleteAccessRecordsForGroup(groupId);
  await deleteGroup(groupId);
};

export const clearLocalGroupsForUser = async (userId: number) => {
  const memberships = await listGroupMemberships();
  const ownedGroups = (await listGroups()).filter((group) => group.createdByUserId === userId);
  const joinedMemberships = memberships.filter((membership) => membership.userId === userId);
  let removedGroups = 0;
  let removedMemberships = 0;

  for (const membership of joinedMemberships) {
    await deleteSharePreferencesForUserAndGroup(userId, membership.groupId);
    await deleteGroupMembership(membership.id);
    removedMemberships += 1;
    const deletedGroup = await pruneEmptyGroupIfNeeded(membership.groupId);
    if (deletedGroup) {
      removedGroups += 1;
    }
  }

  for (const group of ownedGroups) {
    const stillExists = (await listGroups()).some((entry) => entry.id === group.id);
    if (!stillExists) continue;
    await deleteSharePreferencesForGroup(group.id);
    await deleteAccessRecordsForGroup(group.id);
    await deleteGroup(group.id);
    removedGroups += 1;
  }

  return {
    removedGroups,
    removedMemberships
  };
};

export const createLocalCompetitionWithParticipant = async (
  activeUserId: number,
  payload: {
    name: string;
    groupCount: number;
    sessions: Array<{
      sessionNumber: number;
      startTime: string;
      endTime: string;
    }>;
  }
) => {
  const competition = await createCompetition({
    name: payload.name,
    organizerUserId: activeUserId,
    groupCount: payload.groupCount,
    sessionCount: payload.sessions.length
  });
  await createCompetitionParticipant({ competitionId: competition.id, userId: activeUserId });
  for (let index = 0; index < payload.groupCount; index += 1) {
    await createCompetitionGroup({
      competitionId: competition.id,
      label: String.fromCharCode(65 + index),
      sortOrder: index + 1
    });
  }
  for (const session of payload.sessions) {
    await createCompetitionSession({
      competitionId: competition.id,
      sessionNumber: session.sessionNumber,
      startTime: session.startTime,
      endTime: session.endTime
    });
  }
  return competition;
};

export const joinLocalCompetitionByCode = async (
  activeUserId: number,
  joinCode: string,
  competitions: Competition[],
  competitionParticipants: CompetitionParticipant[]
) => {
  const target = competitions.find((competition) => competition.joinCode.toLowerCase() === joinCode.trim().toLowerCase());
  if (!target) throw new Error('Competition code not found.');
  const existing = competitionParticipants.find(
    (participant) => participant.competitionId === target.id && participant.userId === activeUserId
  );
  if (existing) return existing;
  return createCompetitionParticipant({ competitionId: target.id, userId: activeUserId });
};

export const saveLocalCompetitionAssignment = async (
  userId: number,
  payload: Omit<CompetitionSessionAssignment, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
) => upsertCompetitionAssignment({ ...payload, userId });

export const createLocalInvite = async (
  activeUserId: number,
  payload: { targetGroupId: number; targetName?: string | null }
) =>
  createInvite({
    inviterUserId: activeUserId,
    targetGroupId: payload.targetGroupId,
    targetName: payload.targetName ?? null,
    grantType: 'power_user_group'
  });

export const acceptLocalInvite = async (
  activeUserId: number,
  inviteCode: string,
  invites: Invite[],
  groupMemberships: GroupMembership[]
) => {
  const invite = invites.find(
    (entry) =>
      entry.inviteCode.toLowerCase() === inviteCode.trim().toLowerCase() &&
      entry.status === 'pending'
  );
  if (!invite) throw new Error('Invite code not found.');

  const existingMembership = groupMemberships.find(
    (membership) => membership.groupId === invite.targetGroupId && membership.userId === activeUserId
  );
  if (!existingMembership) {
    await createGroupMembership({ groupId: invite.targetGroupId, userId: activeUserId, role: 'member' });
    await createSharePreference({
      groupId: invite.targetGroupId,
      userId: activeUserId,
      shareJournalEntries: false,
      sharePracticeSessions: false,
      shareCompetitionSessions: false,
      shareInsights: false
    });
  }

  const existingSponsored = (await listSponsoredAccess()).find(
    (entry) =>
      entry.sponsorUserId === invite.inviterUserId &&
      entry.sponsoredUserId === activeUserId &&
      entry.targetGroupId === invite.targetGroupId &&
      entry.active
  );
  if (!existingSponsored) {
    await createSponsoredAccess({
      sponsorUserId: invite.inviterUserId,
      sponsoredUserId: activeUserId,
      targetGroupId: invite.targetGroupId,
      grantedAccessLevel: 'power_user',
      active: true
    });
  }

  await updateUser(activeUserId, {
    accessLevel: 'power_user',
    subscriptionStatus: 'power_user',
    grantedByUserId: invite.inviterUserId
  });
  await updateInvite(invite.id, {
    status: 'accepted',
    acceptedByUserId: activeUserId,
    acceptedAt: new Date().toISOString()
  });
  return invite;
};

export const revokeLocalSponsoredAccess = async (
  sponsoredAccessId: number
) => {
  const sponsoredEntries = await listSponsoredAccess();
  const target = sponsoredEntries.find((entry) => entry.id === sponsoredAccessId);
  if (!target) throw new Error('Sponsored access record not found.');
  await updateSponsoredAccess(sponsoredAccessId, { active: false, revokedAt: new Date().toISOString() });
  const users = await listUsers();
  const sponsoredUser = users.find((user) => user.id === target.sponsoredUserId);
  if (
    sponsoredUser &&
    sponsoredUser.accessLevel === 'power_user' &&
    sponsoredUser.grantedByUserId === target.sponsorUserId
  ) {
    await updateUser(sponsoredUser.id, {
      accessLevel: 'free',
      subscriptionStatus: 'not_started',
      grantedByUserId: null
    });
  }
};

export const enqueueLocalSyncChange = async (
  payload: Omit<SyncQueueEntry, 'id' | 'createdAt' | 'status' | 'syncedAt' | 'errorMessage'>
) => createSyncQueueEntry(payload);

export const flushLocalSyncQueue = async () => {
  await markAllPendingSyncEntriesAsSynced();
};

export const clearLocalFishingDataForUser = async (
  userId: number,
  options: { preserveSyncQueue?: boolean } = {}
) => {
  await deleteCatchEventsForUser(userId);
  await deleteSessionSegmentsForUser(userId);
  await deleteExperimentsForUser(userId);
  await deleteSessionsForUser(userId);
  await deleteCompetitionsForUser(userId);
  await deleteGroupsForUser(userId);
  await deleteSavedFliesForUser(userId);
  await deleteSavedLeaderFormulasForUser(userId);
  await deleteSavedRigPresetsForUser(userId);
  await deleteSavedRiversForUser(userId);
  await deleteAccessRecordsForUser(userId);
  if (!options.preserveSyncQueue) {
    await deleteSyncQueueEntriesForUserReset();
  }
};

export const clearLocalUserDataCategories = async (userId: number, categories: UserDataCleanupCategory[]) => {
  const targets = categories.includes('all')
    ? ['experiments', 'sessions', 'flies', 'formulas', 'rig_presets', 'rivers', 'groups']
    : categories;

  if (targets.includes('problem') || targets.includes('incomplete') || targets.includes('archived')) {
    const [sessions, experiments] = await Promise.all([listSessions(userId), listExperiments(userId, { includeArchived: true })]);
    const sessionMap = new Map(sessions.map((session) => [session.id, session]));

    if (targets.includes('problem')) {
      const problemSessionIds = sessions
        .filter((session) => {
          const integrity = classifySessionIntegrity(session);
          return integrity.state === 'legacy_unreviewed' || integrity.state === 'orphaned';
        })
        .map((session) => session.id);
      if (problemSessionIds.length) {
        const linkedProblemExperimentIds = experiments
          .filter((experiment) => problemSessionIds.includes(experiment.sessionId))
          .map((experiment) => experiment.id);
        await deleteCatchEventsForSessions(problemSessionIds);
        await deleteSessionSegmentsForSessions(problemSessionIds);
        if (linkedProblemExperimentIds.length) {
          await deleteExperiments(linkedProblemExperimentIds);
        }
        await deleteSessions(problemSessionIds);
      }
      const orphanedExperimentIds = experiments
        .filter((experiment) => classifyExperimentIntegrity(experiment, sessionMap.get(experiment.sessionId)).state === 'orphaned')
        .map((experiment) => experiment.id);
      if (orphanedExperimentIds.length) {
        await deleteExperiments(orphanedExperimentIds);
      }
    }

    if (targets.includes('incomplete')) {
      const incompleteSessionIds = sessions
        .filter((session) => classifySessionIntegrity(session).state === 'incomplete')
        .map((session) => session.id);
      if (incompleteSessionIds.length) {
        const linkedIncompleteExperimentIds = experiments
          .filter((experiment) => incompleteSessionIds.includes(experiment.sessionId))
          .map((experiment) => experiment.id);
        await deleteCatchEventsForSessions(incompleteSessionIds);
        await deleteSessionSegmentsForSessions(incompleteSessionIds);
        if (linkedIncompleteExperimentIds.length) {
          await deleteExperiments(linkedIncompleteExperimentIds);
        }
        await deleteSessions(incompleteSessionIds);
      }
      await deleteDraftExperimentsForUser(userId);
    }

    if (targets.includes('archived')) {
      const archivedIds = experiments.filter((experiment) => !!experiment.archivedAt).map((experiment) => experiment.id);
      if (archivedIds.length) {
        await deleteExperiments(archivedIds);
      }
    }
  }

  if (targets.includes('sessions')) {
    await deleteCatchEventsForUser(userId);
    await deleteSessionSegmentsForUser(userId);
    await deleteExperimentsForUser(userId);
    await deleteSessionsForUser(userId);
  } else if (targets.includes('experiments')) {
    await deleteExperimentsForUser(userId);
  }

  if (targets.includes('drafts')) {
    await deleteDraftExperimentsForUser(userId);
  }
  if (targets.includes('flies')) {
    await deleteSavedFliesForUser(userId);
  }
  if (targets.includes('formulas')) {
    await deleteSavedLeaderFormulasForUser(userId);
  }
  if (targets.includes('rig_presets')) {
    await deleteSavedRigPresetsForUser(userId);
  }
  if (targets.includes('rivers')) {
    await deleteSavedRiversForUser(userId);
  }
};

export const deleteLocalAnglerData = async (userId: number) => {
  await clearLocalFishingDataForUser(userId);
  await deleteUser(userId);
};
