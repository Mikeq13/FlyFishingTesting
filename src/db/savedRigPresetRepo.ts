import { RigPreset } from '@/types/rig';
import { getDb, isWeb } from './schema';
import { deleteWebRows, insertWebRow, listWebRows, updateWebRows } from './webStore';
import { dedupeSavedRigPresetsByIdentity, getRigPresetIdentityKey, normalizeIdentityName } from '@/utils/dataIdentity';

const WEB_RIG_PRESETS_KEY = 'fishing_lab.saved_rig_presets';
const WEB_RIG_PRESETS_ID_KEY = 'fishing_lab.saved_rig_presets.nextId';

export const createSavedRigPreset = async (payload: Omit<RigPreset, 'id' | 'createdAt'>): Promise<number> => {
  return (await ensureSavedRigPreset(payload)).id;
};

export const ensureSavedRigPreset = async (
  payload: Omit<RigPreset, 'id' | 'createdAt'>
): Promise<{ id: number; created: boolean }> => {
  const nextPayload = {
    ...payload,
    name: payload.name.trim(),
    createdAt: new Date().toISOString()
  };
  const normalizedName = normalizeIdentityName(nextPayload.name);

  if (isWeb) {
    const existing = listWebRows<RigPreset>(WEB_RIG_PRESETS_KEY).find(
      (preset) => getRigPresetIdentityKey(preset) === `${payload.userId}:${normalizedName}`
    );
    if (existing) {
      return { id: existing.id, created: false };
    }
    return {
      id: insertWebRow<RigPreset>(WEB_RIG_PRESETS_KEY, WEB_RIG_PRESETS_ID_KEY, nextPayload),
      created: true
    };
  }

  const db = await getDb();
  const [existing] = await db.getAllAsync<{ id: number }>(
    `SELECT id FROM saved_rig_presets WHERE user_id = ? AND normalized_name = ? ORDER BY id DESC LIMIT 1`,
    payload.userId,
    normalizedName
  );
  if (existing) {
    return { id: existing.id, created: false };
  }
  const result = await db.runAsync(
    `INSERT INTO saved_rig_presets (user_id, name, normalized_name, preset_json, created_at) VALUES (?, ?, ?, ?, ?)`,
    payload.userId,
    nextPayload.name,
    normalizedName,
    JSON.stringify({
      leaderFormulaId: payload.leaderFormulaId,
      leaderFormulaName: payload.leaderFormulaName,
      leaderFormulaSectionsSnapshot: payload.leaderFormulaSectionsSnapshot,
      flyCount: payload.flyCount,
      positions: payload.positions,
      addedTippetSections: payload.addedTippetSections
    }),
    nextPayload.createdAt
  );
  return { id: result.lastInsertRowId, created: true };
};

export const listSavedRigPresets = async (userId: number): Promise<RigPreset[]> => {
  if (isWeb) {
    const rows = listWebRows<RigPreset>(WEB_RIG_PRESETS_KEY).filter((preset) => preset.userId === userId);
    const dedupedRows = dedupeSavedRigPresetsByIdentity(rows);
    if (dedupedRows.length !== rows.length) {
      updateWebRows<RigPreset>(WEB_RIG_PRESETS_KEY, (currentRows) =>
        dedupeSavedRigPresetsByIdentity(currentRows)
      );
    }
    return dedupedRows;
  }

  const db = await getDb();
  const rows = await db.getAllAsync<any>('SELECT * FROM saved_rig_presets WHERE user_id = ? ORDER BY created_at DESC', userId);
  const presets = rows.map((row) => {
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
      createdAt: row.created_at
    };
  });
  const dedupedPresets = dedupeSavedRigPresetsByIdentity(presets);
  if (dedupedPresets.length !== presets.length) {
    const keepIds = new Set(dedupedPresets.map((preset) => preset.id));
    const duplicateIds = presets.filter((preset) => !keepIds.has(preset.id)).map((preset) => preset.id);
    if (duplicateIds.length) {
      const placeholders = duplicateIds.map(() => '?').join(', ');
      await db.runAsync(`DELETE FROM saved_rig_presets WHERE id IN (${placeholders})`, ...duplicateIds);
    }
  }
  return dedupedPresets;
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
