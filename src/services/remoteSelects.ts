export const REMOTE_ACCESS_SELECTS = {
  profiles:
    'id, local_record_id, name, created_at, email, role, access_level, subscription_status, trial_started_at, trial_ends_at, subscription_expires_at, granted_by_auth_user_id',
  groups: 'id, owner_auth_user_id, local_record_id, name, join_code, created_at',
  groupMemberships:
    'id, owner_auth_user_id, local_record_id, group_id, member_auth_user_id, membership_role, joined_at',
  sharePreferences:
    'id, owner_auth_user_id, local_record_id, user_auth_user_id, group_id, share_journal_entries, share_practice_sessions, share_competition_sessions, share_insights, updated_at',
  invites:
    'id, owner_auth_user_id, local_record_id, inviter_auth_user_id, target_group_id, invite_code, target_name, grant_type, status, created_at, accepted_by_auth_user_id, accepted_at, revoked_at',
  sponsoredAccess:
    'id, owner_auth_user_id, local_record_id, sponsor_auth_user_id, sponsored_auth_user_id, target_group_id, granted_access_level, active, created_at, revoked_at',
  competitions:
    'id, owner_auth_user_id, local_record_id, organizer_auth_user_id, name, join_code, group_count, session_count, created_at',
  competitionGroups:
    'id, owner_auth_user_id, local_record_id, competition_id, label, sort_order',
  competitionSessions:
    'id, owner_auth_user_id, local_record_id, competition_id, session_number, start_time, end_time',
  competitionParticipants:
    'id, owner_auth_user_id, local_record_id, competition_id, participant_auth_user_id, joined_at',
  competitionAssignments:
    'id, owner_auth_user_id, local_record_id, competition_id, participant_auth_user_id, competition_group_id, competition_session_id, beat, assignment_role, linked_session_local_id, created_at, updated_at'
} as const;

export const REMOTE_SHARED_SELECTS = {
  sessions:
    'id, owner_auth_user_id, local_record_id, date, session_mode, planned_duration_minutes, alert_interval_minutes, alert_markers_json, notification_sound_enabled, notification_vibration_enabled, ended_at, start_at, end_at, water_type, depth_range, shared_group_id, practice_measurement_enabled, practice_length_unit, competition_id, competition_assignment_id, competition_group_id, competition_session_id, competition_assigned_group, competition_role, competition_beat, competition_session_number, competition_requires_measurement, competition_length_unit, starting_rig_setup_json, starting_technique, river_name, hypothesis, notes',
  sessionGroupShares:
    'id, owner_auth_user_id, local_record_id, session_id, group_id, created_at',
  sessionSegments:
    'id, owner_auth_user_id, local_record_id, session_id, session_mode, river_name, water_type, depth_range, started_at, ended_at, fly_snapshots_json, rig_setup_json, technique, notes',
  catchEvents:
    'id, owner_auth_user_id, local_record_id, session_id, segment_id, session_mode, fly_name, fly_snapshot_json, species, length_value, length_unit, caught_at, notes',
  experiments:
    'id, owner_auth_user_id, local_record_id, session_id, hypothesis, control_focus, technique, rig_setup_json, fly_entries_json, control_fly_json, variant_fly_json, control_casts, control_catches, variant_casts, variant_catches, winner, outcome, status, confidence_score, archived_at',
  savedFlies: 'id, owner_auth_user_id, local_record_id, payload_json',
  savedLeaderFormulas: 'id, owner_auth_user_id, local_record_id, payload_json',
  savedRigPresets: 'id, owner_auth_user_id, local_record_id, payload_json',
  savedRivers: 'id, owner_auth_user_id, local_record_id, name, created_at'
} as const;
