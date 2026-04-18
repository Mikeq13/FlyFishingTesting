import { createTrialWindow } from '@/engine/entitlementEngine';
import { isWithinDateRange } from '@/utils/dateRange';
import { archiveExperiments, createExperiment, deleteExperiments, listExperiments, updateExperiment } from '@/db/experimentRepo';
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
  clearLocalGroupsForUser,
  createLocalGroupWithDefaults,
  createLocalInvite,
  deleteLocalGroup,
  deleteLocalAnglerData,
  joinLocalCompetitionByCode,
  joinLocalGroupByCode,
  leaveLocalGroup,
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
  savedFlies,
  savedLeaderFormulas,
  savedRigPresets,
  savedRivers,
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
  savedFlies: AppStore['savedFlies'];
  savedLeaderFormulas: AppStore['savedLeaderFormulas'];
  savedRigPresets: AppStore['savedRigPresets'];
  savedRivers: AppStore['savedRivers'];
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
  | 'leaveGroup'
  | 'deleteGroup'
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
    if (!currentUser || (!isAuthenticatedOwner && currentUser.role !== 'owner')) {
      throw new Error('Only the owner can manage tester access.');
    }
  };

  const actingOwnerUserId =
    (isAuthenticatedOwner ? users.find((user) => user.role === 'owner')?.id : currentUser?.role === 'owner' ? currentUser.id : null) ??
    activeUserId;

  const normalizeSavedName = (value: string) => value.trim().toLowerCase();

  const ensureUniqueSavedName = (entries: Array<{ name: string }>, name: string, label: string) => {
    const normalizedName = normalizeSavedName(name);
    if (!normalizedName) {
      throw new Error(`${label} name is required.`);
    }
    if (entries.some((entry) => normalizeSavedName(entry.name) === normalizedName)) {
      throw new Error(`${label} "${name.trim()}" already exists.`);
    }
  };

  const flushSyncChangesOrThrow = async (startedAt: string, fallbackMessage: string) => {
    if (!remoteSession) return;
    await flushSyncQueueInternal();
    const loadedAfterFlush = await loadLocalAppData(activeUserId);
    const cleanupFailures = loadedAfterFlush.syncQueue.filter(
      (entry) => entry.status === 'failed' && entry.createdAt >= startedAt
    );
    if (cleanupFailures.length) {
      throw new Error(fallbackMessage);
    }
  };

  const queueExperimentArchiveUpdates = async (experimentIds: number[]) => {
    const archivedAt = new Date().toISOString();
    const matchingExperiments = experiments.filter((experiment) => experimentIds.includes(experiment.id));
    for (const experiment of matchingExperiments) {
      await trackSyncChange('experiment', 'update', experiment.id, {
        ...experiment,
        archivedAt
      });
    }
  };

  const queueCleanupDeletes = async (
    userId: number,
    categories: AppStore['clearUserDataCategories'] extends (userId: number, categories: infer T) => Promise<void> ? T : never
  ) => {
    const startedAt = new Date().toISOString();
    if (!remoteSession) {
      return startedAt;
    }
    const loaded = await loadLocalAppData(userId);
    const archivedExperiments = await listExperiments(userId, { includeArchived: true });
    const ownedGroupIds = loaded.groups.filter((group) => group.createdByUserId === userId).map((group) => group.id);
    const ownedCompetitionIds = loaded.competitions
      .filter((competition) => competition.organizerUserId === userId)
      .map((competition) => competition.id);

    const normalizedCategories = categories.includes('all')
      ? ['experiments', 'sessions', 'drafts', 'flies', 'formulas', 'rig_presets', 'rivers', 'groups'] as const
      : categories;

    const queueDelete = async (entityType: SyncEntityType, recordId: number, payload: Record<string, unknown>) => {
      await trackSyncChange(entityType, 'delete', recordId, payload);
    };

    if (normalizedCategories.includes('groups')) {
      for (const entry of loaded.sharePreferences.filter((preference) => preference.userId === userId || ownedGroupIds.includes(preference.groupId))) {
        await queueDelete('share_preference', entry.id, { groupId: entry.groupId });
      }
      for (const entry of loaded.invites.filter((invite) => invite.inviterUserId === userId || ownedGroupIds.includes(invite.targetGroupId) || invite.acceptedByUserId === userId)) {
        await queueDelete('invite', entry.id, { inviteId: entry.id });
      }
      for (const entry of loaded.sponsoredAccess.filter((access) => access.sponsorUserId === userId || access.sponsoredUserId === userId || ownedGroupIds.includes(access.targetGroupId))) {
        await queueDelete('sponsored_access', entry.id, { sponsoredAccessId: entry.id });
      }
      for (const entry of loaded.groupMemberships.filter((membership) => membership.userId === userId || ownedGroupIds.includes(membership.groupId))) {
        await queueDelete('group_membership', entry.id, { membershipId: entry.id, groupId: entry.groupId });
      }
      for (const groupId of ownedGroupIds) {
        await queueDelete('group', groupId, { groupId });
      }
    }

    if (normalizedCategories.includes('sessions')) {
      for (const event of loaded.catchEvents.filter((item) => item.userId === userId)) {
        await queueDelete('catch_event', event.id, { catchEventId: event.id });
      }
      for (const segment of loaded.sessionSegments.filter((item) => item.userId === userId)) {
        await queueDelete('session_segment', segment.id, { segmentId: segment.id });
      }
      for (const experiment of archivedExperiments.filter((item) => item.userId === userId)) {
        await queueDelete('experiment', experiment.id, { experimentId: experiment.id });
      }
      for (const session of loaded.sessions.filter((item) => item.userId === userId)) {
        await queueDelete('session', session.id, { sessionId: session.id });
      }
      for (const assignment of loaded.competitionAssignments.filter((item) => item.userId === userId || ownedCompetitionIds.includes(item.competitionId))) {
        await queueDelete('competition_assignment', assignment.id, { assignmentId: assignment.id });
      }
      for (const participant of loaded.competitionParticipants.filter((item) => item.userId === userId || ownedCompetitionIds.includes(item.competitionId))) {
        await queueDelete('competition_participant', participant.id, { participantId: participant.id });
      }
      for (const competitionSession of loaded.competitionSessions.filter((item) => ownedCompetitionIds.includes(item.competitionId))) {
        await queueDelete('competition_session', competitionSession.id, { competitionSessionId: competitionSession.id });
      }
      for (const competitionGroup of loaded.competitionGroups.filter((item) => ownedCompetitionIds.includes(item.competitionId))) {
        await queueDelete('competition_group', competitionGroup.id, { competitionGroupId: competitionGroup.id });
      }
      for (const competition of loaded.competitions.filter((item) => item.organizerUserId === userId)) {
        await queueDelete('competition', competition.id, { competitionId: competition.id });
      }
    } else if (normalizedCategories.includes('experiments')) {
      for (const experiment of archivedExperiments.filter((item) => item.userId === userId)) {
        await queueDelete('experiment', experiment.id, { experimentId: experiment.id });
      }
    } else if (normalizedCategories.includes('drafts')) {
      for (const experiment of archivedExperiments.filter((item) => item.userId === userId && item.status === 'draft')) {
        await queueDelete('experiment', experiment.id, { experimentId: experiment.id });
      }
    }

    if (normalizedCategories.includes('flies')) {
      for (const fly of loaded.savedFlies.filter((item) => item.userId === userId)) {
        await queueDelete('saved_setup', fly.id, { savedType: 'fly', savedFlyId: fly.id });
      }
    }
    if (normalizedCategories.includes('formulas')) {
      for (const formula of loaded.savedLeaderFormulas.filter((item) => item.userId === userId)) {
        await queueDelete('saved_setup', formula.id, { savedType: 'leader_formula', formulaId: formula.id });
      }
    }
    if (normalizedCategories.includes('rig_presets')) {
      for (const preset of loaded.savedRigPresets.filter((item) => item.userId === userId)) {
        await queueDelete('saved_setup', preset.id, { savedType: 'rig_preset', presetId: preset.id });
      }
    }
    if (normalizedCategories.includes('rivers')) {
      for (const river of loaded.savedRivers.filter((item) => item.userId === userId)) {
        await queueDelete('saved_setup', river.id, { savedType: 'river', riverId: river.id });
      }
    }

    return startedAt;
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
    ensureUniqueSavedName(savedFlies, payload.name, 'Fly');
    const id = await createSavedFly({ ...payload, name: payload.name.trim(), userId: activeUserId });
    await trackSyncChange('saved_setup', 'create', id, payload);
    await refresh(activeUserId);
    return id;
  },
  addSavedLeaderFormula: async (payload) => {
    assertActiveUser();
    if (!activeUserId) throw new Error('No active user selected.');
    ensureUniqueSavedName(savedLeaderFormulas, payload.name, 'Leader');
    const id = await createSavedLeaderFormula({ ...payload, name: payload.name.trim(), userId: activeUserId });
    await trackSyncChange('saved_setup', 'create', id, payload);
    await refresh(activeUserId);
    return id;
  },
  deleteSavedLeaderFormula: async (formulaId) => {
    await deleteSavedLeaderFormula(formulaId);
    const startedAt = new Date().toISOString();
    await trackSyncChange('saved_setup', 'delete', formulaId, { savedType: 'leader_formula', formulaId });
    await flushSyncChangesOrThrow(startedAt, 'Unable to remove this leader formula from shared data right now.');
    await refresh(activeUserId);
  },
  addSavedRigPreset: async (payload) => {
    assertActiveUser();
    if (!activeUserId) throw new Error('No active user selected.');
    ensureUniqueSavedName(savedRigPresets, payload.name, 'Rig preset');
    const id = await createSavedRigPreset({ ...payload, name: payload.name.trim(), userId: activeUserId });
    await trackSyncChange('saved_setup', 'create', id, payload);
    await refresh(activeUserId);
    return id;
  },
  deleteSavedRigPreset: async (presetId) => {
    await deleteSavedRigPreset(presetId);
    const startedAt = new Date().toISOString();
    await trackSyncChange('saved_setup', 'delete', presetId, { savedType: 'rig_preset', presetId });
    await flushSyncChangesOrThrow(startedAt, 'Unable to remove this rig preset from shared data right now.');
    await refresh(activeUserId);
  },
  addSavedRiver: async (name) => {
    assertActiveUser();
    if (!activeUserId) throw new Error('No active user selected.');
    ensureUniqueSavedName(savedRivers, name, 'River');
    const id = await createSavedRiver({ userId: activeUserId, name: name.trim() });
    await trackSyncChange('saved_setup', 'create', id, { name });
    await refresh(activeUserId);
    return id;
  },
  createGroup: async (name) => {
    assertActiveUser();
    if (!activeUserId) throw new Error('No active user selected.');
    ensureUniqueSavedName(groups, name, 'Group');
    const group = await createLocalGroupWithDefaults(activeUserId, name.trim());
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
  leaveGroup: async (groupId) => {
    assertActiveUser();
    if (!activeUserId) throw new Error('No active user selected.');
    const result = await leaveLocalGroup(activeUserId, groupId);
    await trackSyncChange('group_membership', 'delete', result.membershipId, result);
    if (result.deletedGroup) {
      await trackSyncChange('group', 'delete', groupId, { groupId });
    }
    await refresh(activeUserId);
    return result;
  },
  deleteGroup: async (groupId) => {
    assertActiveUser();
    if (!activeUserId) throw new Error('No active user selected.');
    await deleteLocalGroup(activeUserId, groupId);
    await trackSyncChange('group', 'delete', groupId, { groupId });
    await refresh(activeUserId);
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
        grantedByUserId: actingOwnerUserId
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
        grantedByUserId: actingOwnerUserId
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
        grantedByUserId: actingOwnerUserId
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
        grantedByUserId: actingOwnerUserId
      });
    },
  clearFishingDataForUser: async (userId) => {
    const startedAt = await queueCleanupDeletes(userId, ['all']);
    await flushSyncChangesOrThrow(startedAt, 'Some shared records could not be removed, so cleanup stopped before local data was cleared.');
    await clearLocalFishingDataForUser(userId, { preserveSyncQueue: true });
    await refresh(activeUserId);
  },
  clearUserDataCategories: async (userId, categories) => {
    const startedAt = await queueCleanupDeletes(userId, categories);
    await flushSyncChangesOrThrow(startedAt, 'Some shared records could not be removed, so cleanup stopped before local data was cleared.');
    if (categories.includes('groups') || categories.includes('all')) {
      await clearLocalGroupsForUser(userId);
    }
    await clearLocalUserDataCategories(userId, categories.filter((category) => category !== 'groups'));
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
    const startedAt = new Date().toISOString();
    await queueExperimentArchiveUpdates([experimentId]);
    await archiveExperiments([experimentId]);
    await flushSyncChangesOrThrow(startedAt, 'Unable to archive this experiment in shared history right now.');
    await refresh(activeUserId);
  },
  deleteExperiment: async (experimentId) => {
    const startedAt = new Date().toISOString();
    await trackSyncChange('experiment', 'delete', experimentId, { experimentId });
    await deleteExperiments([experimentId]);
    await flushSyncChangesOrThrow(startedAt, 'Unable to delete this experiment from shared history right now.');
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
      const startedAt = new Date().toISOString();
      await queueExperimentArchiveUpdates(experimentIds);
      await archiveExperiments(experimentIds);
      await flushSyncChangesOrThrow(startedAt, 'Unable to archive all of those experiments in shared history right now.');
    } else {
      const startedAt = new Date().toISOString();
      for (const experimentId of experimentIds) {
        await trackSyncChange('experiment', 'delete', experimentId, { experimentId });
      }
      await deleteExperiments(experimentIds);
      await flushSyncChangesOrThrow(startedAt, 'Unable to delete all of those experiments from shared history right now.');
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
