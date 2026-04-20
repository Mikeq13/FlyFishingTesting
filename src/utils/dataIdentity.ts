import { SavedFly } from '@/types/fly';
import { Experiment, ExperimentFlyEntry } from '@/types/experiment';
import { LeaderFormula, RigPreset, RigSetup } from '@/types/rig';
import { SavedRiver, SessionGroupShare } from '@/types/session';

export const normalizeIdentityName = (value: string) => value.trim().toLowerCase();

const dedupeByKey = <T>(items: T[], getKey: (item: T) => string | null) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = getKey(item);
    if (!key) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const getSavedRiverIdentityKey = (river: Pick<SavedRiver, 'userId' | 'name'>) =>
  `${river.userId}:${normalizeIdentityName(river.name)}`;

export const getSavedFlyIdentityKey = (fly: Pick<SavedFly, 'userId' | 'name'>) =>
  `${fly.userId}:${normalizeIdentityName(fly.name)}`;

export const getLeaderFormulaIdentityKey = (formula: Pick<LeaderFormula, 'userId' | 'name'>) =>
  `${formula.userId}:${normalizeIdentityName(formula.name)}`;

export const getRigPresetIdentityKey = (preset: Pick<RigPreset, 'userId' | 'name'>) =>
  `${preset.userId}:${normalizeIdentityName(preset.name)}`;

export const getSessionGroupShareIdentityKey = (share: Pick<SessionGroupShare, 'userId' | 'sessionId' | 'groupId'>) =>
  `${share.userId}:${share.sessionId}:${share.groupId}`;

export const getDraftExperimentIdentityKey = (
  experiment: Pick<Experiment, 'userId' | 'sessionId' | 'status' | 'archivedAt'>
) => (experiment.status === 'draft' && !experiment.archivedAt ? `${experiment.userId}:${experiment.sessionId}:draft` : null);

export const dedupeSavedRiversByIdentity = (rivers: SavedRiver[]) =>
  dedupeByKey(rivers, getSavedRiverIdentityKey);

export const dedupeSavedFliesByIdentity = (flies: SavedFly[]) =>
  dedupeByKey(flies, getSavedFlyIdentityKey);

export const dedupeSavedLeaderFormulasByIdentity = (formulas: LeaderFormula[]) =>
  dedupeByKey(formulas, getLeaderFormulaIdentityKey);

export const dedupeSavedRigPresetsByIdentity = (presets: RigPreset[]) =>
  dedupeByKey(presets, getRigPresetIdentityKey);

export const dedupeSessionGroupSharesByIdentity = (shares: SessionGroupShare[]) =>
  dedupeByKey(shares, getSessionGroupShareIdentityKey);

export const dedupeDraftExperimentsByIdentity = (experiments: Experiment[]) =>
  dedupeByKey(experiments, getDraftExperimentIdentityKey);

const getFlyEntrySignature = (entry: ExperimentFlyEntry) =>
  [
    entry.label,
    entry.role,
    entry.fly.name.trim().toLowerCase(),
    entry.fly.hookSize,
    entry.fly.beadColor,
    entry.fly.beadSizeMm,
    entry.fly.bodyType,
    entry.fly.bugFamily,
    entry.fly.bugStage,
    entry.fly.tail,
    entry.fly.collar
  ].join('|');

export const getExperimentRigIdentitySignature = (rigSetup: RigSetup, visibleEntries: ExperimentFlyEntry[]) =>
  JSON.stringify({
    flyCount: visibleEntries.length,
    assignments: rigSetup.assignments.slice(0, visibleEntries.length).map((assignment) => ({
      position: assignment.position,
      fly: assignment.fly
    })),
    entries: visibleEntries.map(getFlyEntrySignature)
  });
