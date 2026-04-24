import { BetaReadinessCheck, BetaReadinessCheckStatus, BetaReadinessSnapshot } from '@/types/betaReadiness';

export const BETA_READINESS_SETTING_KEY = 'beta_readiness.native_android_v1';

export const BETA_READINESS_CHECKS: Array<Omit<BetaReadinessCheck, 'status'>> = [
  {
    key: 'cold_start',
    label: 'Cold Open',
    description: 'Home opens as a field cockpit without forcing normal testers through owner tools.'
  },
  {
    key: 'active_recovery',
    label: 'Active Outing Recovery',
    description: 'A live outing survives relaunch and resumes to the correct flow.'
  },
  {
    key: 'hands_free',
    label: 'Hands-Free Commands',
    description: 'Resume, log fish, add note, change water, and change technique report clear results.'
  },
  {
    key: 'sync_trust',
    label: 'Sync Trust',
    description: 'Saved locally, syncing, unavailable, and structural backend states are distinguishable.'
  },
  {
    key: 'duplicate_proof',
    label: 'Duplicate-Proof Insights',
    description: 'History, details, and insights do not inflate rivers, experiments, or catch totals after refresh.'
  },
  {
    key: 'backend_diagnostics',
    label: 'Backend Diagnostics',
    description: 'Schema, bootstrap, env, and failed sync diagnostics are understood before tester builds.'
  }
];

export const createDefaultBetaReadinessSnapshot = (): BetaReadinessSnapshot => ({
  buildLabel: 'Android debug APK',
  testedAt: null,
  tester: '',
  checks: Object.fromEntries(BETA_READINESS_CHECKS.map((check) => [check.key, 'untested'])) as Record<
    string,
    BetaReadinessCheckStatus
  >
});

export const parseBetaReadinessSnapshot = (raw: string | null): BetaReadinessSnapshot => {
  if (!raw) return createDefaultBetaReadinessSnapshot();
  try {
    const parsed = JSON.parse(raw) as Partial<BetaReadinessSnapshot>;
    const fallback = createDefaultBetaReadinessSnapshot();
    return {
      buildLabel: typeof parsed.buildLabel === 'string' && parsed.buildLabel.trim() ? parsed.buildLabel : fallback.buildLabel,
      testedAt: typeof parsed.testedAt === 'string' ? parsed.testedAt : null,
      tester: typeof parsed.tester === 'string' ? parsed.tester : '',
      checks: {
        ...fallback.checks,
        ...(parsed.checks ?? {})
      }
    };
  } catch {
    return createDefaultBetaReadinessSnapshot();
  }
};

export const getBetaReadinessScore = (snapshot: BetaReadinessSnapshot) => {
  const passed = BETA_READINESS_CHECKS.filter((check) => snapshot.checks[check.key] === 'pass').length;
  return {
    passed,
    total: BETA_READINESS_CHECKS.length,
    followUps: BETA_READINESS_CHECKS.filter((check) => snapshot.checks[check.key] === 'follow_up').length
  };
};
