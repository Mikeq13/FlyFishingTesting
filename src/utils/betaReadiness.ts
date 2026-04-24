import { BetaReadinessCheck, BetaReadinessCheckStatus, BetaReadinessSnapshot } from '@/types/betaReadiness';

export const BETA_READINESS_SETTING_KEY = 'beta_readiness.native_android_v1';

export const BETA_READINESS_CHECKS: Array<Omit<BetaReadinessCheck, 'status'>> = [
  {
    key: 'cold_start',
    label: 'Cold Open',
    description: 'Home opens as Today\'s Journal without forcing normal testers through owner tools.'
  },
  {
    key: 'start_practice',
    label: 'Start Practice',
    description: 'Practice starts directly from Home and lands in the active field flow without admin context.'
  },
  {
    key: 'resume_outing',
    label: 'Resume Outing',
    description: 'A live outing survives app leave/relaunch and resumes to the correct route.'
  },
  {
    key: 'log_fish',
    label: 'Log Fish',
    description: 'Fish logging gives saved/action feedback and remains present after refresh or relaunch.'
  },
  {
    key: 'add_note',
    label: 'Add Note',
    description: 'Notes save into the active outing context and remain visible after refresh or relaunch.'
  },
  {
    key: 'change_water',
    label: 'Change Water',
    description: 'Water changes preserve the expected active segment context and give clear saved feedback.'
  },
  {
    key: 'change_technique',
    label: 'Change Technique',
    description: 'Technique changes update the active context and survive refresh or relaunch.'
  },
  {
    key: 'hands_free_disabled',
    label: 'Hands-Free Disabled State',
    description: 'Voice/deep-link commands fail with the same in-app disabled message when dictation is off.'
  },
  {
    key: 'hands_free_no_active',
    label: 'Hands-Free No-Active-Outing',
    description: 'Commands explain that no outing is available instead of silently doing nothing.'
  },
  {
    key: 'relaunch_persistence',
    label: 'Relaunch Persistence',
    description: 'Recently saved field actions still match after app refresh, relaunch, or cold open.'
  },
  {
    key: 'sync_trust',
    label: 'Sync Messaging',
    description: 'Saved locally, syncing to shared backend, unavailable, and migration/policy states are distinguishable.'
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
