import { RemoteAccessSnapshot } from '@/types/remote';
import { supabase } from './supabaseClient';
import { REMOTE_ACCESS_SELECTS } from './remoteSelects';
import {
  createRemoteEntityMaps,
  mapRemoteCompetition,
  mapRemoteCompetitionAssignment,
  mapRemoteCompetitionGroup,
  mapRemoteCompetitionParticipant,
  mapRemoteCompetitionSession,
  mapRemoteGroup,
  mapRemoteGroupMembership,
  mapRemoteInvite,
  mapRemoteSharePreference,
  mapRemoteSponsoredAccess,
  mapRemoteUser
} from './remoteMappingService';

export const fetchRemoteAccessSnapshot = async (
  currentAuthUserId: string
): Promise<RemoteAccessSnapshot> => {
  const [
    profilesResponse,
    groupsResponse,
    groupMembershipsResponse,
    sharePreferencesResponse,
    invitesResponse,
    sponsoredAccessResponse,
    competitionsResponse,
    competitionGroupsResponse,
    competitionSessionsResponse,
    competitionParticipantsResponse,
    competitionAssignmentsResponse
  ] = await Promise.all([
    supabase.from('profiles').select(REMOTE_ACCESS_SELECTS.profiles),
    supabase.from('groups').select(REMOTE_ACCESS_SELECTS.groups),
    supabase.from('group_memberships').select(REMOTE_ACCESS_SELECTS.groupMemberships),
    supabase.from('share_preferences').select(REMOTE_ACCESS_SELECTS.sharePreferences),
    supabase.from('invites').select(REMOTE_ACCESS_SELECTS.invites),
    supabase.from('sponsored_access').select(REMOTE_ACCESS_SELECTS.sponsoredAccess),
    supabase.from('competitions').select(REMOTE_ACCESS_SELECTS.competitions),
    supabase.from('competition_groups').select(REMOTE_ACCESS_SELECTS.competitionGroups),
    supabase.from('competition_sessions').select(REMOTE_ACCESS_SELECTS.competitionSessions),
    supabase.from('competition_participants').select(REMOTE_ACCESS_SELECTS.competitionParticipants),
    supabase.from('competition_session_assignments').select(REMOTE_ACCESS_SELECTS.competitionAssignments)
  ]);

  const responses = [
    profilesResponse,
    groupsResponse,
    groupMembershipsResponse,
    sharePreferencesResponse,
    invitesResponse,
    sponsoredAccessResponse,
    competitionsResponse,
    competitionGroupsResponse,
    competitionSessionsResponse,
    competitionParticipantsResponse,
    competitionAssignmentsResponse
  ];
  const error = responses.find((response) => response.error)?.error;
  if (error) throw error;

  const profiles = profilesResponse.data ?? [];
  const groups = groupsResponse.data ?? [];
  const allMembershipRows = groupMembershipsResponse.data ?? [];
  const allInviteRows = invitesResponse.data ?? [];
  const allSponsoredAccessRows = sponsoredAccessResponse.data ?? [];
  const competitions = competitionsResponse.data ?? [];
  const competitionGroups = competitionGroupsResponse.data ?? [];
  const competitionSessions = competitionSessionsResponse.data ?? [];
  const competitionAssignments = competitionAssignmentsResponse.data ?? [];

  const accessibleGroupIds = new Set<string>([
    ...groups.filter((row) => row.owner_auth_user_id === currentAuthUserId).map((row) => row.id as string),
    ...allMembershipRows.filter((row) => row.member_auth_user_id === currentAuthUserId).map((row) => row.group_id as string),
    ...allInviteRows
      .filter((row) => row.inviter_auth_user_id === currentAuthUserId || row.accepted_by_auth_user_id === currentAuthUserId)
      .map((row) => row.target_group_id as string),
    ...allSponsoredAccessRows
      .filter((row) => row.sponsor_auth_user_id === currentAuthUserId || row.sponsored_auth_user_id === currentAuthUserId)
      .map((row) => row.target_group_id as string)
  ]);
  const filteredGroups = groups.filter((row) => accessibleGroupIds.has(row.id as string));

  const allParticipantRows = competitionParticipantsResponse.data ?? [];
  const accessibleCompetitionIds = new Set<string>([
    ...competitions.filter((row) => row.organizer_auth_user_id === currentAuthUserId).map((row) => row.id as string),
    ...allParticipantRows
      .filter((row) => row.participant_auth_user_id === currentAuthUserId)
      .map((row) => row.competition_id as string)
  ]);
  const filteredCompetitions = competitions.filter((row) => accessibleCompetitionIds.has(row.id as string));
  const filteredCompetitionGroups = competitionGroups.filter((row) => accessibleCompetitionIds.has(row.competition_id as string));
  const filteredCompetitionSessions = competitionSessions.filter((row) => accessibleCompetitionIds.has(row.competition_id as string));
  const filteredCompetitionAssignments = competitionAssignments.filter((row) =>
    accessibleCompetitionIds.has(row.competition_id as string)
  );

  const entityMaps = createRemoteEntityMaps(currentAuthUserId, {
    profiles,
    groups: filteredGroups,
    competitions: filteredCompetitions,
    competitionGroups: filteredCompetitionGroups,
    competitionSessions: filteredCompetitionSessions,
    competitionAssignments: filteredCompetitionAssignments
  });

  return {
    users: profiles.map((row) => mapRemoteUser(row, currentAuthUserId)),
    groups: filteredGroups.map((row) => mapRemoteGroup(row, currentAuthUserId)),
    groupMemberships: allMembershipRows
      .filter((row) => accessibleGroupIds.has(row.group_id as string))
      .map((row) =>
      mapRemoteGroupMembership(row, currentAuthUserId, entityMaps)
    ),
    sharePreferences: (sharePreferencesResponse.data ?? [])
      .filter((row) => accessibleGroupIds.has(row.group_id as string))
      .map((row) =>
      mapRemoteSharePreference(row, currentAuthUserId, entityMaps)
    ),
    invites: allInviteRows
      .filter(
        (row) =>
          accessibleGroupIds.has(row.target_group_id as string) &&
          (row.inviter_auth_user_id === currentAuthUserId || row.accepted_by_auth_user_id === currentAuthUserId)
      )
      .map((row) => mapRemoteInvite(row, currentAuthUserId, entityMaps)),
    sponsoredAccess: allSponsoredAccessRows
      .filter(
        (row) =>
          accessibleGroupIds.has(row.target_group_id as string) &&
          (row.sponsor_auth_user_id === currentAuthUserId || row.sponsored_auth_user_id === currentAuthUserId)
      )
      .map((row) =>
      mapRemoteSponsoredAccess(row, currentAuthUserId, entityMaps)
    ),
    competitions: filteredCompetitions.map((row) => mapRemoteCompetition(row, currentAuthUserId)),
    competitionGroups: filteredCompetitionGroups.map((row) =>
      mapRemoteCompetitionGroup(row, currentAuthUserId, entityMaps)
    ),
    competitionSessions: filteredCompetitionSessions.map((row) =>
      mapRemoteCompetitionSession(row, currentAuthUserId, entityMaps)
    ),
    competitionParticipants: allParticipantRows
      .filter((row) => accessibleCompetitionIds.has(row.competition_id as string))
      .map((row) =>
      mapRemoteCompetitionParticipant(row, currentAuthUserId, entityMaps)
    ),
    competitionAssignments: filteredCompetitionAssignments.map((row) =>
      mapRemoteCompetitionAssignment(row, currentAuthUserId, entityMaps)
    ),
    entityMaps
  };
};
