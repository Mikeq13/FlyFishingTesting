import { RemoteAccessSnapshot, RemoteSharedDataSnapshot } from '@/types/remote';
import { supabase } from './supabaseClient';
import { REMOTE_SHARED_SELECTS } from './remoteSelects';
import {
  createSegmentMaps,
  createSessionMaps,
  mapRemoteCatchEvent,
  mapRemoteExperiment,
  mapRemoteLeaderFormula,
  mapRemoteRigPreset,
  mapRemoteSavedFly,
  mapRemoteSavedRiver,
  mapRemoteSession,
  mapRemoteSessionGroupShare,
  mapRemoteSessionSegment
} from './remoteMappingService';
import { applySessionShareIds } from '@/utils/sessionSharing';

const dedupeById = <T extends { id: number }>(records: T[]) => [...new Map(records.map((record) => [record.id, record])).values()];

export const fetchRemoteSharedDataSnapshot = async (
  currentAuthUserId: string,
  accessSnapshot: RemoteAccessSnapshot
): Promise<RemoteSharedDataSnapshot> => {
  const [
    sessionsResponse,
    sessionGroupSharesResponse,
    segmentsResponse,
    catchesResponse,
    experimentsResponse,
    savedFliesResponse,
    savedLeaderFormulasResponse,
    savedRigPresetsResponse,
    savedRiversResponse
  ] = await Promise.all([
    supabase.from('sessions').select(REMOTE_SHARED_SELECTS.sessions),
    supabase.from('session_group_shares').select(REMOTE_SHARED_SELECTS.sessionGroupShares),
    supabase.from('session_segments').select(REMOTE_SHARED_SELECTS.sessionSegments),
    supabase.from('catch_events').select(REMOTE_SHARED_SELECTS.catchEvents),
    supabase.from('experiments').select(REMOTE_SHARED_SELECTS.experiments),
    supabase.from('saved_flies').select(REMOTE_SHARED_SELECTS.savedFlies),
    supabase.from('saved_leader_formulas').select(REMOTE_SHARED_SELECTS.savedLeaderFormulas),
    supabase.from('saved_rig_presets').select(REMOTE_SHARED_SELECTS.savedRigPresets),
    supabase.from('saved_rivers').select(REMOTE_SHARED_SELECTS.savedRivers)
  ]);

  const responses = [
    sessionsResponse,
    sessionGroupSharesResponse,
    segmentsResponse,
    catchesResponse,
    experimentsResponse,
    savedFliesResponse,
    savedLeaderFormulasResponse,
    savedRigPresetsResponse,
    savedRiversResponse
  ];
  const error = responses.find((response) => response.error)?.error;
  if (error) throw error;

  const sessionRows = sessionsResponse.data ?? [];
  const sessionGroupShareRows = sessionGroupSharesResponse.data ?? [];
  const segmentRows = segmentsResponse.data ?? [];
  const catchRows = catchesResponse.data ?? [];
  const experimentRows = experimentsResponse.data ?? [];
  const sessionIdByRemoteId = createSessionMaps(sessionRows, currentAuthUserId);
  const segmentIdByRemoteId = createSegmentMaps(segmentRows, currentAuthUserId);

  const accessibleSessions = sessionRows.map((row) =>
    mapRemoteSession(row, currentAuthUserId, accessSnapshot.entityMaps)
  );
  const accessibleSessionGroupShares = sessionGroupShareRows.map((row) =>
    mapRemoteSessionGroupShare(row, currentAuthUserId, accessSnapshot.entityMaps, sessionIdByRemoteId)
  );
  const accessibleSessionSegments = segmentRows.map((row) =>
    mapRemoteSessionSegment(row, currentAuthUserId, accessSnapshot.entityMaps, sessionIdByRemoteId)
  );
  const accessibleCatchEvents = catchRows.map((row) =>
    mapRemoteCatchEvent(row, currentAuthUserId, accessSnapshot.entityMaps, sessionIdByRemoteId, segmentIdByRemoteId)
  );
  const accessibleExperiments = experimentRows.map((row) =>
    mapRemoteExperiment(row, currentAuthUserId, accessSnapshot.entityMaps, sessionIdByRemoteId)
  ).filter((experiment) => !experiment.archivedAt);
  const joinedGroupIds = new Set(
    accessSnapshot.groupMemberships
      .filter((membership) => membership.userId === accessSnapshot.entityMaps.userIdByAuthId.get(currentAuthUserId))
      .map((membership) => membership.groupId)
  );
  const currentUserId = accessSnapshot.entityMaps.userIdByAuthId.get(currentAuthUserId);
  const shareGroupIdsBySessionId = new Map<number, number[]>();
  accessibleSessionGroupShares.forEach((share) => {
    const existing = shareGroupIdsBySessionId.get(share.sessionId) ?? [];
    if (!existing.includes(share.groupId)) {
      shareGroupIdsBySessionId.set(share.sessionId, [...existing, share.groupId]);
    }
  });
  const visibleSessions = dedupeById(
    applySessionShareIds(
      accessibleSessions.filter((session) => {
        if (session.userId === currentUserId) return true;
        const sharedGroupIds = [
          ...(shareGroupIdsBySessionId.get(session.id) ?? []),
          ...(session.sharedGroupId ? [session.sharedGroupId] : [])
        ];
        return sharedGroupIds.some((groupId) => joinedGroupIds.has(groupId));
      }),
      accessibleSessionGroupShares
    )
  );
  const visibleSessionIds = new Set(visibleSessions.map((session) => session.id));
  const visibleSessionGroupShares = dedupeById(
    accessibleSessionGroupShares.filter((share) => visibleSessionIds.has(share.sessionId))
  );
  const visibleSegments = accessibleSessionSegments.filter((segment) => visibleSessionIds.has(segment.sessionId));
  const visibleSegmentIds = new Set(visibleSegments.map((segment) => segment.id));
  const visibleCatchEvents = accessibleCatchEvents.filter(
    (event) => visibleSessionIds.has(event.sessionId) && (!event.segmentId || visibleSegmentIds.has(event.segmentId))
  );
  const visibleExperiments = dedupeById(accessibleExperiments.filter((experiment) => visibleSessionIds.has(experiment.sessionId)));

  return {
    ownedSessions: visibleSessions.filter((session) => session.userId === currentUserId),
    accessibleSessions: visibleSessions,
    ownedSessionGroupShares: visibleSessionGroupShares.filter((share) => share.userId === currentUserId),
    accessibleSessionGroupShares: visibleSessionGroupShares,
    ownedSessionSegments: visibleSegments.filter((segment) => segment.userId === currentUserId),
    accessibleSessionSegments: visibleSegments,
    ownedCatchEvents: visibleCatchEvents.filter((event) => event.userId === currentUserId),
    accessibleCatchEvents: visibleCatchEvents,
    ownedExperiments: visibleExperiments.filter((experiment) => experiment.userId === currentUserId),
    accessibleExperiments: visibleExperiments,
    savedFlies: (savedFliesResponse.data ?? [])
      .filter((row) => row.owner_auth_user_id === currentAuthUserId)
      .map((row) => mapRemoteSavedFly(row, currentAuthUserId)),
    savedLeaderFormulas: (savedLeaderFormulasResponse.data ?? [])
      .filter((row) => row.owner_auth_user_id === currentAuthUserId)
      .map((row) =>
      mapRemoteLeaderFormula(row, currentAuthUserId)
    ),
    savedRigPresets: (savedRigPresetsResponse.data ?? [])
      .filter((row) => row.owner_auth_user_id === currentAuthUserId)
      .map((row) => mapRemoteRigPreset(row, currentAuthUserId)),
    savedRivers: (savedRiversResponse.data ?? [])
      .filter((row) => row.owner_auth_user_id === currentAuthUserId)
      .map((row) => mapRemoteSavedRiver(row, currentAuthUserId))
  };
};
