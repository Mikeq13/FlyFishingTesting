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
import { SyncEntityType, SyncMetadataEntry, SyncQueueEntry } from '@/types/remote';
import { LeaderFormula, RigPreset } from '@/types/rig';
import { Session, SavedRiver, SessionGroupShare } from '@/types/session';
import { UserProfile } from '@/types/user';
import { supabase } from './supabaseClient';
import { LoadedLocalAppData } from './localAppDataService';
import { deleteSyncMetadataEntry, getSyncMetadataEntry, upsertSyncMetadataEntry } from '@/db/syncMetadataRepo';
import { updateSyncQueueEntry } from '@/db/syncRepo';

type SyncContext = {
  currentUser: UserProfile;
  remoteAuthUserId: string;
  loaded: LoadedLocalAppData;
};

const recordSyncSuccess = async (entityType: SyncEntityType, localRecordId: number, remoteRecordId?: string | null) => {
  await upsertSyncMetadataEntry({
    entityType,
    localRecordId,
    remoteRecordId: remoteRecordId ?? null,
    lastSyncedAt: new Date().toISOString(),
    pendingImport: false
  });
};

const findRemoteId = async (entityType: SyncEntityType, localRecordId: number) => {
  const metadata = await getSyncMetadataEntry(entityType, localRecordId);
  return metadata?.remoteRecordId ?? null;
};

const clearSyncMetadata = async (entityType: SyncEntityType, localRecordId: number) => {
  await deleteSyncMetadataEntry(entityType, localRecordId);
};

const upsertOwnedRow = async (
  table: string,
  ownerAuthUserId: string,
  localRecordId: number,
  payload: Record<string, unknown>
) => {
  const { data, error } = await supabase
    .from(table)
    .upsert(
      {
        owner_auth_user_id: ownerAuthUserId,
        local_record_id: localRecordId,
        ...payload
      },
      { onConflict: 'owner_auth_user_id,local_record_id' }
    )
    .select('id')
    .single();
  if (error) throw error;
  return data?.id as string | undefined;
};

const deleteOwnedRow = async (
  table: string,
  ownerAuthUserId: string,
  localRecordId: number,
  remoteRecordId?: string | null
) => {
  let query = supabase.from(table).delete();
  if (remoteRecordId) {
    query = query.eq('id', remoteRecordId).eq('owner_auth_user_id', ownerAuthUserId);
  } else {
    query = query.eq('owner_auth_user_id', ownerAuthUserId).eq('local_record_id', localRecordId);
  }
  const { error } = await query;
  if (error) throw error;
};

const syncProfile = async ({ currentUser, remoteAuthUserId }: SyncContext) => {
  const { error } = await supabase.from('profiles').upsert(
    {
      id: remoteAuthUserId,
      local_record_id: currentUser.id,
      name: currentUser.name,
      email: currentUser.email ?? null,
      role: currentUser.role,
      access_level: currentUser.accessLevel,
      subscription_status: currentUser.subscriptionStatus,
      trial_started_at: currentUser.trialStartedAt ?? null,
      trial_ends_at: currentUser.trialEndsAt ?? null,
      subscription_expires_at: currentUser.subscriptionExpiresAt ?? null,
      granted_by_auth_user_id: null,
      updated_at: new Date().toISOString()
    },
    { onConflict: 'id' }
  );
  if (error) throw error;
  await recordSyncSuccess('profile', currentUser.id, remoteAuthUserId);
};

const syncGroup = async (context: SyncContext, group: Group) => {
  const remoteId = await upsertOwnedRow('groups', context.remoteAuthUserId, group.id, {
    name: group.name,
    join_code: group.joinCode,
    created_at: group.createdAt,
    owner_auth_user_id: context.remoteAuthUserId
  });
  await recordSyncSuccess('group', group.id, remoteId);
  return remoteId;
};

const syncGroupMembership = async (context: SyncContext, membership: GroupMembership) => {
  const remoteGroupId =
    (await findRemoteId('group', membership.groupId)) ??
    (await syncGroup(context, context.loaded.groups.find((group) => group.id === membership.groupId)!));
  const member = context.loaded.users.find((user) => user.id === membership.userId);
  const memberAuthId = member?.remoteAuthId ?? (membership.userId === context.currentUser.id ? context.remoteAuthUserId : null);
  if (!memberAuthId) {
    throw new Error('Group membership cannot sync until the invited user signs in.');
  }
  const remoteId = await upsertOwnedRow('group_memberships', context.remoteAuthUserId, membership.id, {
    group_id: remoteGroupId,
    member_auth_user_id: memberAuthId,
    membership_role: membership.role,
    joined_at: membership.joinedAt
  });
  await recordSyncSuccess('group_membership', membership.id, remoteId);
  return remoteId;
};

const syncSharePreference = async (context: SyncContext, preference: SharePreference) => {
  const remoteGroupId = await findRemoteId('group', preference.groupId);
  if (!remoteGroupId) throw new Error('Share preference depends on a synced group.');
  const remoteId = await upsertOwnedRow('share_preferences', context.remoteAuthUserId, preference.id, {
    group_id: remoteGroupId,
    user_auth_user_id: context.remoteAuthUserId,
    share_journal_entries: preference.shareJournalEntries,
    share_practice_sessions: preference.sharePracticeSessions,
    share_competition_sessions: preference.shareCompetitionSessions,
    share_insights: preference.shareInsights,
    updated_at: preference.updatedAt
  });
  await recordSyncSuccess('share_preference', preference.id, remoteId);
  return remoteId;
};

const syncInvite = async (context: SyncContext, inviteId: number) => {
  const invite = context.loaded.invites.find((entry) => entry.id === inviteId);
  if (!invite) return;
  const remoteGroupId = await findRemoteId('group', invite.targetGroupId);
  if (!remoteGroupId) throw new Error('Invite depends on a synced target group.');
  const acceptedByAuthUserId =
    invite.acceptedByUserId && invite.acceptedByUserId !== context.currentUser.id
      ? context.loaded.users.find((user) => user.id === invite.acceptedByUserId)?.remoteAuthId ?? null
      : invite.acceptedByUserId
        ? context.remoteAuthUserId
        : null;
  const remoteId = await upsertOwnedRow('invites', context.remoteAuthUserId, invite.id, {
    inviter_auth_user_id: context.remoteAuthUserId,
    target_group_id: remoteGroupId,
    invite_code: invite.inviteCode,
    target_name: invite.targetName ?? null,
    grant_type: invite.grantType,
    status: invite.status,
    accepted_by_auth_user_id: acceptedByAuthUserId,
    created_at: invite.createdAt,
    accepted_at: invite.acceptedAt ?? null,
    revoked_at: invite.revokedAt ?? null
  });
  await recordSyncSuccess('invite', invite.id, remoteId);
};

const syncSponsoredAccess = async (context: SyncContext, accessId: number) => {
  const entry = context.loaded.sponsoredAccess.find((item) => item.id === accessId);
  if (!entry) return;
  const targetGroupId = await findRemoteId('group', entry.targetGroupId);
  if (!targetGroupId) throw new Error('Sponsored access depends on a synced group.');
  const sponsoredUser =
    context.loaded.users.find((user) => user.id === entry.sponsoredUserId)?.remoteAuthId ??
    (entry.sponsoredUserId === context.currentUser.id ? context.remoteAuthUserId : null);
  if (!sponsoredUser) throw new Error('Sponsored access cannot sync until the sponsored angler signs in.');
  const remoteId = await upsertOwnedRow('sponsored_access', context.remoteAuthUserId, entry.id, {
    sponsor_auth_user_id: context.remoteAuthUserId,
    sponsored_auth_user_id: sponsoredUser,
    target_group_id: targetGroupId,
    granted_access_level: entry.grantedAccessLevel,
    active: entry.active,
    created_at: entry.createdAt,
    revoked_at: entry.revokedAt ?? null
  });
  await recordSyncSuccess('sponsored_access', entry.id, remoteId);
};

const syncCompetition = async (context: SyncContext, competition: Competition, operation: SyncQueueEntry['operation']) => {
  const remoteCompetitionId = await upsertOwnedRow('competitions', context.remoteAuthUserId, competition.id, {
    organizer_auth_user_id: context.remoteAuthUserId,
    name: competition.name,
    join_code: competition.joinCode,
    group_count: competition.groupCount,
    session_count: competition.sessionCount,
    created_at: competition.createdAt
  });
  await recordSyncSuccess('competition', competition.id, remoteCompetitionId);

  const relatedGroups = context.loaded.competitionGroups.filter((group) => group.competitionId === competition.id);
  for (const group of relatedGroups) {
    await syncCompetitionGroup(context, group, remoteCompetitionId);
  }
  const relatedSessions = context.loaded.competitionSessions.filter((session) => session.competitionId === competition.id);
  for (const session of relatedSessions) {
    await syncCompetitionSession(context, session, remoteCompetitionId);
  }

  if (operation === 'create' || operation === 'join') {
    const participants = context.loaded.competitionParticipants.filter((participant) => participant.competitionId === competition.id);
    for (const participant of participants) {
      await syncCompetitionParticipant(context, participant, remoteCompetitionId);
    }
  }
};

const syncCompetitionGroup = async (context: SyncContext, group: CompetitionGroup, remoteCompetitionId?: string | null) => {
  const competitionId = remoteCompetitionId ?? (await findRemoteId('competition', group.competitionId));
  if (!competitionId) throw new Error('Competition group depends on a synced competition.');
  const remoteId = await upsertOwnedRow('competition_groups', context.remoteAuthUserId, group.id, {
    competition_id: competitionId,
    label: group.label,
    sort_order: group.sortOrder
  });
  await recordSyncSuccess('competition_group', group.id, remoteId);
  return remoteId;
};

const syncCompetitionSession = async (context: SyncContext, entry: CompetitionSession, remoteCompetitionId?: string | null) => {
  const competitionId = remoteCompetitionId ?? (await findRemoteId('competition', entry.competitionId));
  if (!competitionId) throw new Error('Competition session depends on a synced competition.');
  const remoteId = await upsertOwnedRow('competition_sessions', context.remoteAuthUserId, entry.id, {
    competition_id: competitionId,
    session_number: entry.sessionNumber,
    start_time: entry.startTime,
    end_time: entry.endTime
  });
  await recordSyncSuccess('competition_session', entry.id, remoteId);
  return remoteId;
};

const syncCompetitionParticipant = async (context: SyncContext, participant: CompetitionParticipant, remoteCompetitionId?: string | null) => {
  const competitionId = remoteCompetitionId ?? (await findRemoteId('competition', participant.competitionId));
  if (!competitionId) throw new Error('Competition participant depends on a synced competition.');
  const participantAuthId =
    context.loaded.users.find((user) => user.id === participant.userId)?.remoteAuthId ??
    (participant.userId === context.currentUser.id ? context.remoteAuthUserId : null);
  if (!participantAuthId) throw new Error('Competition participant cannot sync until the angler signs in.');
  const remoteId = await upsertOwnedRow('competition_participants', context.remoteAuthUserId, participant.id, {
    competition_id: competitionId,
    participant_auth_user_id: participantAuthId,
    joined_at: participant.joinedAt
  });
  await recordSyncSuccess('competition_participant', participant.id, remoteId);
  return remoteId;
};

const syncCompetitionAssignment = async (context: SyncContext, assignment: CompetitionSessionAssignment) => {
  const remoteCompetitionId = await findRemoteId('competition', assignment.competitionId);
  const remoteGroupId = await findRemoteId('competition_group', assignment.competitionGroupId);
  const remoteSessionId = await findRemoteId('competition_session', assignment.competitionSessionId);
  if (!remoteCompetitionId || !remoteGroupId || !remoteSessionId) {
    throw new Error('Competition assignment depends on synced competition groups and sessions.');
  }
  const participantAuthId =
    context.loaded.users.find((user) => user.id === assignment.userId)?.remoteAuthId ??
    (assignment.userId === context.currentUser.id ? context.remoteAuthUserId : null);
  if (!participantAuthId) throw new Error('Competition assignment cannot sync until that angler signs in.');
  const remoteId = await upsertOwnedRow('competition_session_assignments', context.remoteAuthUserId, assignment.id, {
    competition_id: remoteCompetitionId,
    participant_auth_user_id: participantAuthId,
    competition_group_id: remoteGroupId,
    competition_session_id: remoteSessionId,
    beat: assignment.beat,
    assignment_role: assignment.role,
    linked_session_local_id: assignment.sessionId ?? null,
    created_at: assignment.createdAt,
    updated_at: assignment.updatedAt
  });
  await recordSyncSuccess('competition_assignment', assignment.id, remoteId);
};

const syncSession = async (context: SyncContext, session: Session) => {
  const remoteId = await upsertOwnedRow('sessions', context.remoteAuthUserId, session.id, {
    session_mode: session.mode,
    date: session.date,
    planned_duration_minutes: session.plannedDurationMinutes ?? null,
    alert_interval_minutes: session.alertIntervalMinutes ?? null,
    alert_markers_json: session.alertMarkersMinutes ?? [],
    notification_sound_enabled: session.notificationSoundEnabled !== false,
    notification_vibration_enabled: session.notificationVibrationEnabled !== false,
    ended_at: session.endedAt ?? null,
    start_at: session.startAt ?? null,
    end_at: session.endAt ?? null,
    water_type: session.waterType,
    depth_range: session.depthRange,
    shared_group_id: session.sharedGroupId ? await findRemoteId('group', session.sharedGroupId) : null,
    practice_measurement_enabled: session.practiceMeasurementEnabled ?? false,
    practice_length_unit: session.practiceLengthUnit ?? 'in',
    competition_id: session.competitionId ? await findRemoteId('competition', session.competitionId) : null,
    competition_assignment_id: session.competitionAssignmentId ? await findRemoteId('competition_assignment', session.competitionAssignmentId) : null,
    competition_group_id: session.competitionGroupId ? await findRemoteId('competition_group', session.competitionGroupId) : null,
    competition_session_id: session.competitionSessionId ? await findRemoteId('competition_session', session.competitionSessionId) : null,
    competition_assigned_group: session.competitionAssignedGroup ?? null,
    competition_role: session.competitionRole ?? null,
    competition_beat: session.competitionBeat ?? null,
    competition_session_number: session.competitionSessionNumber ?? null,
    competition_requires_measurement: session.competitionRequiresMeasurement ?? true,
    competition_length_unit: session.competitionLengthUnit ?? 'mm',
    starting_rig_setup_json: session.startingRigSetup ?? null,
    river_name: session.riverName ?? null,
    hypothesis: session.hypothesis ?? null,
    notes: session.notes ?? null,
    updated_at: new Date().toISOString()
  });
  await recordSyncSuccess('session', session.id, remoteId);
  return remoteId;
};

const syncSessionGroupShare = async (context: SyncContext, share: SessionGroupShare) => {
  const remoteSessionId = await findRemoteId('session', share.sessionId);
  const remoteGroupId = await findRemoteId('group', share.groupId);
  if (!remoteSessionId || !remoteGroupId) {
    throw new Error('Session sharing depends on synced sessions and groups.');
  }
  const remoteId = await upsertOwnedRow('session_group_shares', context.remoteAuthUserId, share.id, {
    session_id: remoteSessionId,
    group_id: remoteGroupId,
    created_at: share.createdAt
  });
  await recordSyncSuccess('session_group_share', share.id, remoteId);
  return remoteId;
};

const syncSessionSegment = async (context: SyncContext, segment: SessionSegment) => {
  const remoteSessionId = await findRemoteId('session', segment.sessionId);
  if (!remoteSessionId) throw new Error('Session segment depends on a synced session.');
  const remoteId = await upsertOwnedRow('session_segments', context.remoteAuthUserId, segment.id, {
    session_id: remoteSessionId,
    session_mode: segment.mode,
    river_name: segment.riverName ?? null,
    water_type: segment.waterType,
    depth_range: segment.depthRange,
    started_at: segment.startedAt,
    ended_at: segment.endedAt ?? null,
    rig_setup_json: segment.rigSetup ?? null,
    fly_snapshots_json: segment.flySnapshots,
    notes: segment.notes ?? null
  });
  await recordSyncSuccess('session_segment', segment.id, remoteId);
};

const syncCatchEvent = async (context: SyncContext, event: CatchEvent) => {
  const remoteSessionId = await findRemoteId('session', event.sessionId);
  if (!remoteSessionId) throw new Error('Catch event depends on a synced session.');
  const remoteSegmentId = event.segmentId ? await findRemoteId('session_segment', event.segmentId) : null;
  const remoteId = await upsertOwnedRow('catch_events', context.remoteAuthUserId, event.id, {
    session_id: remoteSessionId,
    segment_id: remoteSegmentId,
    session_mode: event.mode,
    fly_name: event.flyName ?? null,
    fly_snapshot_json: event.flySnapshot ?? null,
    species: event.species ?? null,
    length_value: event.lengthValue ?? null,
    length_unit: event.lengthUnit,
    caught_at: event.caughtAt,
    notes: event.notes ?? null
  });
  await recordSyncSuccess('catch_event', event.id, remoteId);
};

const syncExperiment = async (context: SyncContext, experiment: Experiment) => {
  const remoteSessionId = await findRemoteId('session', experiment.sessionId);
  if (!remoteSessionId) throw new Error('Experiment depends on a synced session.');
  const remoteId = await upsertOwnedRow('experiments', context.remoteAuthUserId, experiment.id, {
    session_id: remoteSessionId,
    hypothesis: experiment.hypothesis,
    control_focus: experiment.controlFocus,
    rig_setup_json: experiment.rigSetup ?? null,
    fly_entries_json: experiment.flyEntries,
    control_fly_json: experiment.controlFly,
    variant_fly_json: experiment.variantFly,
    control_casts: experiment.controlCasts,
    control_catches: experiment.controlCatches,
    variant_casts: experiment.variantCasts,
    variant_catches: experiment.variantCatches,
    winner: experiment.winner,
    outcome: experiment.outcome,
    status: experiment.status,
    confidence_score: experiment.confidenceScore,
    archived_at: experiment.archivedAt ?? null
  });
  await recordSyncSuccess('experiment', experiment.id, remoteId);
};

const deleteRemoteSavedSetup = async (context: SyncContext, entry: SyncQueueEntry) => {
  const payload = JSON.parse(entry.payloadJson || '{}') as { savedType?: string };
  const recordId = entry.recordId;
  if (!recordId) return;
  const remoteId = await findRemoteId('saved_setup', recordId);
  const table =
    payload.savedType === 'fly'
      ? 'saved_flies'
      : payload.savedType === 'leader_formula'
        ? 'saved_leader_formulas'
        : payload.savedType === 'rig_preset'
          ? 'saved_rig_presets'
          : payload.savedType === 'river'
            ? 'saved_rivers'
            : null;

  if (!table) {
    throw new Error('Saved setup delete is missing its setup type.');
  }

  await deleteOwnedRow(table, context.remoteAuthUserId, recordId, remoteId);
  await clearSyncMetadata('saved_setup', recordId);
};

const deleteRemoteEntity = async (context: SyncContext, entry: SyncQueueEntry) => {
  if (!entry.recordId && entry.entityType !== 'profile') return;

  switch (entry.entityType) {
    case 'group':
      await deleteOwnedRow('groups', context.remoteAuthUserId, entry.recordId!, await findRemoteId('group', entry.recordId!));
      await clearSyncMetadata('group', entry.recordId!);
      return;
    case 'group_membership':
      await deleteOwnedRow(
        'group_memberships',
        context.remoteAuthUserId,
        entry.recordId!,
        await findRemoteId('group_membership', entry.recordId!)
      );
      await clearSyncMetadata('group_membership', entry.recordId!);
      return;
    case 'share_preference':
      await deleteOwnedRow(
        'share_preferences',
        context.remoteAuthUserId,
        entry.recordId!,
        await findRemoteId('share_preference', entry.recordId!)
      );
      await clearSyncMetadata('share_preference', entry.recordId!);
      return;
    case 'invite':
      await deleteOwnedRow('invites', context.remoteAuthUserId, entry.recordId!, await findRemoteId('invite', entry.recordId!));
      await clearSyncMetadata('invite', entry.recordId!);
      return;
    case 'sponsored_access':
      await deleteOwnedRow(
        'sponsored_access',
        context.remoteAuthUserId,
        entry.recordId!,
        await findRemoteId('sponsored_access', entry.recordId!)
      );
      await clearSyncMetadata('sponsored_access', entry.recordId!);
      return;
    case 'competition_assignment':
      await deleteOwnedRow(
        'competition_session_assignments',
        context.remoteAuthUserId,
        entry.recordId!,
        await findRemoteId('competition_assignment', entry.recordId!)
      );
      await clearSyncMetadata('competition_assignment', entry.recordId!);
      return;
    case 'competition_participant':
      await deleteOwnedRow(
        'competition_participants',
        context.remoteAuthUserId,
        entry.recordId!,
        await findRemoteId('competition_participant', entry.recordId!)
      );
      await clearSyncMetadata('competition_participant', entry.recordId!);
      return;
    case 'competition_session':
      await deleteOwnedRow(
        'competition_sessions',
        context.remoteAuthUserId,
        entry.recordId!,
        await findRemoteId('competition_session', entry.recordId!)
      );
      await clearSyncMetadata('competition_session', entry.recordId!);
      return;
    case 'competition_group':
      await deleteOwnedRow(
        'competition_groups',
        context.remoteAuthUserId,
        entry.recordId!,
        await findRemoteId('competition_group', entry.recordId!)
      );
      await clearSyncMetadata('competition_group', entry.recordId!);
      return;
    case 'competition':
      await deleteOwnedRow(
        'competitions',
        context.remoteAuthUserId,
        entry.recordId!,
        await findRemoteId('competition', entry.recordId!)
      );
      await clearSyncMetadata('competition', entry.recordId!);
      return;
    case 'catch_event':
      await deleteOwnedRow(
        'catch_events',
        context.remoteAuthUserId,
        entry.recordId!,
        await findRemoteId('catch_event', entry.recordId!)
      );
      await clearSyncMetadata('catch_event', entry.recordId!);
      return;
    case 'session_segment':
      await deleteOwnedRow(
        'session_segments',
        context.remoteAuthUserId,
        entry.recordId!,
        await findRemoteId('session_segment', entry.recordId!)
      );
      await clearSyncMetadata('session_segment', entry.recordId!);
      return;
    case 'experiment':
      await deleteOwnedRow(
        'experiments',
        context.remoteAuthUserId,
        entry.recordId!,
        await findRemoteId('experiment', entry.recordId!)
      );
      await clearSyncMetadata('experiment', entry.recordId!);
      return;
    case 'session':
      await deleteOwnedRow('sessions', context.remoteAuthUserId, entry.recordId!, await findRemoteId('session', entry.recordId!));
      await clearSyncMetadata('session', entry.recordId!);
      return;
    case 'session_group_share':
      await deleteOwnedRow(
        'session_group_shares',
        context.remoteAuthUserId,
        entry.recordId!,
        await findRemoteId('session_group_share', entry.recordId!)
      );
      await clearSyncMetadata('session_group_share', entry.recordId!);
      return;
    case 'saved_setup':
      await deleteRemoteSavedSetup(context, entry);
      return;
    default:
      return;
  }
};

const syncSavedSetup = async (
  context: SyncContext,
  localRecordId: number,
  payloadJson: string
) => {
  const fly = context.loaded.savedFlies.find((entry) => entry.id === localRecordId);
  if (fly) {
    const remoteId = await upsertOwnedRow('saved_flies', context.remoteAuthUserId, fly.id, {
      payload_json: fly,
      created_at: fly.createdAt
    });
    await recordSyncSuccess('saved_setup', fly.id, remoteId);
    return;
  }

  const formula = context.loaded.savedLeaderFormulas.find((entry) => entry.id === localRecordId);
  if (formula) {
    const remoteId = await upsertOwnedRow('saved_leader_formulas', context.remoteAuthUserId, formula.id, {
      payload_json: formula,
      created_at: formula.createdAt
    });
    await recordSyncSuccess('saved_setup', formula.id, remoteId);
    return;
  }

  const preset = context.loaded.savedRigPresets.find((entry) => entry.id === localRecordId);
  if (preset) {
    const remoteId = await upsertOwnedRow('saved_rig_presets', context.remoteAuthUserId, preset.id, {
      payload_json: preset,
      created_at: preset.createdAt
    });
    await recordSyncSuccess('saved_setup', preset.id, remoteId);
    return;
  }

  const river = context.loaded.savedRivers.find((entry) => entry.id === localRecordId);
  if (river) {
    const remoteId = await upsertOwnedRow('saved_rivers', context.remoteAuthUserId, river.id, {
      name: river.name,
      created_at: river.createdAt
    });
    await recordSyncSuccess('saved_setup', river.id, remoteId);
    return;
  }

  throw new Error(`Unable to resolve saved setup payload for sync item ${localRecordId}: ${payloadJson}`);
};

export const syncQueueToSupabase = async (
  context: SyncContext,
  queueEntries: SyncQueueEntry[]
) => {
  await syncProfile(context);

  for (const entry of queueEntries.filter((item) => item.status !== 'synced').sort((left, right) => left.createdAt.localeCompare(right.createdAt))) {
    try {
      if (entry.operation === 'delete') {
        await deleteRemoteEntity(context, entry);
        await updateSyncQueueEntry(entry.id, {
          status: 'synced',
          syncedAt: new Date().toISOString(),
          errorMessage: null
        });
        continue;
      }

      switch (entry.entityType) {
        case 'profile':
          await syncProfile(context);
          break;
        case 'group':
          if (entry.recordId) {
            const group = context.loaded.groups.find((item) => item.id === entry.recordId);
            if (group) await syncGroup(context, group);
          }
          break;
        case 'group_membership':
          if (entry.recordId) {
            const membership = context.loaded.groupMemberships.find((item) => item.id === entry.recordId);
            if (membership) await syncGroupMembership(context, membership);
          }
          break;
        case 'share_preference': {
          const payload = JSON.parse(entry.payloadJson) as { groupId?: number };
          const preference = context.loaded.sharePreferences.find(
            (item) => item.groupId === payload.groupId && item.userId === context.currentUser.id
          );
          if (preference) await syncSharePreference(context, preference);
          break;
        }
        case 'invite':
          if (entry.recordId) await syncInvite(context, entry.recordId);
          break;
        case 'sponsored_access':
          if (entry.recordId) await syncSponsoredAccess(context, entry.recordId);
          break;
        case 'competition':
          if (entry.recordId) {
            const competition = context.loaded.competitions.find((item) => item.id === entry.recordId);
            if (competition) await syncCompetition(context, competition, entry.operation);
          }
          break;
        case 'competition_group':
          if (entry.recordId) {
            const group = context.loaded.competitionGroups.find((item) => item.id === entry.recordId);
            if (group) await syncCompetitionGroup(context, group);
          }
          break;
        case 'competition_session':
          if (entry.recordId) {
            const compSession = context.loaded.competitionSessions.find((item) => item.id === entry.recordId);
            if (compSession) await syncCompetitionSession(context, compSession);
          }
          break;
        case 'competition_participant':
          if (entry.recordId) {
            const participant = context.loaded.competitionParticipants.find((item) => item.id === entry.recordId);
            if (participant) await syncCompetitionParticipant(context, participant);
          }
          break;
        case 'competition_assignment':
          if (entry.recordId) {
            const assignment = context.loaded.competitionAssignments.find((item) => item.id === entry.recordId);
            if (assignment) await syncCompetitionAssignment(context, assignment);
          }
          break;
        case 'session':
          if (entry.recordId) {
            const session = context.loaded.sessions.find((item) => item.id === entry.recordId);
            if (session) await syncSession(context, session);
          }
          break;
        case 'session_group_share':
          if (entry.recordId) {
            const share = context.loaded.sessionGroupShares.find((item) => item.id === entry.recordId);
            if (share) await syncSessionGroupShare(context, share);
          }
          break;
        case 'session_segment':
          if (entry.recordId) {
            const segment = context.loaded.sessionSegments.find((item) => item.id === entry.recordId);
            if (segment) await syncSessionSegment(context, segment);
          }
          break;
        case 'catch_event':
          if (entry.recordId) {
            const catchEvent = context.loaded.catchEvents.find((item) => item.id === entry.recordId);
            if (catchEvent) await syncCatchEvent(context, catchEvent);
          }
          break;
        case 'experiment':
          if (entry.recordId) {
            const experiment = context.loaded.experiments.find((item) => item.id === entry.recordId);
            if (experiment) {
              await syncExperiment(context, experiment);
            } else {
              const payload = JSON.parse(entry.payloadJson) as Partial<Experiment>;
              if (payload.sessionId && payload.hypothesis && Array.isArray(payload.flyEntries)) {
                await syncExperiment(context, payload as Experiment);
              }
            }
          }
          break;
        case 'saved_setup':
          if (entry.recordId) {
            await syncSavedSetup(context, entry.recordId, entry.payloadJson);
          }
          break;
      }

      await updateSyncQueueEntry(entry.id, {
        status: 'synced',
        syncedAt: new Date().toISOString(),
        errorMessage: null
      });
    } catch (error) {
      await updateSyncQueueEntry(entry.id, {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown sync error'
      });
    }
  }
};
