import { RemoteAccessSnapshot } from '@/types/remote';
import { supabase } from './supabaseClient';
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
    supabase.from('profiles').select('*'),
    supabase.from('groups').select('*'),
    supabase.from('group_memberships').select('*'),
    supabase.from('share_preferences').select('*'),
    supabase.from('invites').select('*'),
    supabase.from('sponsored_access').select('*'),
    supabase.from('competitions').select('*'),
    supabase.from('competition_groups').select('*'),
    supabase.from('competition_sessions').select('*'),
    supabase.from('competition_participants').select('*'),
    supabase.from('competition_session_assignments').select('*')
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
