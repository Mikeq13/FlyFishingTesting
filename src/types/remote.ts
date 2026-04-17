export type InviteStatus = 'pending' | 'accepted' | 'revoked' | 'expired';
export type InviteGrantType = 'power_user_group';
export type SyncQueueStatus = 'pending' | 'synced' | 'failed';
export type AuthStatus =
  | 'unauthenticated'
  | 'authenticating'
  | 'pending_verification'
  | 'password_reset_required'
  | 'mfa_required'
  | 'mfa_enrolled'
  | 'authenticated';
export type SyncEntityType =
  | 'profile'
  | 'group'
  | 'group_membership'
  | 'share_preference'
  | 'invite'
  | 'sponsored_access'
  | 'competition'
  | 'competition_group'
  | 'competition_session'
  | 'competition_participant'
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

export interface SyncMetadataEntry {
  id: number;
  entityType: SyncEntityType;
  localRecordId: number;
  remoteRecordId?: string | null;
  lastSyncedAt?: string | null;
  pendingImport: boolean;
}

export interface RemoteSessionSnapshot {
  authUserId: string;
  email?: string | null;
  accessToken: string;
  emailVerifiedAt?: string | null;
}

export interface MfaFactorSummary {
  id: string;
  friendlyName?: string | null;
  factorType: string;
  status: string;
}

export interface PendingTotpEnrollment {
  id: string;
  friendlyName?: string | null;
  qrCode?: string | null;
  secret?: string | null;
  uri?: string | null;
}

export interface SyncStatusSnapshot {
  state: 'idle' | 'syncing' | 'error';
  pendingCount: number;
  failedCount: number;
  syncedCount: number;
  lastSyncedAt?: string | null;
  lastError?: string | null;
}

export interface RemoteEntityMaps {
  userIdByAuthId: Map<string, number>;
  groupIdByRemoteId: Map<string, number>;
  competitionIdByRemoteId: Map<string, number>;
  competitionGroupIdByRemoteId: Map<string, number>;
  competitionSessionIdByRemoteId: Map<string, number>;
  competitionAssignmentIdByRemoteId: Map<string, number>;
}

export interface RemoteAccessSnapshot {
  users: import('@/types/user').UserProfile[];
  groups: import('@/types/group').Group[];
  groupMemberships: import('@/types/group').GroupMembership[];
  sharePreferences: import('@/types/group').SharePreference[];
  invites: Invite[];
  sponsoredAccess: SponsoredAccess[];
  competitions: import('@/types/group').Competition[];
  competitionGroups: import('@/types/group').CompetitionGroup[];
  competitionSessions: import('@/types/group').CompetitionSession[];
  competitionParticipants: import('@/types/group').CompetitionParticipant[];
  competitionAssignments: import('@/types/group').CompetitionSessionAssignment[];
  entityMaps: RemoteEntityMaps;
}

export interface RemoteSharedDataSnapshot {
  ownedSessions: import('@/types/session').Session[];
  accessibleSessions: import('@/types/session').Session[];
  ownedSessionSegments: import('@/types/activity').SessionSegment[];
  accessibleSessionSegments: import('@/types/activity').SessionSegment[];
  ownedCatchEvents: import('@/types/activity').CatchEvent[];
  accessibleCatchEvents: import('@/types/activity').CatchEvent[];
  ownedExperiments: import('@/types/experiment').Experiment[];
  accessibleExperiments: import('@/types/experiment').Experiment[];
  savedFlies: import('@/types/fly').SavedFly[];
  savedLeaderFormulas: import('@/types/rig').LeaderFormula[];
  savedRigPresets: import('@/types/rig').RigPreset[];
  savedRivers: import('@/types/session').SavedRiver[];
}
