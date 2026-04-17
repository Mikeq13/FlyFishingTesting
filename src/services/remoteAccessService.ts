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
  const competitions = competitionsResponse.data ?? [];
  const competitionGroups = competitionGroupsResponse.data ?? [];
  const competitionSessions = competitionSessionsResponse.data ?? [];
  const competitionAssignments = competitionAssignmentsResponse.data ?? [];

  const entityMaps = createRemoteEntityMaps(currentAuthUserId, {
    profiles,
    groups,
    competitions,
    competitionGroups,
    competitionSessions,
    competitionAssignments
  });

  return {
    users: profiles.map((row) => mapRemoteUser(row, currentAuthUserId)),
    groups: groups.map((row) => mapRemoteGroup(row, currentAuthUserId)),
    groupMemberships: (groupMembershipsResponse.data ?? []).map((row) =>
      mapRemoteGroupMembership(row, currentAuthUserId, entityMaps)
    ),
    sharePreferences: (sharePreferencesResponse.data ?? []).map((row) =>
      mapRemoteSharePreference(row, currentAuthUserId, entityMaps)
    ),
    invites: (invitesResponse.data ?? []).map((row) => mapRemoteInvite(row, currentAuthUserId, entityMaps)),
    sponsoredAccess: (sponsoredAccessResponse.data ?? []).map((row) =>
      mapRemoteSponsoredAccess(row, currentAuthUserId, entityMaps)
    ),
    competitions: competitions.map((row) => mapRemoteCompetition(row, currentAuthUserId)),
    competitionGroups: competitionGroups.map((row) =>
      mapRemoteCompetitionGroup(row, currentAuthUserId, entityMaps)
    ),
    competitionSessions: competitionSessions.map((row) =>
      mapRemoteCompetitionSession(row, currentAuthUserId, entityMaps)
    ),
    competitionParticipants: (competitionParticipantsResponse.data ?? []).map((row) =>
      mapRemoteCompetitionParticipant(row, currentAuthUserId, entityMaps)
    ),
    competitionAssignments: competitionAssignments.map((row) =>
      mapRemoteCompetitionAssignment(row, currentAuthUserId, entityMaps)
    ),
    entityMaps
  };
};
