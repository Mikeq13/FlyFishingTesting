import { Experiment, Insight } from '@/types/experiment';
import { SavedRiver, Session, SessionGroupShare } from '@/types/session';
import { UserProfile, AccessLevel, SubscriptionStatus } from '@/types/user';
import { FlySetup, SavedFly } from '@/types/fly';
import { CatchEvent, SessionSegment } from '@/types/activity';
import {
  Competition,
  CompetitionGroup,
  CompetitionParticipant,
  CompetitionSession,
  CompetitionSessionAssignment,
  Group,
  GroupMembership,
  SharePreference
} from '@/types/group';
import { LeaderFormula, RigPreset } from '@/types/rig';
import {
  AuthStatus,
  Invite,
  MfaFactorSummary,
  PendingTotpEnrollment,
  RemoteSessionSnapshot,
  SponsoredAccess,
  BackendDiagnosticsSnapshot,
  SyncCleanupState,
  SyncQueueEntry,
  SyncStatusSnapshot,
  CleanupSyncStatus
} from '@/types/remote';
import { TopFlyRecord } from '@/engine/topFlyEngine';
import { NotificationPermissionStatus, SharedDataStatus } from '@/types/appState';
import { IntegritySummary } from '@/types/dataIntegrity';
import { ActiveOuting } from '@/types/handsFree';

export type UserDataCleanupCategory =
  | 'drafts'
  | 'experiments'
  | 'sessions'
  | 'flies'
  | 'formulas'
  | 'rig_presets'
  | 'rivers'
  | 'groups'
  | 'incomplete'
  | 'problem'
  | 'archived'
  | 'all';

export interface AppStore {
  sessions: Session[];
  allSessions: Session[];
  sessionGroupShares: SessionGroupShare[];
  sessionSegments: SessionSegment[];
  catchEvents: CatchEvent[];
  allCatchEvents: CatchEvent[];
  experiments: Experiment[];
  allExperiments: Experiment[];
  insights: Insight[];
  anglerComparisons: Insight[];
  topFlyRecords: TopFlyRecord[];
  topFlyInsights: Insight[];
  users: UserProfile[];
  ownerUser: UserProfile | null;
  currentUser: UserProfile | null;
  currentEntitlementLabel: string;
  currentHasPremiumAccess: boolean;
  isWebDemoMode: boolean;
  canManageAccess: boolean;
  savedFlies: SavedFly[];
  savedLeaderFormulas: LeaderFormula[];
  savedRigPresets: RigPreset[];
  savedRivers: SavedRiver[];
  groups: Group[];
  groupMemberships: GroupMembership[];
  sharePreferences: SharePreference[];
  competitions: Competition[];
  competitionGroups: CompetitionGroup[];
  competitionSessions: CompetitionSession[];
  competitionParticipants: CompetitionParticipant[];
  competitionAssignments: CompetitionSessionAssignment[];
  invites: Invite[];
  sponsoredAccess: SponsoredAccess[];
  syncQueue: SyncQueueEntry[];
  syncStatus: SyncStatusSnapshot;
  cleanupSyncStatus: CleanupSyncStatus;
  backendDiagnostics: BackendDiagnosticsSnapshot;
  sharedDataStatus: SharedDataStatus;
  notificationPermissionStatus: NotificationPermissionStatus;
  authStatus: AuthStatus;
  remoteSession: RemoteSessionSnapshot | null;
  authReady: boolean;
  localBootstrapReady: boolean;
  remoteBootstrapState: 'idle' | 'resolving_local' | 'loading_remote' | 'ready' | 'degraded';
  isSyncEnabled: boolean;
  ownerIdentityLinked: boolean;
  isAuthenticatedOwner: boolean;
  mfaFactors: MfaFactorSummary[];
  pendingTotpEnrollment: PendingTotpEnrollment | null;
  mfaAssuranceLevel: 'aal1' | 'aal2' | 'unknown';
  activeOuting: ActiveOuting | null;
  autoResumePromptEnabled: boolean;
  resumeFromNotificationsEnabled: boolean;
  dictationEnabled: boolean;
  showDictationHelpInSessions: boolean;
  confirmationNotificationsEnabled: boolean;
  activeUserId: number | null;
  resetWebDemoData: () => Promise<void>;
  setActiveUserId: (id: number) => Promise<void>;
  setActiveOuting: (outing: ActiveOuting) => Promise<void>;
  clearActiveOuting: () => Promise<void>;
  setAutoResumePromptEnabled: (enabled: boolean) => Promise<void>;
  setResumeFromNotificationsEnabled: (enabled: boolean) => Promise<void>;
  setDictationEnabled: (enabled: boolean) => Promise<void>;
  setShowDictationHelpInSessions: (enabled: boolean) => Promise<void>;
  setConfirmationNotificationsEnabled: (enabled: boolean) => Promise<void>;
  signInWithMagicLink: (email: string) => Promise<void>;
  signUpWithPassword: (payload: { email: string; password: string; name: string }) => Promise<void>;
  signInWithPassword: (payload: { email: string; password: string }) => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  updateAccountEmail: (email: string) => Promise<void>;
  updateCurrentUserName: (name: string) => Promise<void>;
  linkOwnerIdentity: () => Promise<void>;
  enrollTotpMfa: (friendlyName: string) => Promise<void>;
  verifyTotpMfa: (code: string) => Promise<void>;
  removeMfaFactor: (factorId: string) => Promise<void>;
  refreshMfaState: () => Promise<void>;
  signOutRemote: () => Promise<void>;
  addUser: (name: string) => Promise<number>;
  addSavedFly: (payload: FlySetup) => Promise<number>;
  addSavedLeaderFormula: (payload: Omit<LeaderFormula, 'id' | 'userId' | 'createdAt'>) => Promise<number>;
  deleteSavedLeaderFormula: (formulaId: number) => Promise<void>;
  addSavedRigPreset: (payload: Omit<RigPreset, 'id' | 'userId' | 'createdAt'>) => Promise<number>;
  deleteSavedRigPreset: (presetId: number) => Promise<void>;
  addSavedRiver: (name: string) => Promise<number>;
  createGroup: (name: string) => Promise<Group>;
  joinGroup: (joinCode: string) => Promise<GroupMembership>;
  leaveGroup: (groupId: number) => Promise<{ membershipId: number | null; groupId: number; deletedGroup: boolean }>;
  deleteGroup: (groupId: number) => Promise<void>;
  updateSharePreference: (groupId: number, updates: Omit<SharePreference, 'id' | 'userId' | 'groupId' | 'updatedAt'>) => Promise<void>;
  createCompetition: (payload: {
    name: string;
    groupCount: number;
    sessions: Array<{ sessionNumber: number; startTime: string; endTime: string }>;
  }) => Promise<Competition>;
  joinCompetition: (joinCode: string) => Promise<CompetitionParticipant>;
  createInvite: (payload: { targetGroupId: number; targetName?: string | null }) => Promise<Invite>;
  acceptInvite: (inviteCode: string) => Promise<Invite>;
  revokeSponsoredAccess: (sponsoredAccessId: number) => Promise<void>;
  upsertCompetitionAssignment: (payload: Omit<CompetitionSessionAssignment, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<CompetitionSessionAssignment>;
  upsertCompetitionAssignmentForUser: (userId: number, payload: Omit<CompetitionSessionAssignment, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<CompetitionSessionAssignment>;
  flushSyncQueue: () => Promise<void>;
  updateUserAccess: (userId: number, next: { accessLevel: AccessLevel; subscriptionStatus: SubscriptionStatus; trialStartedAt?: string | null; trialEndsAt?: string | null; subscriptionExpiresAt?: string | null; grantedByUserId?: number | null; }) => Promise<void>;
  startTrialForUser: (userId: number) => Promise<void>;
  grantPowerUserAccess: (userId: number) => Promise<void>;
  markSubscriberAccess: (userId: number, expiresAt?: string | null) => Promise<void>;
  clearUserAccess: (userId: number) => Promise<void>;
  clearFishingDataForUser: (userId: number) => Promise<void>;
  clearUserDataCategories: (userId: number, categories: UserDataCleanupCategory[]) => Promise<void>;
  getSyncRecordState: (
    entityType: SyncQueueEntry['entityType'],
    recordId: number
  ) => SyncCleanupState;
  getSessionIntegrity: (sessionId: number) => IntegritySummary;
  getExperimentIntegrity: (experimentId: number) => IntegritySummary;
  getGroupIntegrity: (groupId: number) => IntegritySummary;
  deleteAngler: (userId: number) => Promise<void>;
  archiveExperiment: (experimentId: number) => Promise<void>;
  deleteExperiment: (experimentId: number) => Promise<void>;
  deleteSessionRecord: (sessionId: number, options?: { includeLinkedExperiments?: boolean }) => Promise<void>;
  cleanupExperimentsForCurrentUser: (filters: { from?: string; to?: string; outcome?: Experiment['outcome'] | 'all'; action: 'archive' | 'delete'; }) => Promise<number>;
  refresh: (targetUserId?: number | null) => Promise<void>;
  addSession: (payload: Omit<Session, 'id' | 'userId'>) => Promise<number>;
  updateSessionEntry: (sessionId: number, payload: Omit<Session, 'id' | 'userId'>) => Promise<void>;
  addSessionSegment: (payload: Omit<SessionSegment, 'id' | 'userId'>) => Promise<number>;
  updateSessionSegmentEntry: (segmentId: number, payload: Omit<SessionSegment, 'id' | 'userId'>) => Promise<void>;
  addCatchEvent: (payload: Omit<CatchEvent, 'id' | 'userId'>) => Promise<number>;
  addExperiment: (payload: Omit<Experiment, 'id' | 'userId'>, options?: { refresh?: boolean }) => Promise<number>;
  updateExperimentEntry: (experimentId: number, payload: Omit<Experiment, 'id' | 'userId'>, options?: { refresh?: boolean }) => Promise<void>;
  archiveInconclusiveExperiments: (range: { from?: string; to?: string }) => Promise<number>;
}
