import {
  Competition,
  CompetitionGroup,
  CompetitionParticipant,
  CompetitionSession,
  CompetitionSessionAssignment
} from '@/types/group';
import { getDb, isWeb } from './schema';
import { deleteWebRows, insertWebRow, listWebRows, updateWebRows } from './webStore';

const WEB_COMPETITIONS_KEY = 'fishing_lab.competitions';
const WEB_COMPETITIONS_ID_KEY = 'fishing_lab.competitions.nextId';
const WEB_COMPETITION_GROUPS_KEY = 'fishing_lab.competition_groups';
const WEB_COMPETITION_GROUPS_ID_KEY = 'fishing_lab.competition_groups.nextId';
const WEB_COMPETITION_SESSIONS_KEY = 'fishing_lab.competition_sessions';
const WEB_COMPETITION_SESSIONS_ID_KEY = 'fishing_lab.competition_sessions.nextId';
const WEB_PARTICIPANTS_KEY = 'fishing_lab.competition_participants';
const WEB_PARTICIPANTS_ID_KEY = 'fishing_lab.competition_participants.nextId';
const WEB_ASSIGNMENTS_KEY = 'fishing_lab.competition_assignments';
const WEB_ASSIGNMENTS_ID_KEY = 'fishing_lab.competition_assignments.nextId';

const createJoinCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

let ensuredCompetitionTables = false;

const ensureCompetitionTables = async () => {
  if (isWeb || ensuredCompetitionTables) return;
  const db = await getDb();
  await db.execAsync(`CREATE TABLE IF NOT EXISTS competitions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organizer_user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    join_code TEXT NOT NULL,
    group_count INTEGER NOT NULL DEFAULT 1,
    session_count INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    FOREIGN KEY(organizer_user_id) REFERENCES users(id)
  )`);
  try {
    await db.execAsync(`ALTER TABLE competitions ADD COLUMN group_count INTEGER NOT NULL DEFAULT 1`);
  } catch {}
  try {
    await db.execAsync(`ALTER TABLE competitions ADD COLUMN session_count INTEGER NOT NULL DEFAULT 1`);
  } catch {}
  await db.execAsync(`CREATE TABLE IF NOT EXISTS competition_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    competition_id INTEGER NOT NULL,
    label TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    FOREIGN KEY(competition_id) REFERENCES competitions(id)
  )`);
  await db.execAsync(`CREATE TABLE IF NOT EXISTS competition_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    competition_id INTEGER NOT NULL,
    session_number INTEGER NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    FOREIGN KEY(competition_id) REFERENCES competitions(id)
  )`);
  await db.execAsync(`CREATE TABLE IF NOT EXISTS competition_participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    competition_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    joined_at TEXT NOT NULL,
    FOREIGN KEY(competition_id) REFERENCES competitions(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);
  await db.execAsync(`CREATE TABLE IF NOT EXISTS competition_session_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    competition_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    competition_group_id INTEGER,
    competition_session_id INTEGER,
    beat TEXT NOT NULL,
    assignment_role TEXT NOT NULL DEFAULT 'fishing',
    session_id INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(competition_id) REFERENCES competitions(id),
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(competition_group_id) REFERENCES competition_groups(id),
    FOREIGN KEY(competition_session_id) REFERENCES competition_sessions(id),
    FOREIGN KEY(session_id) REFERENCES sessions(id)
  )`);
  try {
    await db.execAsync(`ALTER TABLE competition_session_assignments ADD COLUMN competition_group_id INTEGER`);
  } catch {}
  try {
    await db.execAsync(`ALTER TABLE competition_session_assignments ADD COLUMN competition_session_id INTEGER`);
  } catch {}
  ensuredCompetitionTables = true;
};

export const createCompetition = async (
  payload: Omit<Competition, 'id' | 'createdAt' | 'joinCode'>
): Promise<Competition> => {
  const createdAt = new Date().toISOString();
  const nextPayload = {
    ...payload,
    joinCode: createJoinCode(),
    createdAt
  };
  let id: number;

  if (isWeb) {
    id = insertWebRow<Competition>(WEB_COMPETITIONS_KEY, WEB_COMPETITIONS_ID_KEY, nextPayload);
  } else {
    await ensureCompetitionTables();
    const db = await getDb();
    const result = await db.runAsync(
      `INSERT INTO competitions (organizer_user_id, name, join_code, group_count, session_count, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      nextPayload.organizerUserId,
      nextPayload.name,
      nextPayload.joinCode,
      nextPayload.groupCount,
      nextPayload.sessionCount,
      createdAt
    );
    id = result.lastInsertRowId;
  }

  return { id, ...nextPayload };
};

export const listCompetitions = async (): Promise<Competition[]> => {
  if (isWeb) {
    return listWebRows<Competition>(WEB_COMPETITIONS_KEY);
  }

  await ensureCompetitionTables();
  const db = await getDb();
  const rows = await db.getAllAsync<any>('SELECT * FROM competitions ORDER BY created_at DESC');
  return rows.map((row) => ({
    id: row.id,
    organizerUserId: row.organizer_user_id,
    name: row.name,
    joinCode: row.join_code,
    groupCount: row.group_count ?? 1,
    sessionCount: row.session_count ?? 1,
    createdAt: row.created_at
  }));
};

export const createCompetitionGroup = async (
  payload: Omit<CompetitionGroup, 'id'>
): Promise<CompetitionGroup> => {
  let id: number;

  if (isWeb) {
    id = insertWebRow<CompetitionGroup>(WEB_COMPETITION_GROUPS_KEY, WEB_COMPETITION_GROUPS_ID_KEY, payload);
  } else {
    await ensureCompetitionTables();
    const db = await getDb();
    const result = await db.runAsync(
      `INSERT INTO competition_groups (competition_id, label, sort_order) VALUES (?, ?, ?)`,
      payload.competitionId,
      payload.label,
      payload.sortOrder
    );
    id = result.lastInsertRowId;
  }

  return { id, ...payload };
};

export const listCompetitionGroups = async (): Promise<CompetitionGroup[]> => {
  if (isWeb) {
    return listWebRows<CompetitionGroup>(WEB_COMPETITION_GROUPS_KEY);
  }

  await ensureCompetitionTables();
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM competition_groups ORDER BY competition_id ASC, sort_order ASC'
  );
  return rows.map((row) => ({
    id: row.id,
    competitionId: row.competition_id,
    label: row.label,
    sortOrder: row.sort_order
  }));
};

export const createCompetitionSession = async (
  payload: Omit<CompetitionSession, 'id'>
): Promise<CompetitionSession> => {
  let id: number;

  if (isWeb) {
    id = insertWebRow<CompetitionSession>(
      WEB_COMPETITION_SESSIONS_KEY,
      WEB_COMPETITION_SESSIONS_ID_KEY,
      payload
    );
  } else {
    await ensureCompetitionTables();
    const db = await getDb();
    const result = await db.runAsync(
      `INSERT INTO competition_sessions (competition_id, session_number, start_time, end_time)
       VALUES (?, ?, ?, ?)`,
      payload.competitionId,
      payload.sessionNumber,
      payload.startTime,
      payload.endTime
    );
    id = result.lastInsertRowId;
  }

  return { id, ...payload };
};

export const listCompetitionSessions = async (): Promise<CompetitionSession[]> => {
  if (isWeb) {
    return listWebRows<CompetitionSession>(WEB_COMPETITION_SESSIONS_KEY);
  }

  await ensureCompetitionTables();
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM competition_sessions ORDER BY competition_id ASC, session_number ASC'
  );
  return rows.map((row) => ({
    id: row.id,
    competitionId: row.competition_id,
    sessionNumber: row.session_number,
    startTime: row.start_time,
    endTime: row.end_time
  }));
};

export const createCompetitionParticipant = async (
  payload: Omit<CompetitionParticipant, 'id' | 'joinedAt'>
): Promise<CompetitionParticipant> => {
  const joinedAt = new Date().toISOString();
  const nextPayload = { ...payload, joinedAt };
  let id: number;

  if (isWeb) {
    id = insertWebRow<CompetitionParticipant>(WEB_PARTICIPANTS_KEY, WEB_PARTICIPANTS_ID_KEY, nextPayload);
  } else {
    await ensureCompetitionTables();
    const db = await getDb();
    const result = await db.runAsync(
      `INSERT INTO competition_participants (competition_id, user_id, joined_at) VALUES (?, ?, ?)`,
      nextPayload.competitionId,
      nextPayload.userId,
      joinedAt
    );
    id = result.lastInsertRowId;
  }

  return { id, ...nextPayload };
};

export const listCompetitionParticipants = async (): Promise<CompetitionParticipant[]> => {
  if (isWeb) {
    return listWebRows<CompetitionParticipant>(WEB_PARTICIPANTS_KEY);
  }

  await ensureCompetitionTables();
  const db = await getDb();
  const rows = await db.getAllAsync<any>('SELECT * FROM competition_participants ORDER BY joined_at DESC');
  return rows.map((row) => ({
    id: row.id,
    competitionId: row.competition_id,
    userId: row.user_id,
    joinedAt: row.joined_at
  }));
};

export const upsertCompetitionAssignment = async (
  payload: Omit<CompetitionSessionAssignment, 'id' | 'createdAt' | 'updatedAt'>
): Promise<CompetitionSessionAssignment> => {
  const createdAt = new Date().toISOString();
  const updatedAt = createdAt;

  if (isWeb) {
    const existing = listWebRows<CompetitionSessionAssignment>(WEB_ASSIGNMENTS_KEY).find(
      (assignment) =>
        assignment.competitionId === payload.competitionId &&
        assignment.userId === payload.userId &&
        assignment.competitionSessionId === payload.competitionSessionId
    );
    if (existing) {
      updateWebRows<CompetitionSessionAssignment>(WEB_ASSIGNMENTS_KEY, (rows) =>
        rows.map((row) =>
          row.id === existing.id
            ? {
                ...row,
                ...payload,
                updatedAt
              }
            : row
        )
      );
      return {
        ...existing,
        ...payload,
        updatedAt
      };
    }
    const id = insertWebRow<CompetitionSessionAssignment>(WEB_ASSIGNMENTS_KEY, WEB_ASSIGNMENTS_ID_KEY, {
      ...payload,
      createdAt,
      updatedAt
    });
    return { id, ...payload, createdAt, updatedAt };
  }

  await ensureCompetitionTables();
  const db = await getDb();
  const existingRows = await db.getAllAsync<{ id: number; created_at: string }>(
    `SELECT id, created_at FROM competition_session_assignments
     WHERE competition_id = ? AND user_id = ? AND competition_session_id = ?
     LIMIT 1`,
    payload.competitionId,
    payload.userId,
    payload.competitionSessionId
  );
  const existing = existingRows[0];

  if (existing) {
    await db.runAsync(
      `UPDATE competition_session_assignments
       SET competition_group_id = ?, beat = ?, assignment_role = ?, competition_session_id = ?, session_id = ?, updated_at = ?
       WHERE id = ?`,
      payload.competitionGroupId,
      payload.beat,
      payload.role,
      payload.competitionSessionId,
      payload.sessionId ?? null,
      updatedAt,
      existing.id
    );
    return {
      id: existing.id,
      ...payload,
      createdAt: existing.created_at,
      updatedAt
    };
  }

  const result = await db.runAsync(
    `INSERT INTO competition_session_assignments
     (competition_id, user_id, competition_group_id, competition_session_id, beat, assignment_role, session_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    payload.competitionId,
    payload.userId,
    payload.competitionGroupId,
    payload.competitionSessionId,
    payload.beat,
    payload.role,
    payload.sessionId ?? null,
    createdAt,
    updatedAt
  );

  return {
    id: result.lastInsertRowId,
    ...payload,
    createdAt,
    updatedAt
  };
};

export const listCompetitionAssignments = async (): Promise<CompetitionSessionAssignment[]> => {
  if (isWeb) {
    return listWebRows<CompetitionSessionAssignment>(WEB_ASSIGNMENTS_KEY);
  }

  await ensureCompetitionTables();
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM competition_session_assignments ORDER BY competition_session_id ASC, user_id ASC'
  );
  return rows.map((row) => ({
    id: row.id,
    competitionId: row.competition_id,
    userId: row.user_id,
    competitionGroupId: row.competition_group_id,
    competitionSessionId: row.competition_session_id,
    beat: row.beat,
    role: row.assignment_role,
    sessionId: row.session_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
};

export const deleteCompetitionsForUser = async (userId: number): Promise<void> => {
  const competitions = await listCompetitions();
  const ownedIds = competitions.filter((competition) => competition.organizerUserId === userId).map((competition) => competition.id);

  if (isWeb) {
    deleteWebRows<Competition>(WEB_COMPETITIONS_KEY, (row) => ownedIds.includes(row.id));
    deleteWebRows<CompetitionGroup>(WEB_COMPETITION_GROUPS_KEY, (row) => ownedIds.includes(row.competitionId));
    deleteWebRows<CompetitionSession>(WEB_COMPETITION_SESSIONS_KEY, (row) => ownedIds.includes(row.competitionId));
    deleteWebRows<CompetitionParticipant>(WEB_PARTICIPANTS_KEY, (row) => row.userId === userId || ownedIds.includes(row.competitionId));
    deleteWebRows<CompetitionSessionAssignment>(WEB_ASSIGNMENTS_KEY, (row) => row.userId === userId || ownedIds.includes(row.competitionId));
    return;
  }

  await ensureCompetitionTables();
  const db = await getDb();
  await db.runAsync('DELETE FROM competition_session_assignments WHERE user_id = ?', userId);
  await db.runAsync('DELETE FROM competition_participants WHERE user_id = ?', userId);
  if (ownedIds.length) {
    for (const competitionId of ownedIds) {
      await db.runAsync('DELETE FROM competition_session_assignments WHERE competition_id = ?', competitionId);
      await db.runAsync('DELETE FROM competition_groups WHERE competition_id = ?', competitionId);
      await db.runAsync('DELETE FROM competition_sessions WHERE competition_id = ?', competitionId);
      await db.runAsync('DELETE FROM competition_participants WHERE competition_id = ?', competitionId);
      await db.runAsync('DELETE FROM competitions WHERE id = ?', competitionId);
    }
  }
};
