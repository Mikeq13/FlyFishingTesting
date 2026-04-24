export type BetaReadinessCheckStatus = 'pass' | 'follow_up' | 'untested';

export interface BetaReadinessCheck {
  key: string;
  label: string;
  description: string;
  status: BetaReadinessCheckStatus;
}

export interface BetaReadinessSnapshot {
  buildLabel: string;
  testedAt: string | null;
  tester: string;
  checks: Record<string, BetaReadinessCheckStatus>;
}
