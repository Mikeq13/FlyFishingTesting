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

  return {
    ownedSessions: accessibleSessions.filter((session) => session.userId === accessSnapshot.entityMaps.userIdByAuthId.get(currentAuthUserId)),
    accessibleSessions,
    ownedSessionSegments: accessibleSessionSegments.filter((segment) => segment.userId === accessSnapshot.entityMaps.userIdByAuthId.get(currentAuthUserId)),
    accessibleSessionSegments,
    ownedCatchEvents: accessibleCatchEvents.filter((event) => event.userId === accessSnapshot.entityMaps.userIdByAuthId.get(currentAuthUserId)),
    accessibleCatchEvents,
    ownedExperiments: accessibleExperiments.filter((experiment) => experiment.userId === accessSnapshot.entityMaps.userIdByAuthId.get(currentAuthUserId)),
    accessibleExperiments,
    savedFlies: (savedFliesResponse.data ?? []).map((row) => mapRemoteSavedFly(row, currentAuthUserId)),
    savedLeaderFormulas: (savedLeaderFormulasResponse.data ?? []).map((row) =>
      mapRemoteLeaderFormula(row, currentAuthUserId)
    ),
    savedRigPresets: (savedRigPresetsResponse.data ?? []).map((row) => mapRemoteRigPreset(row, currentAuthUserId)),
    savedRivers: (savedRiversResponse.data ?? []).map((row) => mapRemoteSavedRiver(row, currentAuthUserId))
  };
};
