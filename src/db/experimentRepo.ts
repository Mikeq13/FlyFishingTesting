import { getDb, isWeb } from './schema';
import { Experiment } from '@/types/experiment';
import { insertWebRow, listWebRows } from './webStore';

const WEB_EXPERIMENTS_KEY = 'fishing_lab.experiments';
const WEB_EXPERIMENTS_ID_KEY = 'fishing_lab.experiments.nextId';

export const createExperiment = async (payload: Omit<Experiment, 'id'>): Promise<number> => {
  if (isWeb) {
    return insertWebRow<Experiment>(WEB_EXPERIMENTS_KEY, WEB_EXPERIMENTS_ID_KEY, payload);
  }

  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO experiments
      (user_id, session_id, hypothesis, control_fly_json, variant_fly_json, control_casts, control_catches, variant_casts, variant_catches, winner, confidence_score)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    payload.userId,
    payload.sessionId,
    payload.hypothesis,
    JSON.stringify(payload.controlFly),
    JSON.stringify(payload.variantFly),
    payload.controlCasts,
    payload.controlCatches,
    payload.variantCasts,
    payload.variantCatches,
    payload.winner,
    payload.confidenceScore
  );
  return result.lastInsertRowId;
};

export const listExperiments = async (userId: number): Promise<Experiment[]> => {
  if (isWeb) return listWebRows<Experiment>(WEB_EXPERIMENTS_KEY).filter((e) => e.userId === userId);

  const db = await getDb();
  const rows = await db.getAllAsync<any>('SELECT * FROM experiments WHERE user_id = ? ORDER BY id DESC', userId);
  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    sessionId: r.session_id,
    hypothesis: r.hypothesis,
    controlFly: JSON.parse(r.control_fly_json),
    variantFly: JSON.parse(r.variant_fly_json),
    controlCasts: r.control_casts,
    controlCatches: r.control_catches,
    variantCasts: r.variant_casts,
    variantCatches: r.variant_catches,
    winner: r.winner,
    confidenceScore: r.confidence_score
  }));
};
