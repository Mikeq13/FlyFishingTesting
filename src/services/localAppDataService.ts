import { Experiment, Insight } from '@/types/experiment';
import { SavedRiver, Session } from '@/types/session';
import { UserProfile } from '@/types/user';
import { CatchEvent, SessionSegment } from '@/types/activity';
import { SavedFly } from '@/types/fly';
import { Competition, CompetitionParticipant, CompetitionSessionAssignment, Group, GroupMembership, SharePreference } from '@/types/group';
import { LeaderFormula, RigPreset } from '@/types/rig';
import { createCompetition, createCompetitionParticipant, deleteCompetitionsForUser, listCompetitionAssignments, listCompetitionParticipants, listCompetitions, upsertCompetitionAssignment } from '@/db/competitionRepo';
import { deleteDraftExperimentsForUser, deleteExperimentsForUser, listExperiments } from '@/db/experimentRepo';
import { createGroup, createGroupMembership, createSharePreference, deleteGroupsForUser, listGroupMemberships, listGroups, listSharePreferences, upsertSharePreference } from '@/db/groupRepo';
import { createUser, deleteUser, listUsers, updateUser } from '@/db/userRepo';
import { deleteSavedFliesForUser, listSavedFlies } from '@/db/savedFlyRepo';
import { deleteSavedLeaderFormulasForUser, listSavedLeaderFormulas } from '@/db/savedLeaderFormulaRepo';
import { deleteSavedRigPresetsForUser, listSavedRigPresets } from '@/db/savedRigPresetRepo';
import { deleteSavedRiversForUser, listSavedRivers } from '@/db/savedRiverRepo';
import { deleteSessionsForUser, listSessions } from '@/db/sessionRepo';
import { deleteSessionSegmentsForUser, listSessionSegments } from '@/db/sessionSegmentRepo';
import { deleteCatchEventsForUser, listCatchEvents } from '@/db/catchEventRepo';
import { getActiveUserId as loadActiveUserId, setActiveUserId as saveActiveUserId } from '@/db/settingsRepo';
import { initDb } from '@/db/schema';
import { generateAnglerComparisons } from '@/engine/anglerComparisonEngine';
import { buildTopFlyRecords, TopFlyRecord } from '@/engine/topFlyEngine';
import type { UserDataCleanupCategory } from '@/app/store';

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
  competitionParticipants: CompetitionParticipant[];
  competitionAssignments: CompetitionSessionAssignment[];
  anglerComparisons: Insight[];
  topFlyRecords: TopFlyRecord[];
}

export const bootstrapLocalApp = async (): Promise<{ users: UserProfile[]; activeUserId: number | null }> => {
  await initDb();
  let existingUsers = await listUsers();
  if (!existingUsers.length) {
    const id = await createUser({ name: 'Primary Angler', role: 'owner', accessLevel: 'power_user', subscriptionStatus: 'power_user' });
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
      competitionParticipants: [],
      competitionAssignments: [],
      anglerComparisons: [],
      topFlyRecords: []
    };
  }

  const [sessions, sessionSegments, catchEvents, experiments, savedFlies, savedLeaderFormulas, savedRigPresets, savedRivers, groups, groupMemberships, sharePreferences, competitions, competitionParticipants, competitionAssignments] = await Promise.all([
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
    listCompetitionParticipants(),
    listCompetitionAssignments()
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
    competitionParticipants,
    competitionAssignments,
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

export const createLocalCompetitionWithParticipant = async (
  activeUserId: number,
  payload: Omit<Competition, 'id' | 'organizerUserId' | 'createdAt' | 'joinCode'>
) => {
  const competition = await createCompetition({ ...payload, organizerUserId: activeUserId });
  await createCompetitionParticipant({ competitionId: competition.id, userId: activeUserId });
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
  activeUserId: number,
  payload: Omit<CompetitionSessionAssignment, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
) => upsertCompetitionAssignment({ ...payload, userId: activeUserId });

export const clearLocalFishingDataForUser = async (userId: number) => {
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
};

export const clearLocalUserDataCategories = async (userId: number, categories: UserDataCleanupCategory[]) => {
  const targets = categories.includes('all')
    ? ['experiments', 'sessions', 'flies', 'formulas', 'rig_presets', 'rivers']
    : categories;

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
