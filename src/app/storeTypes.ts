import { Experiment, Insight } from '@/types/experiment';
import { SavedRiver, Session } from '@/types/session';
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
import { AuthStatus, Invite, RemoteSessionSnapshot, SponsoredAccess, SyncQueueEntry, SyncStatusSnapshot } from '@/types/remote';
import { TopFlyRecord } from '@/engine/topFlyEngine';

export type UserDataCleanupCategory = 'drafts' | 'experiments' | 'sessions' | 'flies' | 'formulas' | 'rig_presets' | 'rivers' | 'all';

export interface AppStore {
  sessions: Session[];
  allSessions: Session[];
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
  authStatus: AuthStatus;
  remoteSession: RemoteSessionSnapshot | null;
  isSyncEnabled: boolean;
  activeUserId: number | null;
  setActiveUserId: (id: number) => Promise<void>;
  signInWithMagicLink: (email: string) => Promise<void>;
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
  deleteAngler: (userId: number) => Promise<void>;
  archiveExperiment: (experimentId: number) => Promise<void>;
  deleteExperiment: (experimentId: number) => Promise<void>;
  cleanupExperimentsForCurrentUser: (filters: { from?: string; to?: string; outcome?: Experiment['outcome'] | 'all'; action: 'archive' | 'delete'; }) => Promise<number>;
  refresh: (targetUserId?: number | null) => Promise<void>;
  addSession: (payload: Omit<Session, 'id' | 'userId'>) => Promise<number>;
  updateSessionEntry: (sessionId: number, payload: Omit<Session, 'id' | 'userId'>) => Promise<void>;
  addSessionSegment: (payload: Omit<SessionSegment, 'id' | 'userId'>) => Promise<number>;
  updateSessionSegmentEntry: (segmentId: number, payload: Omit<SessionSegment, 'id' | 'userId'>) => Promise<void>;
  addCatchEvent: (payload: Omit<CatchEvent, 'id' | 'userId'>) => Promise<number>;
  addExperiment: (payload: Omit<Experiment, 'id' | 'userId'>) => Promise<number>;
  updateExperimentEntry: (experimentId: number, payload: Omit<Experiment, 'id' | 'userId'>) => Promise<void>;
  archiveInconclusiveExperiments: (range: { from?: string; to?: string }) => Promise<number>;
}
