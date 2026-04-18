import { getDb, isWeb } from './schema';
import { Experiment } from '@/types/experiment';
import { deleteWebRows, insertWebRow, listWebRows, updateWebRows } from './webStore';
import { getExperimentEntries } from '@/utils/experimentEntries';
import { normalizeLegacyExperimentStatus } from '@/services/dataIntegrityService';

const WEB_EXPERIMENTS_KEY = 'fishing_lab.experiments';
const WEB_EXPERIMENTS_ID_KEY = 'fishing_lab.experiments.nextId';

const hydrateExperiment = (experiment: Experiment): Experiment => ({
  ...experiment,
  controlFly: { ...experiment.controlFly, hookSize: experiment.controlFly.hookSize ?? 16 },
  variantFly: { ...experiment.variantFly, hookSize: experiment.variantFly.hookSize ?? 16 },
  controlFocus: experiment.controlFocus ?? 'pattern',
  technique: experiment.technique ?? undefined,
  status: experiment.status ?? normalizeLegacyExperimentStatus(experiment),
  legacyStatusMissing: experiment.status === undefined || experiment.status === null ? true : experiment.legacyStatusMissing,
  flyEntries: experiment.flyEntries?.length
    ? experiment.flyEntries
    : getExperimentEntries({
        ...experiment,
        flyEntries: []
      }),
  rigSetup: experiment.rigSetup
});

export const createExperiment = async (payload: Omit<Experiment, 'id'>): Promise<number> => {
  if (isWeb) {
    return insertWebRow<Experiment>(WEB_EXPERIMENTS_KEY, WEB_EXPERIMENTS_ID_KEY, payload);
  }

  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO experiments
      (user_id, session_id, hypothesis, control_focus, technique, rig_setup_json, fly_entries_json, control_fly_json, variant_fly_json, control_casts, control_catches, variant_casts, variant_catches, winner, outcome, status, confidence_score, archived_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    payload.userId,
    payload.sessionId,
    payload.hypothesis,
    payload.controlFocus,
    payload.technique ?? null,
    payload.rigSetup ? JSON.stringify(payload.rigSetup) : null,
    JSON.stringify(payload.flyEntries),
    JSON.stringify(payload.controlFly),
    JSON.stringify(payload.variantFly),
    payload.controlCasts,
    payload.controlCatches,
    payload.variantCasts,
    payload.variantCatches,
    payload.winner,
    payload.outcome,
    payload.status,
    payload.confidenceScore,
    payload.archivedAt ?? null
  );
  return result.lastInsertRowId;
};

export const updateExperiment = async (experimentId: number, payload: Omit<Experiment, 'id' | 'userId'>): Promise<void> => {
  if (isWeb) {
    updateWebRows<Experiment>(WEB_EXPERIMENTS_KEY, (rows) =>
      rows.map((row) =>
        row.id === experimentId
          ? {
              ...row,
              ...payload
            }
          : row
      )
    );
    return;
  }

  const db = await getDb();
  await db.runAsync(
    `UPDATE experiments
     SET session_id = ?, hypothesis = ?, control_focus = ?, technique = ?, rig_setup_json = ?, fly_entries_json = ?, control_fly_json = ?, variant_fly_json = ?, control_casts = ?, control_catches = ?, variant_casts = ?, variant_catches = ?, winner = ?, outcome = ?, status = ?, confidence_score = ?, archived_at = ?
     WHERE id = ?`,
    payload.sessionId,
    payload.hypothesis,
    payload.controlFocus,
    payload.technique ?? null,
    payload.rigSetup ? JSON.stringify(payload.rigSetup) : null,
    JSON.stringify(payload.flyEntries),
    JSON.stringify(payload.controlFly),
    JSON.stringify(payload.variantFly),
    payload.controlCasts,
    payload.controlCatches,
    payload.variantCasts,
    payload.variantCatches,
    payload.winner,
    payload.outcome,
    payload.status,
    payload.confidenceScore,
    payload.archivedAt ?? null,
    experimentId
  );
};

export const listExperiments = async (userId: number, options: { includeArchived?: boolean } = {}): Promise<Experiment[]> => {
  const includeArchived = options.includeArchived ?? false;
  if (isWeb) {
    const normalizedRows = listWebRows<Experiment>(WEB_EXPERIMENTS_KEY)
      .filter((e) => e.userId === userId && (includeArchived || !e.archivedAt))
      .map(hydrateExperiment);

    const rowsNeedingRepair = normalizedRows.filter((experiment) => experiment.legacyStatusMissing);
    if (rowsNeedingRepair.length) {
      updateWebRows<Experiment>(WEB_EXPERIMENTS_KEY, (rows) =>
        rows.map((row) => {
          const repaired = rowsNeedingRepair.find((experiment) => experiment.id === row.id);
          if (!repaired) return row;
          return {
            ...row,
            status: repaired.status
          };
        })
      );
    }

    return normalizedRows;
  }

  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM experiments
     WHERE user_id = ?
       AND (? = 1 OR archived_at IS NULL)
     ORDER BY id DESC`,
    userId,
    includeArchived ? 1 : 0
  );
  const experiments = rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    sessionId: r.session_id,
    hypothesis: r.hypothesis,
    controlFocus: r.control_focus ?? 'pattern',
    technique: r.technique ?? undefined,
    rigSetup: r.rig_setup_json ? JSON.parse(r.rig_setup_json) : undefined,
    flyEntries: r.fly_entries_json ? JSON.parse(r.fly_entries_json) : [],
    controlFly: JSON.parse(r.control_fly_json),
    variantFly: JSON.parse(r.variant_fly_json),
    controlCasts: r.control_casts,
    controlCatches: r.control_catches,
    variantCasts: r.variant_casts,
    variantCatches: r.variant_catches,
    winner: r.winner,
    outcome: r.outcome ?? 'inconclusive',
    status: r.status ?? undefined,
    confidenceScore: r.confidence_score,
    archivedAt: r.archived_at ?? undefined,
    legacyStatusMissing: r.status == null
  })).map(hydrateExperiment);

  const rowsNeedingRepair = experiments.filter((experiment) => experiment.legacyStatusMissing);
  if (rowsNeedingRepair.length) {
    const repairDb = await getDb();
    await Promise.all(
      rowsNeedingRepair.map((experiment) =>
        repairDb.runAsync('UPDATE experiments SET status = ? WHERE id = ?', experiment.status, experiment.id)
      )
    );
  }

  return experiments;
};

export const archiveExperiments = async (experimentIds: number[]): Promise<void> => {
  if (!experimentIds.length) return;

  const archivedAt = new Date().toISOString();

  if (isWeb) {
    updateWebRows<Experiment>(WEB_EXPERIMENTS_KEY, (rows) =>
      rows.map((row) => (experimentIds.includes(row.id) ? { ...row, archivedAt } : row))
    );
    return;
  }

  const db = await getDb();
  const placeholders = experimentIds.map(() => '?').join(', ');
  await db.runAsync(`UPDATE experiments SET archived_at = ? WHERE id IN (${placeholders})`, archivedAt, ...experimentIds);
};

export const deleteExperiments = async (experimentIds: number[]): Promise<void> => {
  if (!experimentIds.length) return;

  if (isWeb) {
    deleteWebRows<Experiment>(WEB_EXPERIMENTS_KEY, (row) => experimentIds.includes(row.id));
    return;
  }

  const db = await getDb();
  const placeholders = experimentIds.map(() => '?').join(', ');
  await db.runAsync(`DELETE FROM experiments WHERE id IN (${placeholders})`, ...experimentIds);
};

export const deleteExperimentsForUser = async (userId: number): Promise<void> => {
  if (isWeb) {
    deleteWebRows<Experiment>(WEB_EXPERIMENTS_KEY, (row) => row.userId === userId);
    return;
  }

  const db = await getDb();
  await db.runAsync('DELETE FROM experiments WHERE user_id = ?', userId);
};

export const deleteDraftExperimentsForUser = async (userId: number): Promise<void> => {
  if (isWeb) {
    deleteWebRows<Experiment>(WEB_EXPERIMENTS_KEY, (row) => row.userId === userId && row.status === 'draft');
    return;
  }

  const db = await getDb();
  await db.runAsync(`DELETE FROM experiments WHERE user_id = ? AND status = 'draft'`, userId);
};
