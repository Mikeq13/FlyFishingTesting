import { getDb } from './schema';
import { Experiment } from '@/types/experiment';

export const createExperiment = async (payload: Omit<Experiment, 'id'>): Promise<number> => {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO experiments
      (session_id, hypothesis, control_fly_json, variant_fly_json, control_casts, control_catches, variant_casts, variant_catches, winner, confidence_score)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

export const listExperiments = async (): Promise<Experiment[]> => {
  const db = await getDb();
  const rows = await db.getAllAsync<any>('SELECT * FROM experiments ORDER BY id DESC');
  return rows.map((r) => ({
    id: r.id,
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
