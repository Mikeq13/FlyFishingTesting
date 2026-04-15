import { getDb, isWeb } from './schema';
import { Experiment } from '@/types/experiment';
import { deleteWebRows, insertWebRow, listWebRows, updateWebRows } from './webStore';
import { getExperimentEntries } from '@/utils/experimentEntries';

const WEB_EXPERIMENTS_KEY = 'fishing_lab.experiments';
const WEB_EXPERIMENTS_ID_KEY = 'fishing_lab.experiments.nextId';

const hydrateExperiment = (experiment: Experiment): Experiment => ({
  ...experiment,
  controlFly: { ...experiment.controlFly, hookSize: experiment.controlFly.hookSize ?? 16 },
  variantFly: { ...experiment.variantFly, hookSize: experiment.variantFly.hookSize ?? 16 },
  flyEntries: experiment.flyEntries?.length
    ? experiment.flyEntries
    : getExperimentEntries({
        ...experiment,
        flyEntries: []
      })
});

export const createExperiment = async (payload: Omit<Experiment, 'id'>): Promise<number> => {
  if (isWeb) {
    return insertWebRow<Experiment>(WEB_EXPERIMENTS_KEY, WEB_EXPERIMENTS_ID_KEY, payload);
  }

  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO experiments
      (user_id, session_id, hypothesis, fly_entries_json, control_fly_json, variant_fly_json, control_casts, control_catches, variant_casts, variant_catches, winner, outcome, confidence_score, archived_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    payload.userId,
    payload.sessionId,
    payload.hypothesis,
    JSON.stringify(payload.flyEntries),
    JSON.stringify(payload.controlFly),
    JSON.stringify(payload.variantFly),
    payload.controlCasts,
    payload.controlCatches,
    payload.variantCasts,
    payload.variantCatches,
    payload.winner,
    payload.outcome,
    payload.confidenceScore,
    payload.archivedAt ?? null
  );
  return result.lastInsertRowId;
};

export const listExperiments = async (userId: number, options: { includeArchived?: boolean } = {}): Promise<Experiment[]> => {
  const includeArchived = options.includeArchived ?? false;
  if (isWeb) {
    return listWebRows<Experiment>(WEB_EXPERIMENTS_KEY)
      .filter((e) => e.userId === userId && (includeArchived || !e.archivedAt))
      .map(hydrateExperiment);
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
  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    sessionId: r.session_id,
    hypothesis: r.hypothesis,
    flyEntries: r.fly_entries_json ? JSON.parse(r.fly_entries_json) : [],
    controlFly: JSON.parse(r.control_fly_json),
    variantFly: JSON.parse(r.variant_fly_json),
    controlCasts: r.control_casts,
    controlCatches: r.control_catches,
    variantCasts: r.variant_casts,
    variantCatches: r.variant_catches,
    winner: r.winner,
    outcome: r.outcome ?? 'inconclusive',
    confidenceScore: r.confidence_score,
    archivedAt: r.archived_at ?? undefined
  })).map(hydrateExperiment);
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
