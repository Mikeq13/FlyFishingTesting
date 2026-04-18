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
  mapRemoteSessionSegment
} from './remoteMappingService';

export const fetchRemoteSharedDataSnapshot = async (
  currentAuthUserId: string,
  accessSnapshot: RemoteAccessSnapshot
): Promise<RemoteSharedDataSnapshot> => {
  const [
    sessionsResponse,
    segmentsResponse,
    catchesResponse,
    experimentsResponse,
    savedFliesResponse,
    savedLeaderFormulasResponse,
    savedRigPresetsResponse,
    savedRiversResponse
  ] = await Promise.all([
    supabase.from('sessions').select(REMOTE_SHARED_SELECTS.sessions),
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
  const segmentRows = segmentsResponse.data ?? [];
  const catchRows = catchesResponse.data ?? [];
  const experimentRows = experimentsResponse.data ?? [];
  const sessionIdByRemoteId = createSessionMaps(sessionRows, currentAuthUserId);
  const segmentIdByRemoteId = createSegmentMaps(segmentRows, currentAuthUserId);

  const accessibleSessions = sessionRows.map((row) =>
    mapRemoteSession(row, currentAuthUserId, accessSnapshot.entityMaps)
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
  const visibleSessions = accessibleSessions.filter(
    (session) => session.userId === accessSnapshot.entityMaps.userIdByAuthId.get(currentAuthUserId) || (session.sharedGroupId && joinedGroupIds.has(session.sharedGroupId))
  );
  const visibleSessionIds = new Set(visibleSessions.map((session) => session.id));
  const visibleSegments = accessibleSessionSegments.filter((segment) => visibleSessionIds.has(segment.sessionId));
  const visibleSegmentIds = new Set(visibleSegments.map((segment) => segment.id));
  const visibleCatchEvents = accessibleCatchEvents.filter(
    (event) => visibleSessionIds.has(event.sessionId) && (!event.segmentId || visibleSegmentIds.has(event.segmentId))
  );
  const visibleExperiments = accessibleExperiments.filter((experiment) => visibleSessionIds.has(experiment.sessionId));
  const currentUserId = accessSnapshot.entityMaps.userIdByAuthId.get(currentAuthUserId);

  return {
    ownedSessions: visibleSessions.filter((session) => session.userId === currentUserId),
    accessibleSessions: visibleSessions,
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
