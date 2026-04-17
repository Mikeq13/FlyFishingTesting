import { createTrialWindow } from '@/engine/entitlementEngine';
import { isWithinDateRange } from '@/utils/dateRange';
import { archiveExperiments, createExperiment, deleteExperiments, updateExperiment } from '@/db/experimentRepo';
import { createUser, listUsers, updateUser as updateLocalUser } from '@/db/userRepo';
import { createSavedFly } from '@/db/savedFlyRepo';
import { createSavedLeaderFormula, deleteSavedLeaderFormula } from '@/db/savedLeaderFormulaRepo';
import { createSavedRigPreset, deleteSavedRigPreset } from '@/db/savedRigPresetRepo';
import { createSavedRiver } from '@/db/savedRiverRepo';
import { createSession, updateSession } from '@/db/sessionRepo';
import { createSessionSegment, updateSessionSegment } from '@/db/sessionSegmentRepo';
import { createCatchEvent } from '@/db/catchEventRepo';
import { setActiveUserId as saveActiveUserId } from '@/db/settingsRepo';
import {
  acceptLocalInvite,
  clearLocalFishingDataForUser,
  clearLocalUserDataCategories,
  createLocalCompetitionWithParticipant,
  createLocalGroupWithDefaults,
  createLocalInvite,
  deleteLocalAnglerData,
  joinLocalCompetitionByCode,
  joinLocalGroupByCode,
  loadLocalAppData,
  revokeLocalSponsoredAccess,
  saveLocalCompetitionAssignment,
  updateLocalSharePreference
} from '@/services/localAppDataService';
import { hasSupabaseConfig } from '@/services/supabaseClient';
import {
  enrollTotpFactor,
  getMfaAssuranceLevel,
  listMfaFactors,
  sendPasswordResetEmail as requestPasswordResetEmail,
  signInWithMagicLink as requestMagicLink,
  signInWithPassword as signInWithPasswordRemote,
  signOutRemote as endRemoteSession,
  signUpWithPassword as signUpWithPasswordRemote,
  unenrollMfaFactor,
  updateAccountEmail as updateAccountEmailRemote,
  updateAccountMetadata,
  updatePassword as updateRemotePassword,
  verifyTotpFactor
} from '@/services/authService';
import { AppStore } from '@/app/storeTypes';

type SyncEntityType = AppStore['syncQueue'][number]['entityType'];
type SyncOperation = AppStore['syncQueue'][number]['operation'];

export const createStoreActions = ({
  activeUserId,
  currentUser,
  users,
  groups,
  groupMemberships,
  sharePreferences,
  competitions,
  competitionParticipants,
  invites,
  experiments,
  sessionMap,
  remoteSession,
  ownerIdentityLinked,
  isAuthenticatedOwner,
  pendingTotpEnrollment,
  setActiveUserId,
  setRemoteSession,
  setAuthStatus,
  setPendingTotpEnrollment,
  setMfaFactors,
  setMfaAssuranceLevel,
  selectActiveUser,
  refresh,
  trackSyncChange,
  flushSyncQueueInternal,
  updateUserAccess
}: {
  activeUserId: number | null;
  currentUser: AppStore['currentUser'];
  users: AppStore['users'];
  groups: AppStore['groups'];
  groupMemberships: AppStore['groupMemberships'];
  sharePreferences: AppStore['sharePreferences'];
  competitions: AppStore['competitions'];
  competitionParticipants: AppStore['competitionParticipants'];
  invites: AppStore['invites'];
  experiments: AppStore['experiments'];
  sessionMap: Map<number, AppStore['sessions'][number]>;
  remoteSession: AppStore['remoteSession'];
  ownerIdentityLinked: boolean;
  isAuthenticatedOwner: boolean;
  pendingTotpEnrollment: AppStore['pendingTotpEnrollment'];
  setActiveUserId: (value: number | null) => void;
  setRemoteSession: (value: AppStore['remoteSession']) => void;
  setAuthStatus: (value: AppStore['authStatus']) => void;
  setPendingTotpEnrollment: (value: AppStore['pendingTotpEnrollment']) => void;
  setMfaFactors: (value: AppStore['mfaFactors']) => void;
  setMfaAssuranceLevel: (value: AppStore['mfaAssuranceLevel']) => void;
  selectActiveUser: (id: number) => Promise<void>;
  refresh: AppStore['refresh'];
  trackSyncChange: (entityType: SyncEntityType, operation: SyncOperation, recordId: number | null, payload: unknown) => Promise<void>;
  flushSyncQueueInternal: () => Promise<void>;
  updateUserAccess: AppStore['updateUserAccess'];
}): Pick<
  AppStore,
  | 'setActiveUserId'
  | 'signInWithMagicLink'
  | 'signUpWithPassword'
  | 'signInWithPassword'
  | 'sendPasswordResetEmail'
  | 'updatePassword'
  | 'updateAccountEmail'
  | 'updateCurrentUserName'
  | 'linkOwnerIdentity'
  | 'enrollTotpMfa'
  | 'verifyTotpMfa'
  | 'removeMfaFactor'
  | 'refreshMfaState'
  | 'signOutRemote'
  | 'addUser'
  | 'addSavedFly'
  | 'addSavedLeaderFormula'
  | 'deleteSavedLeaderFormula'
  | 'addSavedRigPreset'
  | 'deleteSavedRigPreset'
  | 'addSavedRiver'
  | 'createGroup'
  | 'joinGroup'
  | 'updateSharePreference'
  | 'createCompetition'
  | 'joinCompetition'
  | 'createInvite'
  | 'acceptInvite'
  | 'revokeSponsoredAccess'
  | 'upsertCompetitionAssignment'
  | 'upsertCompetitionAssignmentForUser'
  | 'flushSyncQueue'
  | 'updateUserAccess'
  | 'startTrialForUser'
  | 'grantPowerUserAccess'
  | 'markSubscriberAccess'
  | 'clearUserAccess'
  | 'clearFishingDataForUser'
  | 'clearUserDataCategories'
  | 'deleteAngler'
  | 'archiveExperiment'
  | 'deleteExperiment'
  | 'cleanupExperimentsForCurrentUser'
  | 'refresh'
  | 'addSession'
  | 'updateSessionEntry'
  | 'addSessionSegment'
  | 'updateSessionSegmentEntry'
  | 'addCatchEvent'
  | 'addExperiment'
  | 'updateExperimentEntry'
  | 'archiveInconclusiveExperiments'
> => {
  const assertActiveUser = () => {
    if (!currentUser) {
      throw new Error('No active angler profile is selected.');
    }
  };

  const assertRemoteAuth = () => {
    if (!remoteSession || !currentUser) {
      throw new Error('Sign in to use cloud account features on this device.');
    }
  };

  const assertOwnerAccess = () => {
    if (!currentUser || currentUser.role !== 'owner' || (remoteSession && !isAuthenticatedOwner)) {
      throw new Error('Only the owner can manage tester access.');
    }
  };

  const refreshMfaStateInternal = async () => {
    if (!remoteSession) {
      setMfaFactors([]);
      setPendingTotpEnrollment(null);
      setMfaAssuranceLevel('unknown');
      return;
    }

    const [factors, assurance] = await Promise.all([listMfaFactors(), getMfaAssuranceLevel()]);
    setMfaFactors(
      factors.totp.map((factor) => ({
        id: factor.id,
        friendlyName: factor.friendly_name ?? null,
        factorType: 'totp',
        status: factor.status
      }))
    );
    setMfaAssuranceLevel(assurance.currentLevel ?? 'unknown');
  };

  return ({
  setActiveUserId: selectActiveUser,
  signInWithMagicLink: async (email) => {
    if (!hasSupabaseConfig) {
      throw new Error('Supabase is not configured yet. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY first.');
    }
    setAuthStatus('authenticating');
    try {
      await requestMagicLink(email);
      setAuthStatus('pending_verification');
    } catch (error) {
      setAuthStatus(remoteSession ? 'authenticated' : 'unauthenticated');
      throw error;
    }
  },
  signUpWithPassword: async ({ email, password, name }) => {
    if (!hasSupabaseConfig) {
      throw new Error('Supabase is not configured yet. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY first.');
    }
    setAuthStatus('authenticating');
    try {
      const result = await signUpWithPasswordRemote({ email, password, name });
      if (result.session) {
        setRemoteSession(result.session);
        setAuthStatus('authenticated');
        await refreshMfaStateInternal();
      } else {
        setAuthStatus('pending_verification');
      }
    } catch (error) {
      setAuthStatus(remoteSession ? 'authenticated' : 'unauthenticated');
      throw error;
    }
  },
  signInWithPassword: async ({ email, password }) => {
    if (!hasSupabaseConfig) {
      throw new Error('Supabase is not configured yet. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY first.');
    }
    setAuthStatus('authenticating');
    try {
      const snapshot = await signInWithPasswordRemote({ email, password });
      setRemoteSession(snapshot);
      setAuthStatus('authenticated');
      await refreshMfaStateInternal();
    } catch (error) {
      setAuthStatus(remoteSession ? 'authenticated' : 'unauthenticated');
      throw error;
    }
  },
  sendPasswordResetEmail: async (email) => {
    await requestPasswordResetEmail(email);
    setAuthStatus('pending_verification');
  },
  updatePassword: async (password) => {
    assertRemoteAuth();
    await updateRemotePassword(password);
    setAuthStatus('authenticated');
  },
  updateAccountEmail: async (email) => {
    assertActiveUser();
    if (!currentUser) {
      throw new Error('No active angler profile is selected.');
    }
    const activeUser = currentUser;
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      throw new Error('Email is required.');
    }
    if (remoteSession) {
      await updateAccountEmailRemote(normalizedEmail);
      await updateLocalUser(activeUser.id, { email: normalizedEmail });
      await trackSyncChange('profile', 'update', activeUser.id, { email: normalizedEmail });
      await refresh(activeUser.id);
      setAuthStatus('pending_verification');
      return;
    }
    await updateLocalUser(activeUser.id, { email: normalizedEmail });
    await refresh(activeUser.id);
  },
  updateCurrentUserName: async (name) => {
    assertActiveUser();
    if (!currentUser) {
      throw new Error('No active angler profile is selected.');
    }
    const activeUser = currentUser;
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error('Name is required.');
    }
    if (remoteSession) {
      await updateAccountMetadata(trimmedName);
      await trackSyncChange('profile', 'update', activeUser.id, { name: trimmedName });
    }
    await updateLocalUser(activeUser.id, { name: trimmedName });
    await refresh(activeUser.id);
  },
  linkOwnerIdentity: async () => {
    assertRemoteAuth();
    if (!currentUser || currentUser.role !== 'owner') {
      throw new Error('Only the owner profile can link owner identity.');
    }
    await updateLocalUser(currentUser.id, {
      ownerLinkedEmail: remoteSession?.email ?? null,
      ownerLinkedAuthId: remoteSession?.authUserId ?? null
    });
    await trackSyncChange('profile', 'update', currentUser.id, {
      ownerLinkedEmail: remoteSession?.email ?? null,
      ownerLinkedAuthId: remoteSession?.authUserId ?? null
    });
    await refresh(currentUser.id);
  },
  enrollTotpMfa: async (friendlyName) => {
    assertRemoteAuth();
    const factor = await enrollTotpFactor(friendlyName);
    setPendingTotpEnrollment({
      id: factor.id,
      friendlyName: factor.friendly_name ?? null,
      qrCode: factor.totp?.qr_code ?? null,
      secret: factor.totp?.secret ?? null,
      uri: factor.totp?.uri ?? null
    });
  },
  verifyTotpMfa: async (code) => {
    assertRemoteAuth();
    if (!pendingTotpEnrollment) {
      throw new Error('No MFA enrollment is waiting for verification.');
    }
    await verifyTotpFactor({
      factorId: pendingTotpEnrollment.id,
      code
    });
    setPendingTotpEnrollment(null);
    setAuthStatus('mfa_enrolled');
    await refreshMfaStateInternal();
  },
  removeMfaFactor: async (factorId) => {
    assertRemoteAuth();
    await unenrollMfaFactor(factorId);
    await refreshMfaStateInternal();
  },
  refreshMfaState: async () => {
    await refreshMfaStateInternal();
  },
  signOutRemote: async () => {
    await endRemoteSession();
    setRemoteSession(null);
    setPendingTotpEnrollment(null);
    setMfaFactors([]);
    setMfaAssuranceLevel('unknown');
    setAuthStatus('unauthenticated');
  },
  addUser: async (name) => {
    assertActiveUser();
    const id = await createUser({
      name,
      role: 'angler',
      email: null,
      remoteAuthId: null
    });
    await trackSyncChange('profile', 'create', id, { name });
    await saveActiveUserId(id);
    setActiveUserId(id);
    await refresh(id);
    return id;
  },
  addSavedFly: async (payload) => {
    assertActiveUser();
    if (!activeUserId) throw new Error('No active user selected.');
    const id = await createSavedFly({ ...payload, userId: activeUserId });
    await trackSyncChange('saved_setup', 'create', id, payload);
    await refresh(activeUserId);
    return id;
  },
  addSavedLeaderFormula: async (payload) => {
    assertActiveUser();
    if (!activeUserId) throw new Error('No active user selected.');
    const id = await createSavedLeaderFormula({ ...payload, userId: activeUserId });
    await trackSyncChange('saved_setup', 'create', id, payload);
    await refresh(activeUserId);
    return id;
  },
  deleteSavedLeaderFormula: async (formulaId) => {
    await deleteSavedLeaderFormula(formulaId);
    await trackSyncChange('saved_setup', 'delete', formulaId, { formulaId });
    await refresh(activeUserId);
  },
  addSavedRigPreset: async (payload) => {
    assertActiveUser();
    if (!activeUserId) throw new Error('No active user selected.');
    const id = await createSavedRigPreset({ ...payload, userId: activeUserId });
    await trackSyncChange('saved_setup', 'create', id, payload);
    await refresh(activeUserId);
    return id;
  },
  deleteSavedRigPreset: async (presetId) => {
    await deleteSavedRigPreset(presetId);
    await trackSyncChange('saved_setup', 'delete', presetId, { presetId });
    await refresh(activeUserId);
  },
  addSavedRiver: async (name) => {
    assertActiveUser();
    if (!activeUserId) throw new Error('No active user selected.');
    const id = await createSavedRiver({ userId: activeUserId, name });
    await trackSyncChange('saved_setup', 'create', id, { name });
    await refresh(activeUserId);
    return id;
  },
  createGroup: async (name) => {
    assertActiveUser();
    if (!activeUserId) throw new Error('No active user selected.');
    const group = await createLocalGroupWithDefaults(activeUserId, name);
    await trackSyncChange('group', 'create', group.id, group);
    const refreshed = await loadLocalAppData(activeUserId);
    const membership = refreshed.groupMemberships.find((entry) => entry.groupId === group.id && entry.userId === activeUserId);
    if (membership) {
      await trackSyncChange('group_membership', 'create', membership.id, membership);
    }
    await refresh(activeUserId);
    return group;
  },
  joinGroup: async (joinCode) => {
    assertActiveUser();
    if (!activeUserId) throw new Error('No active user selected.');
    const membership = await joinLocalGroupByCode(activeUserId, joinCode, groups, groupMemberships);
    await trackSyncChange('group_membership', 'join', membership.id, { joinCode, membership });
    await refresh(activeUserId);
    return membership;
  },
  updateSharePreference: async (groupId, updates) => {
    assertActiveUser();
    if (!activeUserId) throw new Error('No active user selected.');
    await updateLocalSharePreference(activeUserId, groupId, updates);
    const refreshed = await loadLocalAppData(activeUserId);
    const preference = refreshed.sharePreferences.find((entry) => entry.groupId === groupId && entry.userId === activeUserId);
    if (preference) {
      await trackSyncChange('share_preference', 'update', preference.id, { groupId, preferenceId: preference.id, updates });
    }
    await refresh(activeUserId);
  },
  createCompetition: async (payload) => {
    assertActiveUser();
    if (!activeUserId) throw new Error('No active user selected.');
    const competition = await createLocalCompetitionWithParticipant(activeUserId, payload);
    await trackSyncChange('competition', 'create', competition.id, competition);
    const refreshed = await loadLocalAppData(activeUserId);
    for (const group of refreshed.competitionGroups.filter((entry) => entry.competitionId === competition.id)) {
      await trackSyncChange('competition_group', 'create', group.id, group);
    }
    for (const session of refreshed.competitionSessions.filter((entry) => entry.competitionId === competition.id)) {
      await trackSyncChange('competition_session', 'create', session.id, session);
    }
    for (const participant of refreshed.competitionParticipants.filter((entry) => entry.competitionId === competition.id)) {
      await trackSyncChange('competition_participant', participant.userId === activeUserId ? 'join' : 'create', participant.id, participant);
    }
    await refresh(activeUserId);
    return competition;
  },
  joinCompetition: async (joinCode) => {
    assertActiveUser();
    if (!activeUserId) throw new Error('No active user selected.');
    const participant = await joinLocalCompetitionByCode(activeUserId, joinCode, competitions, competitionParticipants);
    await trackSyncChange('competition_participant', 'join', participant.id, { joinCode, participant });
    await refresh(activeUserId);
    return participant;
  },
  createInvite: async (payload) => {
    assertActiveUser();
    if (!activeUserId) throw new Error('No active user selected.');
    const invite = await createLocalInvite(activeUserId, payload);
    await trackSyncChange('invite', 'create', invite.id, invite);
    await refresh(activeUserId);
    return invite;
  },
  acceptInvite: async (inviteCode) => {
    assertActiveUser();
    if (!activeUserId) throw new Error('No active user selected.');
    const invite = await acceptLocalInvite(activeUserId, inviteCode, invites, groupMemberships);
    await trackSyncChange('invite', 'accept', invite.id, { inviteCode, inviteId: invite.id });
    const refreshed = await loadLocalAppData(activeUserId);
    const membership = refreshed.groupMemberships.find(
      (entry) => entry.userId === activeUserId && entry.groupId === invite.targetGroupId
    );
    if (membership) {
      await trackSyncChange('group_membership', 'join', membership.id, membership);
    }
    const sponsored = refreshed.sponsoredAccess.find(
      (entry) => entry.sponsoredUserId === activeUserId && entry.targetGroupId === invite.targetGroupId && entry.active
    );
    if (sponsored) {
      await trackSyncChange('sponsored_access', 'create', sponsored.id, sponsored);
    }
    await refresh(activeUserId);
    return invite;
  },
  revokeSponsoredAccess: async (sponsoredAccessId) => {
    assertOwnerAccess();
    await revokeLocalSponsoredAccess(sponsoredAccessId);
    await trackSyncChange('sponsored_access', 'revoke', sponsoredAccessId, { sponsoredAccessId });
    await refresh(activeUserId);
  },
  upsertCompetitionAssignment: async (payload) => {
    assertActiveUser();
    if (!activeUserId) throw new Error('No active user selected.');
    const assignment = await saveLocalCompetitionAssignment(activeUserId, payload);
    await trackSyncChange('competition_assignment', 'update', assignment.id, assignment);
    await refresh(activeUserId);
    return assignment;
  },
  upsertCompetitionAssignmentForUser: async (userId, payload) => {
    const assignment = await saveLocalCompetitionAssignment(userId, payload);
    await trackSyncChange('competition_assignment', 'update', assignment.id, assignment);
    await refresh(activeUserId);
    return assignment;
  },
  flushSyncQueue: async () => {
    assertRemoteAuth();
    await flushSyncQueueInternal();
  },
  updateUserAccess: async (userId, next) => {
    assertOwnerAccess();
    await updateUserAccess(userId, next);
  },
  startTrialForUser: async (userId) => {
    assertOwnerAccess();
    const trialWindow = createTrialWindow();
    await updateUserAccess(userId, {
      accessLevel: 'trial',
      subscriptionStatus: 'trialing',
      trialStartedAt: trialWindow.trialStartedAt,
      trialEndsAt: trialWindow.trialEndsAt,
      subscriptionExpiresAt: null,
      grantedByUserId: activeUserId
    });
  },
  grantPowerUserAccess: async (userId) => {
    assertOwnerAccess();
    await updateUserAccess(userId, {
      accessLevel: 'power_user',
      subscriptionStatus: 'power_user',
      trialStartedAt: null,
      trialEndsAt: null,
      subscriptionExpiresAt: null,
      grantedByUserId: activeUserId
    });
  },
  markSubscriberAccess: async (userId, expiresAt = null) => {
    assertOwnerAccess();
    await updateUserAccess(userId, {
      accessLevel: 'subscriber',
      subscriptionStatus: 'active',
      trialStartedAt: null,
      trialEndsAt: null,
      subscriptionExpiresAt: expiresAt,
      grantedByUserId: activeUserId
    });
  },
  clearUserAccess: async (userId) => {
    assertOwnerAccess();
    const target = users.find((user) => user.id === userId);
    await updateUserAccess(userId, {
      accessLevel: target?.role === 'owner' ? 'power_user' : 'free',
      subscriptionStatus: target?.role === 'owner' ? 'power_user' : 'not_started',
      trialStartedAt: null,
      trialEndsAt: null,
      subscriptionExpiresAt: null,
      grantedByUserId: activeUserId
    });
  },
  clearFishingDataForUser: async (userId) => {
    await clearLocalFishingDataForUser(userId);
    await refresh(activeUserId);
  },
  clearUserDataCategories: async (userId, categories) => {
    await clearLocalUserDataCategories(userId, categories);
    await refresh(activeUserId);
  },
  deleteAngler: async (userId) => {
    const target = users.find((user) => user.id === userId);
    if (!target || target.role === 'owner') {
      throw new Error('Owner profile cannot be deleted.');
    }

    await deleteLocalAnglerData(userId);

    const remainingUsers = (await listUsers()).filter((user) => user.id !== userId);
    const fallbackUserId = remainingUsers.find((user) => user.role === 'owner')?.id ?? remainingUsers[0]?.id ?? null;

    if (activeUserId === userId && fallbackUserId) {
      await selectActiveUser(fallbackUserId);
      await refresh(fallbackUserId);
      return;
    }

    await refresh(fallbackUserId ?? activeUserId);
  },
  archiveExperiment: async (experimentId) => {
    await archiveExperiments([experimentId]);
    await refresh(activeUserId);
  },
  deleteExperiment: async (experimentId) => {
    await deleteExperiments([experimentId]);
    await refresh(activeUserId);
  },
  cleanupExperimentsForCurrentUser: async ({ from, to, outcome = 'all', action }) => {
    const experimentIds = experiments
      .filter((experiment) => {
        const session = sessionMap.get(experiment.sessionId);
        if (!session) return false;
        if (outcome !== 'all' && experiment.outcome !== outcome) return false;
        return isWithinDateRange(session.date, { from, to });
      })
      .map((experiment) => experiment.id);

    if (!experimentIds.length) return 0;

    if (action === 'archive') {
      await archiveExperiments(experimentIds);
    } else {
      await deleteExperiments(experimentIds);
    }

    await refresh(activeUserId);
    return experimentIds.length;
  },
  refresh,
  addSession: async (payload) => {
    assertActiveUser();
    if (!activeUserId) throw new Error('No active user selected.');
    const id = await createSession({ ...payload, userId: activeUserId });
    await trackSyncChange('session', 'create', id, payload);
    await refresh();
    return id;
  },
  updateSessionEntry: async (sessionId, payload) => {
    assertActiveUser();
    await updateSession(sessionId, payload);
    await trackSyncChange('session', 'update', sessionId, payload);
    await refresh(activeUserId);
  },
  addSessionSegment: async (payload) => {
    assertActiveUser();
    if (!activeUserId) throw new Error('No active user selected.');
    const id = await createSessionSegment({ ...payload, userId: activeUserId });
    await trackSyncChange('session_segment', 'create', id, payload);
    await refresh(activeUserId);
    return id;
  },
  updateSessionSegmentEntry: async (segmentId, payload) => {
    assertActiveUser();
    await updateSessionSegment(segmentId, payload);
    await trackSyncChange('session_segment', 'update', segmentId, payload);
    await refresh(activeUserId);
  },
  addCatchEvent: async (payload) => {
    assertActiveUser();
    if (!activeUserId) throw new Error('No active user selected.');
    const id = await createCatchEvent({ ...payload, userId: activeUserId });
    await trackSyncChange('catch_event', 'create', id, payload);
    await refresh(activeUserId);
    return id;
  },
  addExperiment: async (payload) => {
    assertActiveUser();
    if (!activeUserId) throw new Error('No active user selected.');
    const id = await createExperiment({ ...payload, userId: activeUserId });
    await trackSyncChange('experiment', 'create', id, payload);
    await refresh();
    return id;
  },
  updateExperimentEntry: async (experimentId, payload) => {
    assertActiveUser();
    await updateExperiment(experimentId, payload);
    await trackSyncChange('experiment', 'update', experimentId, payload);
    await refresh(activeUserId);
  },
  archiveInconclusiveExperiments: async ({ from, to }) => {
    assertActiveUser();
    const experimentIds = experiments
      .filter((experiment) => {
        if (experiment.outcome !== 'inconclusive') return false;
        const session = sessionMap.get(experiment.sessionId);
        if (!session) return false;
        return isWithinDateRange(session.date, { from, to });
      })
      .map((experiment) => experiment.id);

    await archiveExperiments(experimentIds);
    await refresh(activeUserId);
    return experimentIds.length;
  }
  });
};
