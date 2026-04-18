import { Insight, Experiment } from '@/types/experiment';
import { Session } from '@/types/session';
import { UserProfile } from '@/types/user';
import { catchRate, percentDiff } from '@/utils/calculations';
import { getExperimentEntries } from '@/utils/experimentEntries';

const normalize = (value: string): string => value.trim().toLowerCase();
const MIN_ANGLER_COMPARISON_CASTS = 20;
const MIN_ABSOLUTE_RATE_GAP = 0.08;

const buildExperimentSignature = (experiment: Experiment, session?: Session): string => {
  const flySignature = getExperimentEntries(experiment)
    .map((entry) => `${normalize(entry.fly.name || entry.label)}|${entry.fly.intent}|${entry.fly.hookSize}|${entry.fly.beadSizeMm}|${entry.fly.bodyType}|${entry.fly.bugFamily}|${entry.fly.bugStage}|${entry.fly.tail}|${entry.fly.collar}`)
    .sort()
    .join(' || ');

  return [
    normalize(experiment.hypothesis || 'no hypothesis'),
    session?.waterType ?? 'unknown-water',
    flySignature
  ].join(' :: ');
};

export const generateAnglerComparisons = (users: UserProfile[], sessions: Session[], experiments: Experiment[]): Insight[] => {
  const sessionMap = new Map(sessions.map((session) => [session.id, session]));
  const userMap = new Map(users.map((user) => [user.id, user.name]));
  const grouped = new Map<string, Experiment[]>();

  experiments.forEach((experiment) => {
    const signature = buildExperimentSignature(experiment, sessionMap.get(experiment.sessionId));
    const existing = grouped.get(signature) ?? [];
    existing.push(experiment);
    grouped.set(signature, existing);
  });

  const insights: Insight[] = [];

  grouped.forEach((group, signature) => {
    const anglers = new Set(group.map((experiment) => experiment.userId));
    if (anglers.size < 2) return;

    const byAngler = new Map<number, { casts: number; catches: number; experiments: number }>();

    group.forEach((experiment) => {
      const totals = getExperimentEntries(experiment).reduce(
        (sum, entry) => ({
          casts: sum.casts + entry.casts,
          catches: sum.catches + entry.catches
        }),
        { casts: 0, catches: 0 }
      );

      const current = byAngler.get(experiment.userId) ?? { casts: 0, catches: 0, experiments: 0 };
      current.casts += totals.casts;
      current.catches += totals.catches;
      current.experiments += 1;
      byAngler.set(experiment.userId, current);
    });

    const ranked = [...byAngler.entries()]
      .map(([userId, totals]) => ({
        userId,
        name: userMap.get(userId) ?? `Angler ${userId}`,
        casts: totals.casts,
        catches: totals.catches,
        experiments: totals.experiments,
        rate: catchRate(totals.catches, totals.casts)
      }))
      .sort((left, right) => right.rate - left.rate);

    const leader = ranked[0];
    const runnerUp = ranked[1];
    if (!leader || !runnerUp) return;

    const diff = percentDiff(runnerUp.rate, leader.rate);
    const absoluteGap = leader.rate - runnerUp.rate;
    if (leader.casts < MIN_ANGLER_COMPARISON_CASTS || runnerUp.casts < MIN_ANGLER_COMPARISON_CASTS || absoluteGap < MIN_ABSOLUTE_RATE_GAP) {
      return;
    }

    const hypothesis = group[0]?.hypothesis || 'matching experiment';
    const relativeLift = runnerUp.rate >= 0.05 ? Math.min(diff, 3) : null;
    insights.push({
      type: 'pattern',
      message:
        relativeLift !== null
          ? `Across anglers, '${hypothesis}' is strongest for ${leader.name} over ${runnerUp.name} by ${(relativeLift * 100).toFixed(0)}% in comparable tests.`
          : `Across anglers, '${hypothesis}' shows a stronger clean catch-rate signal for ${leader.name} than ${runnerUp.name} by ${(absoluteGap * 100).toFixed(1)} percentage points.`,
      confidence: leader.casts + runnerUp.casts >= 80 ? 'high' : 'medium',
      supportingData: { signature, leader, runnerUp, anglers: ranked, absoluteGap, relativeLift }
    });
  });

  return insights.slice(0, 5);
};
