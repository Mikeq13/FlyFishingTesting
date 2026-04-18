export type RecordIntegrityState =
  | 'valid'
  | 'legacy_unreviewed'
  | 'incomplete'
  | 'orphaned'
  | 'pending_delete'
  | 'archived'
  | 'failed_cleanup';

export interface IntegritySummary {
  state: RecordIntegrityState;
  label: string;
  analyticsEligible: boolean;
  reason?: string;
}
