import { LeaderFormula } from '@/types/rig';
import { getDb, isWeb } from './schema';
import { deleteWebRows, insertWebRow, listWebRows, updateWebRows } from './webStore';
import { dedupeSavedLeaderFormulasByIdentity, getLeaderFormulaIdentityKey, normalizeIdentityName } from '@/utils/dataIdentity';

const WEB_LEADER_FORMULAS_KEY = 'fishing_lab.saved_leader_formulas';
const WEB_LEADER_FORMULAS_ID_KEY = 'fishing_lab.saved_leader_formulas.nextId';

export const createSavedLeaderFormula = async (payload: Omit<LeaderFormula, 'id' | 'createdAt'>): Promise<number> => {
  return (await ensureSavedLeaderFormula(payload)).id;
};

export const ensureSavedLeaderFormula = async (
  payload: Omit<LeaderFormula, 'id' | 'createdAt'>
): Promise<{ id: number; created: boolean }> => {
  const nextPayload = {
    ...payload,
    name: payload.name.trim(),
    createdAt: new Date().toISOString()
  };
  const normalizedName = normalizeIdentityName(nextPayload.name);

  if (isWeb) {
    const existing = listWebRows<LeaderFormula>(WEB_LEADER_FORMULAS_KEY).find(
      (formula) => getLeaderFormulaIdentityKey(formula) === `${payload.userId}:${normalizedName}`
    );
    if (existing) {
      return { id: existing.id, created: false };
    }
    return {
      id: insertWebRow<LeaderFormula>(WEB_LEADER_FORMULAS_KEY, WEB_LEADER_FORMULAS_ID_KEY, nextPayload),
      created: true
    };
  }

  const db = await getDb();
  const [existing] = await db.getAllAsync<{ id: number }>(
    `SELECT id FROM saved_leader_formulas WHERE user_id = ? AND normalized_name = ? ORDER BY id DESC LIMIT 1`,
    payload.userId,
    normalizedName
  );
  if (existing) {
    return { id: existing.id, created: false };
  }
  const result = await db.runAsync(
    `INSERT INTO saved_leader_formulas (user_id, name, normalized_name, sections_json, created_at) VALUES (?, ?, ?, ?, ?)`,
    payload.userId,
    nextPayload.name,
    normalizedName,
    JSON.stringify(payload.sections),
    nextPayload.createdAt
  );
  return { id: result.lastInsertRowId, created: true };
};

export const listSavedLeaderFormulas = async (userId: number): Promise<LeaderFormula[]> => {
  if (isWeb) {
    const rows = listWebRows<LeaderFormula>(WEB_LEADER_FORMULAS_KEY).filter((formula) => formula.userId === userId);
    const dedupedRows = dedupeSavedLeaderFormulasByIdentity(rows);
    if (dedupedRows.length !== rows.length) {
      updateWebRows<LeaderFormula>(WEB_LEADER_FORMULAS_KEY, (currentRows) =>
        dedupeSavedLeaderFormulasByIdentity(currentRows)
      );
    }
    return dedupedRows;
  }

  const db = await getDb();
  const rows = await db.getAllAsync<any>('SELECT * FROM saved_leader_formulas WHERE user_id = ? ORDER BY created_at DESC', userId);
  const formulas = rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    name: row.name,
    sections: row.sections_json ? JSON.parse(row.sections_json) : [],
    createdAt: row.created_at
  }));
  const dedupedFormulas = dedupeSavedLeaderFormulasByIdentity(formulas);
  if (dedupedFormulas.length !== formulas.length) {
    const keepIds = new Set(dedupedFormulas.map((formula) => formula.id));
    const duplicateIds = formulas.filter((formula) => !keepIds.has(formula.id)).map((formula) => formula.id);
    if (duplicateIds.length) {
      const placeholders = duplicateIds.map(() => '?').join(', ');
      await db.runAsync(`DELETE FROM saved_leader_formulas WHERE id IN (${placeholders})`, ...duplicateIds);
    }
  }
  return dedupedFormulas;
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
