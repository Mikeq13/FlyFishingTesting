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

  const mappedGroups = filteredGroups.map((row) => mapRemoteGroup(row, currentAuthUserId));
  const mappedGroupMemberships = allMembershipRows
    .filter((row) => accessibleGroupIds.has(row.group_id as string))
    .map((row) => mapRemoteGroupMembership(row, currentAuthUserId, entityMaps));
  const mappedSharePreferences = (sharePreferencesResponse.data ?? [])
    .filter((row) => accessibleGroupIds.has(row.group_id as string))
    .map((row) => mapRemoteSharePreference(row, currentAuthUserId, entityMaps));
  const mappedInvites = allInviteRows
    .filter(
      (row) =>
        accessibleGroupIds.has(row.target_group_id as string) &&
        (row.inviter_auth_user_id === currentAuthUserId || row.accepted_by_auth_user_id === currentAuthUserId)
    )
    .map((row) => mapRemoteInvite(row, currentAuthUserId, entityMaps));
  const mappedSponsoredAccess = allSponsoredAccessRows
    .filter(
      (row) =>
        accessibleGroupIds.has(row.target_group_id as string) &&
        (row.sponsor_auth_user_id === currentAuthUserId || row.sponsored_auth_user_id === currentAuthUserId)
    )
    .map((row) => mapRemoteSponsoredAccess(row, currentAuthUserId, entityMaps));
  const mappedCompetitions = filteredCompetitions.map((row) => mapRemoteCompetition(row, currentAuthUserId));
  const mappedCompetitionGroups = filteredCompetitionGroups.map((row) =>
    mapRemoteCompetitionGroup(row, currentAuthUserId, entityMaps)
  );
  const mappedCompetitionSessions = filteredCompetitionSessions.map((row) =>
    mapRemoteCompetitionSession(row, currentAuthUserId, entityMaps)
  );
  const mappedCompetitionParticipants = allParticipantRows
    .filter((row) => accessibleCompetitionIds.has(row.competition_id as string))
    .map((row) => mapRemoteCompetitionParticipant(row, currentAuthUserId, entityMaps));
  const mappedCompetitionAssignments = filteredCompetitionAssignments.map((row) =>
    mapRemoteCompetitionAssignment(row, currentAuthUserId, entityMaps)
  );

  return {
    users: profiles.map((row) => mapRemoteUser(row, currentAuthUserId)),
    groups: mappedGroups,
    groupMemberships: mappedGroupMemberships,
    sharePreferences: mappedSharePreferences,
    invites: mappedInvites,
    sponsoredAccess: mappedSponsoredAccess,
    competitions: mappedCompetitions,
    competitionGroups: mappedCompetitionGroups,
    competitionSessions: mappedCompetitionSessions,
    competitionParticipants: mappedCompetitionParticipants,
    competitionAssignments: mappedCompetitionAssignments,
    entityMaps,
    syncMetadataHints: [
      ...filteredGroups
        .filter((row) => row.owner_auth_user_id === currentAuthUserId)
        .map((row, index) => ({
          entityType: 'group' as const,
          localRecordId: mappedGroups[index].id,
          remoteRecordId: row.id as string
        })),
      ...allMembershipRows
        .filter((row) => accessibleGroupIds.has(row.group_id as string))
        .map((row, index) => ({ row, membership: mappedGroupMemberships[index] }))
        .filter(({ row }) => row.owner_auth_user_id === currentAuthUserId)
        .map(({ row, membership }) => ({
          entityType: 'group_membership' as const,
          localRecordId: membership.id,
          remoteRecordId: row.id as string
        })),
      ...((sharePreferencesResponse.data ?? [])
        .filter((row) => accessibleGroupIds.has(row.group_id as string))
        .map((row, index) => ({ row, preference: mappedSharePreferences[index] }))
        .filter(({ row }) => row.owner_auth_user_id === currentAuthUserId)
        .map(({ row, preference }) => ({
          entityType: 'share_preference' as const,
          localRecordId: preference.id,
          remoteRecordId: row.id as string
        }))),
      ...allInviteRows
        .filter(
          (row) =>
            accessibleGroupIds.has(row.target_group_id as string) &&
            (row.inviter_auth_user_id === currentAuthUserId || row.accepted_by_auth_user_id === currentAuthUserId)
        )
        .map((row, index) => ({ row, invite: mappedInvites[index] }))
        .filter(({ row }) => row.owner_auth_user_id === currentAuthUserId)
        .map(({ row, invite }) => ({
          entityType: 'invite' as const,
          localRecordId: invite.id,
          remoteRecordId: row.id as string
        })),
      ...allSponsoredAccessRows
        .filter(
          (row) =>
            accessibleGroupIds.has(row.target_group_id as string) &&
            (row.sponsor_auth_user_id === currentAuthUserId || row.sponsored_auth_user_id === currentAuthUserId)
        )
        .map((row, index) => ({ row, access: mappedSponsoredAccess[index] }))
        .filter(({ row }) => row.owner_auth_user_id === currentAuthUserId)
        .map(({ row, access }) => ({
          entityType: 'sponsored_access' as const,
          localRecordId: access.id,
          remoteRecordId: row.id as string
        }))
    ]
  };
};
