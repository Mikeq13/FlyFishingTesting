import { getDb, isWeb } from './schema';
import { Session } from '@/types/session';
import { deleteWebRows, insertWebRow, listWebRows, updateWebRows } from './webStore';

const WEB_SESSIONS_KEY = 'fishing_lab.sessions';
const WEB_SESSIONS_ID_KEY = 'fishing_lab.sessions.nextId';

export const createSession = async (payload: Omit<Session, 'id'>): Promise<number> => {
  if (isWeb) {
    return insertWebRow<Session>(WEB_SESSIONS_KEY, WEB_SESSIONS_ID_KEY, payload);
  }

  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO sessions (user_id, date, session_mode, planned_duration_minutes, alert_interval_minutes, alert_markers_json, notification_sound_enabled, notification_vibration_enabled, ended_at, water_type, depth_range, competition_beat, competition_session_number, competition_requires_measurement, competition_length_unit, starting_rig_setup_json, river_name, hypothesis, insect_type, insect_stage, insect_confidence, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    payload.userId,
    payload.date,
    payload.mode,
    payload.plannedDurationMinutes ?? null,
    payload.alertIntervalMinutes ?? null,
    JSON.stringify(payload.alertMarkersMinutes ?? []),
    payload.notificationSoundEnabled === false ? 0 : 1,
    payload.notificationVibrationEnabled === false ? 0 : 1,
    payload.endedAt ?? null,
    payload.waterType,
    payload.depthRange,
    payload.competitionBeat ?? null,
    payload.competitionSessionNumber ?? null,
    payload.competitionRequiresMeasurement === undefined ? 1 : payload.competitionRequiresMeasurement ? 1 : 0,
    payload.competitionLengthUnit ?? 'mm',
    payload.startingRigSetup ? JSON.stringify(payload.startingRigSetup) : null,
    payload.riverName ?? null,
    payload.hypothesis ?? null,
    'mayfly',
    'nymph',
    'low',
    payload.notes ?? null
  );
  return result.lastInsertRowId;
};

export const updateSession = async (sessionId: number, payload: Omit<Session, 'id' | 'userId'>): Promise<void> => {
  if (isWeb) {
    updateWebRows<Session>(WEB_SESSIONS_KEY, (rows) =>
      rows.map((row) => (row.id === sessionId ? { ...row, ...payload } : row))
    );
    return;
  }

  const db = await getDb();
  await db.runAsync(
    `UPDATE sessions
     SET date = ?, session_mode = ?, planned_duration_minutes = ?, alert_interval_minutes = ?, alert_markers_json = ?, notification_sound_enabled = ?, notification_vibration_enabled = ?, ended_at = ?, water_type = ?, depth_range = ?, competition_beat = ?, competition_session_number = ?, competition_requires_measurement = ?, competition_length_unit = ?, starting_rig_setup_json = ?, river_name = ?, hypothesis = ?, notes = ?
     WHERE id = ?`,
    payload.date,
    payload.mode,
    payload.plannedDurationMinutes ?? null,
    payload.alertIntervalMinutes ?? null,
    JSON.stringify(payload.alertMarkersMinutes ?? []),
    payload.notificationSoundEnabled === false ? 0 : 1,
    payload.notificationVibrationEnabled === false ? 0 : 1,
    payload.endedAt ?? null,
    payload.waterType,
    payload.depthRange,
    payload.competitionBeat ?? null,
    payload.competitionSessionNumber ?? null,
    payload.competitionRequiresMeasurement === undefined ? 1 : payload.competitionRequiresMeasurement ? 1 : 0,
    payload.competitionLengthUnit ?? 'mm',
    payload.startingRigSetup ? JSON.stringify(payload.startingRigSetup) : null,
    payload.riverName ?? null,
    payload.hypothesis ?? null,
    payload.notes ?? null,
    sessionId
  );
};

export const listSessions = async (userId: number): Promise<Session[]> => {
  if (isWeb) {
    return listWebRows<Session>(WEB_SESSIONS_KEY)
      .filter((s) => s.userId === userId)
      .map((session) => ({
        ...session,
        mode: session.mode ?? 'experiment',
        plannedDurationMinutes: session.plannedDurationMinutes ?? undefined,
        alertIntervalMinutes: session.alertIntervalMinutes === undefined ? 15 : session.alertIntervalMinutes,
        alertMarkersMinutes: session.alertMarkersMinutes ?? (typeof session.alertIntervalMinutes === 'number' ? [session.alertIntervalMinutes] : []),
        notificationSoundEnabled: session.notificationSoundEnabled ?? true,
        notificationVibrationEnabled: session.notificationVibrationEnabled ?? true,
        endedAt: session.endedAt ?? undefined,
        competitionBeat: session.competitionBeat ?? undefined,
        competitionSessionNumber: session.competitionSessionNumber ?? undefined,
        competitionRequiresMeasurement: session.competitionRequiresMeasurement ?? true,
        competitionLengthUnit: session.competitionLengthUnit ?? 'mm',
        startingRigSetup: session.startingRigSetup ?? undefined
      }));
  }

  const db = await getDb();
  const rows = await db.getAllAsync<any>('SELECT * FROM sessions WHERE user_id = ? ORDER BY date DESC', userId);
  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    date: r.date,
    mode: r.session_mode ?? 'experiment',
    plannedDurationMinutes: r.planned_duration_minutes ?? undefined,
    alertIntervalMinutes: r.alert_interval_minutes === undefined ? 15 : r.alert_interval_minutes,
    alertMarkersMinutes: r.alert_markers_json
      ? JSON.parse(r.alert_markers_json)
      : typeof r.alert_interval_minutes === 'number'
        ? [r.alert_interval_minutes]
        : [],
    notificationSoundEnabled: r.notification_sound_enabled === undefined ? true : !!r.notification_sound_enabled,
    notificationVibrationEnabled: r.notification_vibration_enabled === undefined ? true : !!r.notification_vibration_enabled,
    endedAt: r.ended_at ?? undefined,
    competitionBeat: r.competition_beat ?? undefined,
    competitionSessionNumber: r.competition_session_number ?? undefined,
    competitionRequiresMeasurement: r.competition_requires_measurement === undefined ? true : !!r.competition_requires_measurement,
    competitionLengthUnit: r.competition_length_unit ?? 'mm',
    startingRigSetup: r.starting_rig_setup_json ? JSON.parse(r.starting_rig_setup_json) : undefined,
    waterType: r.water_type,
    depthRange: r.depth_range,
    riverName: r.river_name ?? undefined,
    hypothesis: r.hypothesis ?? undefined,
    notes: r.notes ?? undefined
  }));
};

export const deleteSessionsForUser = async (userId: number): Promise<void> => {
  if (isWeb) {
    deleteWebRows<Session>(WEB_SESSIONS_KEY, (row) => row.userId === userId);
    return;
  }

  const db = await getDb();
  await db.runAsync('DELETE FROM sessions WHERE user_id = ?', userId);
};
