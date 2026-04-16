import { Competition, CompetitionParticipant, CompetitionSessionAssignment } from '@/types/group';
import { getDb, isWeb } from './schema';
import { deleteWebRows, insertWebRow, listWebRows, updateWebRows } from './webStore';

const WEB_COMPETITIONS_KEY = 'fishing_lab.competitions';
const WEB_COMPETITIONS_ID_KEY = 'fishing_lab.competitions.nextId';
const WEB_PARTICIPANTS_KEY = 'fishing_lab.competition_participants';
const WEB_PARTICIPANTS_ID_KEY = 'fishing_lab.competition_participants.nextId';
const WEB_ASSIGNMENTS_KEY = 'fishing_lab.competition_assignments';
const WEB_ASSIGNMENTS_ID_KEY = 'fishing_lab.competition_assignments.nextId';

const createJoinCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

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
    const db = await getDb();
    const result = await db.runAsync(
      `INSERT INTO competitions (group_id, organizer_user_id, name, join_code, start_at, end_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      nextPayload.groupId,
      nextPayload.organizerUserId,
      nextPayload.name,
      nextPayload.joinCode,
      nextPayload.startAt,
      nextPayload.endAt,
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

  const db = await getDb();
  const rows = await db.getAllAsync<any>('SELECT * FROM competitions ORDER BY start_at DESC');
  return rows.map((row) => ({
    id: row.id,
    groupId: row.group_id,
    organizerUserId: row.organizer_user_id,
    name: row.name,
    joinCode: row.join_code,
    startAt: row.start_at,
    endAt: row.end_at,
    createdAt: row.created_at
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
        assignment.sessionNumber === payload.sessionNumber
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

  const db = await getDb();
  const existingRows = await db.getAllAsync<{ id: number; created_at: string }>(
    `SELECT id, created_at FROM competition_session_assignments
     WHERE competition_id = ? AND user_id = ? AND session_number = ?
     LIMIT 1`,
    payload.competitionId,
    payload.userId,
    payload.sessionNumber
  );
  const existing = existingRows[0];

  if (existing) {
    await db.runAsync(
      `UPDATE competition_session_assignments
       SET assigned_group = ?, beat = ?, assignment_role = ?, start_at = ?, end_at = ?, session_id = ?, updated_at = ?
       WHERE id = ?`,
      payload.assignedGroup,
      payload.beat,
      payload.role,
      payload.startAt,
      payload.endAt,
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
     (competition_id, user_id, assigned_group, session_number, beat, assignment_role, start_at, end_at, session_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    payload.competitionId,
    payload.userId,
    payload.assignedGroup,
    payload.sessionNumber,
    payload.beat,
    payload.role,
    payload.startAt,
    payload.endAt,
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

  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM competition_session_assignments ORDER BY start_at DESC, session_number ASC'
  );
  return rows.map((row) => ({
    id: row.id,
    competitionId: row.competition_id,
    userId: row.user_id,
    assignedGroup: row.assigned_group,
    sessionNumber: row.session_number,
    beat: row.beat,
    role: row.assignment_role,
    startAt: row.start_at,
    endAt: row.end_at,
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
    deleteWebRows<CompetitionParticipant>(WEB_PARTICIPANTS_KEY, (row) => row.userId === userId || ownedIds.includes(row.competitionId));
    deleteWebRows<CompetitionSessionAssignment>(WEB_ASSIGNMENTS_KEY, (row) => row.userId === userId || ownedIds.includes(row.competitionId));
    return;
  }

  const db = await getDb();
  await db.runAsync('DELETE FROM competition_session_assignments WHERE user_id = ?', userId);
  await db.runAsync('DELETE FROM competition_participants WHERE user_id = ?', userId);
  if (ownedIds.length) {
    for (const competitionId of ownedIds) {
      await db.runAsync('DELETE FROM competition_session_assignments WHERE competition_id = ?', competitionId);
      await db.runAsync('DELETE FROM competition_participants WHERE competition_id = ?', competitionId);
      await db.runAsync('DELETE FROM competitions WHERE id = ?', competitionId);
    }
  }
};
