import { CatchEvent, SessionSegment } from '@/types/activity';
import { Experiment } from '@/types/experiment';
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
import { Invite, RemoteEntityMaps, SponsoredAccess } from '@/types/remote';
import { LeaderFormula, RigPreset } from '@/types/rig';
import { SavedRiver, Session, SessionGroupShare } from '@/types/session';
import { UserProfile } from '@/types/user';
import { SavedFly } from '@/types/fly';

type BaseRemoteRow = {
  id: string;
  owner_auth_user_id?: string | null;
  local_record_id?: number | null;
};

const syntheticId = (seed: string) => {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) | 0;
  }
  const normalized = Math.abs(hash || 1);
  return -normalized;
};

const toPreferredId = (
  row: BaseRemoteRow,
  currentAuthUserId: string,
  namespace: string
) => {
  if (row.owner_auth_user_id === currentAuthUserId && typeof row.local_record_id === 'number') {
    return row.local_record_id;
  }
  return syntheticId(`${namespace}:${row.id}`);
};

export const mapRemoteProfileId = (authUserId: string, currentAuthUserId: string, localRecordId?: number | null) =>
  authUserId === currentAuthUserId && typeof localRecordId === 'number'
    ? localRecordId
    : syntheticId(`profile:${authUserId}`);

export const createRemoteEntityMaps = (
  currentAuthUserId: string,
  raw: {
    profiles: any[];
    groups: any[];
    competitions: any[];
    competitionGroups: any[];
    competitionSessions: any[];
    competitionAssignments: any[];
  }
): RemoteEntityMaps => ({
  userIdByAuthId: new Map(
    raw.profiles.map((row) => [row.id as string, mapRemoteProfileId(row.id, currentAuthUserId, row.local_record_id)])
  ),
  groupIdByRemoteId: new Map(
    raw.groups.map((row) => [row.id as string, toPreferredId(row, currentAuthUserId, 'group')])
  ),
  competitionIdByRemoteId: new Map(
    raw.competitions.map((row) => [row.id as string, toPreferredId(row, currentAuthUserId, 'competition')])
  ),
  competitionGroupIdByRemoteId: new Map(
    raw.competitionGroups.map((row) => [row.id as string, toPreferredId(row, currentAuthUserId, 'competition_group')])
  ),
  competitionSessionIdByRemoteId: new Map(
    raw.competitionSessions.map((row) => [row.id as string, toPreferredId(row, currentAuthUserId, 'competition_session')])
  ),
  competitionAssignmentIdByRemoteId: new Map(
    raw.competitionAssignments.map((row) => [row.id as string, toPreferredId(row, currentAuthUserId, 'competition_assignment')])
  )
});

export const mapRemoteUser = (row: any, currentAuthUserId: string): UserProfile => ({
  id: mapRemoteProfileId(row.id, currentAuthUserId, row.local_record_id),
  name: row.name,
  createdAt: row.created_at ?? new Date().toISOString(),
  email: row.email ?? null,
  remoteAuthId: row.id,
  role: row.role ?? 'angler',
  accessLevel: row.access_level ?? 'free',
  subscriptionStatus: row.subscription_status ?? 'not_started',
  trialStartedAt: row.trial_started_at ?? null,
  trialEndsAt: row.trial_ends_at ?? null,
  subscriptionExpiresAt: row.subscription_expires_at ?? null,
  grantedByUserId: row.granted_by_auth_user_id ? mapRemoteProfileId(row.granted_by_auth_user_id, currentAuthUserId, null) : null
});

export const mapRemoteGroup = (row: any, currentAuthUserId: string): Group => ({
  id: toPreferredId(row, currentAuthUserId, 'group'),
  name: row.name,
  joinCode: row.join_code,
  createdByUserId: mapRemoteProfileId(row.owner_auth_user_id, currentAuthUserId, null),
  createdAt: row.created_at
});

export const mapRemoteGroupMembership = (row: any, currentAuthUserId: string, maps: RemoteEntityMaps): GroupMembership => ({
  id: toPreferredId(row, currentAuthUserId, 'group_membership'),
  groupId: maps.groupIdByRemoteId.get(row.group_id) ?? syntheticId(`group:${row.group_id}`),
  userId: maps.userIdByAuthId.get(row.member_auth_user_id) ?? mapRemoteProfileId(row.member_auth_user_id, currentAuthUserId, null),
  role: row.membership_role ?? 'member',
  joinedAt: row.joined_at
});

export const mapRemoteSharePreference = (row: any, currentAuthUserId: string, maps: RemoteEntityMaps): SharePreference => ({
  id: toPreferredId(row, currentAuthUserId, 'share_preference'),
  userId: maps.userIdByAuthId.get(row.user_auth_user_id) ?? mapRemoteProfileId(row.user_auth_user_id, currentAuthUserId, null),
  groupId: maps.groupIdByRemoteId.get(row.group_id) ?? syntheticId(`group:${row.group_id}`),
  shareJournalEntries: row.share_journal_entries ?? false,
  sharePracticeSessions: row.share_practice_sessions ?? false,
  shareCompetitionSessions: row.share_competition_sessions ?? false,
  shareInsights: row.share_insights ?? false,
  updatedAt: row.updated_at
});

export const mapRemoteInvite = (row: any, currentAuthUserId: string, maps: RemoteEntityMaps): Invite => ({
  id: toPreferredId(row, currentAuthUserId, 'invite'),
  inviterUserId: maps.userIdByAuthId.get(row.inviter_auth_user_id) ?? mapRemoteProfileId(row.inviter_auth_user_id, currentAuthUserId, null),
  targetGroupId: maps.groupIdByRemoteId.get(row.target_group_id) ?? syntheticId(`group:${row.target_group_id}`),
  inviteCode: row.invite_code,
  targetName: row.target_name ?? null,
  grantType: row.grant_type ?? 'power_user_group',
  status: row.status ?? 'pending',
  createdAt: row.created_at,
  acceptedByUserId: row.accepted_by_auth_user_id ? maps.userIdByAuthId.get(row.accepted_by_auth_user_id) ?? mapRemoteProfileId(row.accepted_by_auth_user_id, currentAuthUserId, null) : null,
  acceptedAt: row.accepted_at ?? null,
  revokedAt: row.revoked_at ?? null
});

export const mapRemoteSponsoredAccess = (row: any, currentAuthUserId: string, maps: RemoteEntityMaps): SponsoredAccess => ({
  id: toPreferredId(row, currentAuthUserId, 'sponsored_access'),
  sponsorUserId: maps.userIdByAuthId.get(row.sponsor_auth_user_id) ?? mapRemoteProfileId(row.sponsor_auth_user_id, currentAuthUserId, null),
  sponsoredUserId: maps.userIdByAuthId.get(row.sponsored_auth_user_id) ?? mapRemoteProfileId(row.sponsored_auth_user_id, currentAuthUserId, null),
  targetGroupId: maps.groupIdByRemoteId.get(row.target_group_id) ?? syntheticId(`group:${row.target_group_id}`),
  grantedAccessLevel: row.granted_access_level ?? 'power_user',
  active: row.active !== false,
  createdAt: row.created_at,
  revokedAt: row.revoked_at ?? null
});

export const mapRemoteCompetition = (row: any, currentAuthUserId: string): Competition => ({
  id: toPreferredId(row, currentAuthUserId, 'competition'),
  organizerUserId: mapRemoteProfileId(row.organizer_auth_user_id, currentAuthUserId, null),
  name: row.name,
  joinCode: row.join_code,
  groupCount: row.group_count ?? 1,
  sessionCount: row.session_count ?? 1,
  createdAt: row.created_at
});

export const mapRemoteCompetitionGroup = (row: any, currentAuthUserId: string, maps: RemoteEntityMaps): CompetitionGroup => ({
  id: toPreferredId(row, currentAuthUserId, 'competition_group'),
  competitionId: maps.competitionIdByRemoteId.get(row.competition_id) ?? syntheticId(`competition:${row.competition_id}`),
  label: row.label,
  sortOrder: row.sort_order ?? 1
});

export const mapRemoteCompetitionSession = (row: any, currentAuthUserId: string, maps: RemoteEntityMaps): CompetitionSession => ({
  id: toPreferredId(row, currentAuthUserId, 'competition_session'),
  competitionId: maps.competitionIdByRemoteId.get(row.competition_id) ?? syntheticId(`competition:${row.competition_id}`),
  sessionNumber: row.session_number,
  startTime: row.start_time,
  endTime: row.end_time
});

export const mapRemoteCompetitionParticipant = (row: any, currentAuthUserId: string, maps: RemoteEntityMaps): CompetitionParticipant => ({
  id: toPreferredId(row, currentAuthUserId, 'competition_participant'),
  competitionId: maps.competitionIdByRemoteId.get(row.competition_id) ?? syntheticId(`competition:${row.competition_id}`),
  userId: maps.userIdByAuthId.get(row.participant_auth_user_id) ?? mapRemoteProfileId(row.participant_auth_user_id, currentAuthUserId, null),
  joinedAt: row.joined_at
});

export const mapRemoteCompetitionAssignment = (row: any, currentAuthUserId: string, maps: RemoteEntityMaps): CompetitionSessionAssignment => ({
  id: toPreferredId(row, currentAuthUserId, 'competition_assignment'),
  competitionId: maps.competitionIdByRemoteId.get(row.competition_id) ?? syntheticId(`competition:${row.competition_id}`),
  userId: maps.userIdByAuthId.get(row.participant_auth_user_id) ?? mapRemoteProfileId(row.participant_auth_user_id, currentAuthUserId, null),
  competitionGroupId: maps.competitionGroupIdByRemoteId.get(row.competition_group_id) ?? syntheticId(`competition_group:${row.competition_group_id}`),
  competitionSessionId: maps.competitionSessionIdByRemoteId.get(row.competition_session_id) ?? syntheticId(`competition_session:${row.competition_session_id}`),
  beat: row.beat,
  role: row.assignment_role ?? 'fishing',
  sessionId: row.linked_session_local_id ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

export const mapRemoteSession = (row: any, currentAuthUserId: string, maps: RemoteEntityMaps): Session => ({
  id: toPreferredId(row, currentAuthUserId, 'session'),
  userId: maps.userIdByAuthId.get(row.owner_auth_user_id) ?? mapRemoteProfileId(row.owner_auth_user_id, currentAuthUserId, null),
  date: row.date,
  mode: row.session_mode,
  plannedDurationMinutes: row.planned_duration_minutes ?? undefined,
  alertIntervalMinutes: row.alert_interval_minutes ?? null,
  alertMarkersMinutes: Array.isArray(row.alert_markers_json) ? row.alert_markers_json : [],
  notificationSoundEnabled: row.notification_sound_enabled !== false,
  notificationVibrationEnabled: row.notification_vibration_enabled !== false,
  endedAt: row.ended_at ?? undefined,
  startAt: row.start_at ?? undefined,
  endAt: row.end_at ?? undefined,
  waterType: row.water_type,
  depthRange: row.depth_range,
  sharedGroupId: row.shared_group_id ? maps.groupIdByRemoteId.get(row.shared_group_id) ?? syntheticId(`group:${row.shared_group_id}`) : undefined,
  practiceMeasurementEnabled: row.practice_measurement_enabled ?? false,
  practiceLengthUnit: row.practice_length_unit ?? 'in',
  competitionId: row.competition_id ? maps.competitionIdByRemoteId.get(row.competition_id) ?? syntheticId(`competition:${row.competition_id}`) : undefined,
  competitionAssignmentId: row.competition_assignment_id ? maps.competitionAssignmentIdByRemoteId.get(row.competition_assignment_id) ?? syntheticId(`competition_assignment:${row.competition_assignment_id}`) : undefined,
  competitionGroupId: row.competition_group_id ? maps.competitionGroupIdByRemoteId.get(row.competition_group_id) ?? syntheticId(`competition_group:${row.competition_group_id}`) : undefined,
  competitionSessionId: row.competition_session_id ? maps.competitionSessionIdByRemoteId.get(row.competition_session_id) ?? syntheticId(`competition_session:${row.competition_session_id}`) : undefined,
  competitionAssignedGroup: row.competition_assigned_group ?? undefined,
  competitionRole: row.competition_role ?? undefined,
  competitionBeat: row.competition_beat ?? undefined,
  competitionSessionNumber: row.competition_session_number ?? undefined,
  competitionRequiresMeasurement: row.competition_requires_measurement ?? true,
  competitionLengthUnit: row.competition_length_unit ?? 'mm',
  startingRigSetup: row.starting_rig_setup_json ?? undefined,
  riverName: row.river_name ?? undefined,
  hypothesis: row.hypothesis ?? undefined,
  notes: row.notes ?? undefined
});

export const createSessionMaps = (sessions: any[], currentAuthUserId: string) =>
  new Map(sessions.map((row) => [row.id as string, toPreferredId(row, currentAuthUserId, 'session')]));

export const mapRemoteSessionGroupShare = (
  row: any,
  currentAuthUserId: string,
  maps: RemoteEntityMaps,
  sessionIdByRemoteId: Map<string, number>
): SessionGroupShare => ({
  id: toPreferredId(row, currentAuthUserId, 'session_group_share'),
  userId: maps.userIdByAuthId.get(row.owner_auth_user_id) ?? mapRemoteProfileId(row.owner_auth_user_id, currentAuthUserId, null),
  sessionId: sessionIdByRemoteId.get(row.session_id) ?? syntheticId(`session:${row.session_id}`),
  groupId: maps.groupIdByRemoteId.get(row.group_id) ?? syntheticId(`group:${row.group_id}`),
  createdAt: row.created_at ?? new Date().toISOString()
});

export const createSegmentMaps = (segments: any[], currentAuthUserId: string) =>
  new Map(segments.map((row) => [row.id as string, toPreferredId(row, currentAuthUserId, 'session_segment')]));

export const mapRemoteSessionSegment = (
  row: any,
  currentAuthUserId: string,
  maps: RemoteEntityMaps,
  sessionIdByRemoteId: Map<string, number>
): SessionSegment => ({
  id: toPreferredId(row, currentAuthUserId, 'session_segment'),
  userId: maps.userIdByAuthId.get(row.owner_auth_user_id) ?? mapRemoteProfileId(row.owner_auth_user_id, currentAuthUserId, null),
  sessionId: sessionIdByRemoteId.get(row.session_id) ?? syntheticId(`session:${row.session_id}`),
  mode: row.session_mode,
  riverName: row.river_name ?? undefined,
  waterType: row.water_type,
  depthRange: row.depth_range,
  startedAt: row.started_at,
  endedAt: row.ended_at ?? undefined,
  flySnapshots: row.fly_snapshots_json ?? [],
  rigSetup: row.rig_setup_json ?? undefined,
  notes: row.notes ?? undefined
});

export const mapRemoteCatchEvent = (
  row: any,
  currentAuthUserId: string,
  maps: RemoteEntityMaps,
  sessionIdByRemoteId: Map<string, number>,
  segmentIdByRemoteId: Map<string, number>
): CatchEvent => ({
  id: toPreferredId(row, currentAuthUserId, 'catch_event'),
  userId: maps.userIdByAuthId.get(row.owner_auth_user_id) ?? mapRemoteProfileId(row.owner_auth_user_id, currentAuthUserId, null),
  sessionId: sessionIdByRemoteId.get(row.session_id) ?? syntheticId(`session:${row.session_id}`),
  segmentId: row.segment_id ? segmentIdByRemoteId.get(row.segment_id) ?? syntheticId(`segment:${row.segment_id}`) : undefined,
  mode: row.session_mode,
  flyName: row.fly_name ?? undefined,
  flySnapshot: row.fly_snapshot_json ?? undefined,
  species: row.species ?? undefined,
  lengthValue: typeof row.length_value === 'number' ? row.length_value : undefined,
  lengthUnit: row.length_unit,
  caughtAt: row.caught_at,
  notes: row.notes ?? undefined
});

export const mapRemoteExperiment = (
  row: any,
  currentAuthUserId: string,
  maps: RemoteEntityMaps,
  sessionIdByRemoteId: Map<string, number>
): Experiment => ({
  id: toPreferredId(row, currentAuthUserId, 'experiment'),
  userId: maps.userIdByAuthId.get(row.owner_auth_user_id) ?? mapRemoteProfileId(row.owner_auth_user_id, currentAuthUserId, null),
  sessionId: sessionIdByRemoteId.get(row.session_id) ?? syntheticId(`session:${row.session_id}`),
  hypothesis: row.hypothesis,
  controlFocus: row.control_focus,
  rigSetup: row.rig_setup_json ?? undefined,
  flyEntries: row.fly_entries_json ?? [],
  controlFly: row.control_fly_json,
  variantFly: row.variant_fly_json,
  controlCasts: row.control_casts,
  controlCatches: row.control_catches,
  variantCasts: row.variant_casts,
  variantCatches: row.variant_catches,
  winner: row.winner,
  outcome: row.outcome,
  status: row.status,
  confidenceScore: row.confidence_score,
  archivedAt: row.archived_at ?? undefined
});

export const mapRemoteSavedFly = (row: any, currentAuthUserId: string): SavedFly => ({
  ...(row.payload_json as SavedFly),
  id: toPreferredId(row, currentAuthUserId, 'saved_fly'),
  userId: mapRemoteProfileId(row.owner_auth_user_id, currentAuthUserId, row.owner_auth_user_id === currentAuthUserId ? row.payload_json?.userId ?? row.local_record_id : null)
});

export const mapRemoteLeaderFormula = (row: any, currentAuthUserId: string): LeaderFormula => ({
  ...(row.payload_json as LeaderFormula),
  id: toPreferredId(row, currentAuthUserId, 'saved_leader_formula'),
  userId: mapRemoteProfileId(row.owner_auth_user_id, currentAuthUserId, row.owner_auth_user_id === currentAuthUserId ? row.payload_json?.userId ?? row.local_record_id : null)
});

export const mapRemoteRigPreset = (row: any, currentAuthUserId: string): RigPreset => ({
  ...(row.payload_json as RigPreset),
  id: toPreferredId(row, currentAuthUserId, 'saved_rig_preset'),
  userId: mapRemoteProfileId(row.owner_auth_user_id, currentAuthUserId, row.owner_auth_user_id === currentAuthUserId ? row.payload_json?.userId ?? row.local_record_id : null)
});

export const mapRemoteSavedRiver = (row: any, currentAuthUserId: string): SavedRiver => ({
  id: toPreferredId(row, currentAuthUserId, 'saved_river'),
  userId: mapRemoteProfileId(row.owner_auth_user_id, currentAuthUserId, row.local_record_id),
  name: row.name,
  createdAt: row.created_at
});
