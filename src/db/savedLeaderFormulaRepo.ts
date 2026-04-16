import { LeaderFormula } from '@/types/rig';
import { getDb, isWeb } from './schema';
import { deleteWebRows, insertWebRow, listWebRows } from './webStore';

const WEB_LEADER_FORMULAS_KEY = 'fishing_lab.saved_leader_formulas';
const WEB_LEADER_FORMULAS_ID_KEY = 'fishing_lab.saved_leader_formulas.nextId';

export const createSavedLeaderFormula = async (payload: Omit<LeaderFormula, 'id' | 'createdAt'>): Promise<number> => {
  const nextPayload = {
    ...payload,
    createdAt: new Date().toISOString()
  };

  if (isWeb) {
    return insertWebRow<LeaderFormula>(WEB_LEADER_FORMULAS_KEY, WEB_LEADER_FORMULAS_ID_KEY, nextPayload);
  }

  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO saved_leader_formulas (user_id, name, sections_json, created_at) VALUES (?, ?, ?, ?)`,
    payload.userId,
    payload.name,
    JSON.stringify(payload.sections),
    nextPayload.createdAt
  );
  return result.lastInsertRowId;
};

export const listSavedLeaderFormulas = async (userId: number): Promise<LeaderFormula[]> => {
  if (isWeb) {
    return listWebRows<LeaderFormula>(WEB_LEADER_FORMULAS_KEY).filter((formula) => formula.userId === userId);
  }

  const db = await getDb();
  const rows = await db.getAllAsync<any>('SELECT * FROM saved_leader_formulas WHERE user_id = ? ORDER BY created_at DESC', userId);
  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    name: row.name,
    sections: row.sections_json ? JSON.parse(row.sections_json) : [],
    createdAt: row.created_at
  }));
};

export const deleteSavedLeaderFormulasForUser = async (userId: number): Promise<void> => {
  if (isWeb) {
    deleteWebRows<LeaderFormula>(WEB_LEADER_FORMULAS_KEY, (row) => row.userId === userId);
    return;
  }

  const db = await getDb();
  await db.runAsync('DELETE FROM saved_leader_formulas WHERE user_id = ?', userId);
};

export const deleteSavedLeaderFormula = async (formulaId: number): Promise<void> => {
  if (isWeb) {
    deleteWebRows<LeaderFormula>(WEB_LEADER_FORMULAS_KEY, (row) => row.id === formulaId);
    return;
  }

  const db = await getDb();
  await db.runAsync('DELETE FROM saved_leader_formulas WHERE id = ?', formulaId);
};
