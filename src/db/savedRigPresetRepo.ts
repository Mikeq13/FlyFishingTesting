import { RigPreset } from '@/types/rig';
import { getDb, isWeb } from './schema';
import { deleteWebRows, insertWebRow, listWebRows } from './webStore';

const WEB_RIG_PRESETS_KEY = 'fishing_lab.saved_rig_presets';
const WEB_RIG_PRESETS_ID_KEY = 'fishing_lab.saved_rig_presets.nextId';

export const createSavedRigPreset = async (payload: Omit<RigPreset, 'id' | 'createdAt'>): Promise<number> => {
  const nextPayload = {
    ...payload,
    createdAt: new Date().toISOString()
  };

  if (isWeb) {
    return insertWebRow<RigPreset>(WEB_RIG_PRESETS_KEY, WEB_RIG_PRESETS_ID_KEY, nextPayload);
  }

  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO saved_rig_presets (user_id, name, preset_json, created_at) VALUES (?, ?, ?, ?)`,
    payload.userId,
    payload.name,
    JSON.stringify({
      leaderFormulaId: payload.leaderFormulaId,
      leaderFormulaName: payload.leaderFormulaName,
      leaderFormulaSectionsSnapshot: payload.leaderFormulaSectionsSnapshot,
      flyCount: payload.flyCount,
      positions: payload.positions,
      addedTippetSections: payload.addedTippetSections,
      lengthToFirstDropperInches: payload.lengthToFirstDropperInches,
      firstToSecondDropperInches: payload.firstToSecondDropperInches
    }),
    nextPayload.createdAt
  );
  return result.lastInsertRowId;
};

export const listSavedRigPresets = async (userId: number): Promise<RigPreset[]> => {
  if (isWeb) {
    return listWebRows<RigPreset>(WEB_RIG_PRESETS_KEY).filter((preset) => preset.userId === userId);
  }

  const db = await getDb();
  const rows = await db.getAllAsync<any>('SELECT * FROM saved_rig_presets WHERE user_id = ? ORDER BY created_at DESC', userId);
  return rows.map((row) => {
    const preset = row.preset_json ? JSON.parse(row.preset_json) : {};
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      leaderFormulaId: preset.leaderFormulaId ?? undefined,
      leaderFormulaName: preset.leaderFormulaName ?? undefined,
      leaderFormulaSectionsSnapshot: preset.leaderFormulaSectionsSnapshot ?? [],
      flyCount: preset.flyCount ?? 1,
      positions: preset.positions ?? ['point'],
      addedTippetSections: preset.addedTippetSections ?? [],
      lengthToFirstDropperInches: preset.lengthToFirstDropperInches ?? undefined,
      firstToSecondDropperInches: preset.firstToSecondDropperInches ?? undefined,
      createdAt: row.created_at
    };
  });
};

export const deleteSavedRigPresetsForUser = async (userId: number): Promise<void> => {
  if (isWeb) {
    deleteWebRows<RigPreset>(WEB_RIG_PRESETS_KEY, (row) => row.userId === userId);
    return;
  }

  const db = await getDb();
  await db.runAsync('DELETE FROM saved_rig_presets WHERE user_id = ?', userId);
};

export const deleteSavedRigPreset = async (presetId: number): Promise<void> => {
  if (isWeb) {
    deleteWebRows<RigPreset>(WEB_RIG_PRESETS_KEY, (row) => row.id === presetId);
    return;
  }

  const db = await getDb();
  await db.runAsync('DELETE FROM saved_rig_presets WHERE id = ?', presetId);
};
