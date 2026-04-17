export type InviteStatus = 'pending' | 'accepted' | 'revoked' | 'expired';
export type InviteGrantType = 'power_user_group';
export type SyncQueueStatus = 'pending' | 'synced' | 'failed';
export type SyncEntityType =
  | 'user'
  | 'group'
  | 'share_preference'
  | 'competition'
  | 'competition_assignment'
  | 'session'
  | 'session_segment'
  | 'catch_event'
  | 'experiment'
  | 'saved_setup';
export type SyncOperation = 'create' | 'update' | 'delete' | 'join' | 'accept' | 'revoke';

export interface Invite {
  id: number;
  inviterUserId: number;
  targetGroupId: number;
  inviteCode: string;
  targetName?: string | null;
  grantType: InviteGrantType;
  status: InviteStatus;
  createdAt: string;
  acceptedByUserId?: number | null;
  acceptedAt?: string | null;
  revokedAt?: string | null;
}

export interface SponsoredAccess {
  id: number;
  sponsorUserId: number;
  sponsoredUserId: number;
  targetGroupId: number;
  grantedAccessLevel: 'power_user';
  active: boolean;
  createdAt: string;
  revokedAt?: string | null;
}

export interface SyncQueueEntry {
  id: number;
  entityType: SyncEntityType;
  operation: SyncOperation;
  recordId?: number | null;
  payloadJson: string;
  status: SyncQueueStatus;
  createdAt: string;
  syncedAt?: string | null;
  errorMessage?: string | null;
}

export interface SyncStatusSnapshot {
  pendingCount: number;
  failedCount: number;
  syncedCount: number;
  lastSyncedAt?: string | null;
}
