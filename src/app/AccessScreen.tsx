import React from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { ScreenBackground } from '@/components/ScreenBackground';
import { UserDataCleanupCategory, useAppStore } from './store';
import { parseLocalTimeInput } from '@/utils/dateTime';
import { CompetitionSessionRole } from '@/types/group';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ActionGroup } from '@/components/ui/ActionGroup';
import { AppButton } from '@/components/ui/AppButton';
import { AccountSecuritySection } from '@/components/access/AccountSecuritySection';
import { LocalDataSection } from '@/components/access/LocalDataSection';
import { GroupsSharingSection } from '@/components/access/GroupsSharingSection';
import { CompetitionsSection } from '@/components/access/CompetitionsSection';
import { OwnerControlsSection } from '@/components/access/OwnerControlsSection';
import { SectionCard } from '@/components/ui/SectionCard';
import { InlineSummaryRow } from '@/components/ui/InlineSummaryRow';
import { StatusBanner } from '@/components/ui/StatusBanner';
import { OptionChips } from '@/components/OptionChips';
import { useResponsiveLayout } from '@/design/layout';
import { useTheme } from '@/design/theme';
import { hasSupabaseConfig } from '@/services/supabaseClient';

type AccessDestination = 'hub' | 'account' | 'groups' | 'subscription' | 'appearance' | 'competitions' | 'myData' | 'ownerTools';

export const AccessScreen = () => {
  const layout = useResponsiveLayout();
  const { theme, themeId, setThemeId, themeOptions } = useTheme();
  const {
    users,
    ownerUser,
    currentUser,
    currentEntitlementLabel,
    currentHasPremiumAccess,
    syncStatus,
    sharedDataStatus,
    notificationPermissionStatus,
    authStatus,
    remoteSession,
    remoteBootstrapState,
    ownerIdentityLinked,
    isAuthenticatedOwner,
    mfaFactors,
    pendingTotpEnrollment,
    mfaAssuranceLevel,
    isSyncEnabled,
    invites,
    sponsoredAccess,
    sendPasswordResetEmail,
    updateAccountEmail,
    updateCurrentUserName,
    linkOwnerIdentity,
    enrollTotpMfa,
    verifyTotpMfa,
    removeMfaFactor,
    refreshMfaState,
    signOutRemote,
    startTrialForUser,
    grantPowerUserAccess,
    markSubscriberAccess,
    clearUserAccess,
    clearFishingDataForUser,
    clearUserDataCategories,
    deleteAngler,
    groups,
    groupMemberships,
    sharePreferences,
    competitions,
    competitionGroups,
    competitionSessions,
    competitionParticipants,
    competitionAssignments,
    createGroup,
    joinGroup,
    updateSharePreference,
    createCompetition,
    joinCompetition,
    upsertCompetitionAssignmentForUser,
    createInvite,
    acceptInvite,
    revokeSponsoredAccess
  } = useAppStore();
  const [newGroupName, setNewGroupName] = React.useState('');
  const [joinGroupCode, setJoinGroupCode] = React.useState('');
  const [newCompetitionName, setNewCompetitionName] = React.useState('');
  const [competitionGroupCount, setCompetitionGroupCount] = React.useState('2');
  const [competitionSessionCount, setCompetitionSessionCount] = React.useState('3');
  const [competitionJoinCode, setCompetitionJoinCode] = React.useState('');
  const [inviteTargetGroupId, setInviteTargetGroupId] = React.useState<number | null>(null);
  const [inviteTargetName, setInviteTargetName] = React.useState('');
  const [inviteAcceptCode, setInviteAcceptCode] = React.useState('');
  const [accountName, setAccountName] = React.useState(currentUser?.name ?? '');
  const [accountEmail, setAccountEmail] = React.useState(currentUser?.email ?? remoteSession?.email ?? '');
  const [passwordResetEmail, setPasswordResetEmail] = React.useState(currentUser?.email ?? remoteSession?.email ?? '');
  const [mfaFriendlyName, setMfaFriendlyName] = React.useState('Fishing Lab Authenticator');
  const [mfaCode, setMfaCode] = React.useState('');
  const [activeDestination, setActiveDestination] = React.useState<AccessDestination>('hub');
  const [competitionSchedule, setCompetitionSchedule] = React.useState([
    { sessionNumber: 1, startTime: '08:00', endTime: '11:00' },
    { sessionNumber: 2, startTime: '13:00', endTime: '16:00' },
    { sessionNumber: 3, startTime: '17:00', endTime: '20:00' }
  ]);
  const [assignmentDrafts, setAssignmentDrafts] = React.useState<Record<string, { competitionGroupId: number | null; beat: string; role: CompetitionSessionRole }>>({});

  const joinedMemberships = React.useMemo(
    () => groupMemberships.filter((membership) => membership.userId === currentUser?.id),
    [currentUser?.id, groupMemberships]
  );
  const joinedGroups = React.useMemo(
    () =>
      joinedMemberships
        .map((membership) => groups.find((group) => group.id === membership.groupId))
        .filter((group): group is (typeof groups)[number] => !!group),
    [groups, joinedMemberships]
  );
  const organizerGroups = React.useMemo(
    () =>
      joinedMemberships
        .filter((membership) => membership.role === 'organizer')
        .map((membership) => groups.find((group) => group.id === membership.groupId))
        .filter((group): group is (typeof groups)[number] => !!group),
    [groups, joinedMemberships]
  );
  const joinedCompetitionList = React.useMemo(
    () =>
      competitionParticipants
        .filter((participant) => participant.userId === currentUser?.id)
        .map((participant) => competitions.find((competition) => competition.id === participant.competitionId))
        .filter((competition): competition is (typeof competitions)[number] => !!competition),
    [competitionParticipants, competitions, currentUser?.id]
  );

  const getAssignmentDraftKey = (competitionId: number, userId: number, competitionSessionId: number) =>
    `${competitionId}:${userId}:${competitionSessionId}`;

  const updateAssignmentDraft = (
    competitionId: number,
    userId: number,
    competitionSessionId: number,
    next: Partial<{ competitionGroupId: number | null; beat: string; role: CompetitionSessionRole }>
  ) => {
    const key = getAssignmentDraftKey(competitionId, userId, competitionSessionId);
    setAssignmentDrafts((current) => ({
      ...current,
      [key]: {
        ...current[key],
        competitionGroupId: current[key]?.competitionGroupId ?? null,
        beat: current[key]?.beat ?? '',
        role: current[key]?.role ?? 'fishing',
        ...next
      }
    }));
  };

  const getDraftForAssignment = (
    competitionId: number,
    userId: number,
    competitionSessionId: number,
    fallback: { competitionGroupId: number | null; beat: string; role: CompetitionSessionRole }
  ) => assignmentDrafts[getAssignmentDraftKey(competitionId, userId, competitionSessionId)] ?? fallback;

  React.useEffect(() => {
    if (!inviteTargetGroupId && organizerGroups[0]) {
      setInviteTargetGroupId(organizerGroups[0].id);
    }
  }, [inviteTargetGroupId, organizerGroups]);

  React.useEffect(() => {
    const count = Math.max(1, Math.min(8, Number(competitionSessionCount) || 1));
    setCompetitionSchedule((current) => {
      const next = Array.from({ length: count }, (_, index) => {
        const existing = current[index];
        return existing ?? {
          sessionNumber: index + 1,
          startTime: '08:00',
          endTime: '11:00'
        };
      });
      return next.map((entry, index) => ({ ...entry, sessionNumber: index + 1 }));
    });
  }, [competitionSessionCount]);

  React.useEffect(() => {
    setAccountName(currentUser?.name ?? '');
  }, [currentUser?.name]);

  React.useEffect(() => {
    const resolvedEmail = currentUser?.email ?? remoteSession?.email ?? '';
    setAccountEmail(resolvedEmail);
    setPasswordResetEmail(resolvedEmail);
  }, [currentUser?.email, remoteSession?.email]);

  React.useEffect(() => {
    if (activeDestination === 'ownerTools' && !isAuthenticatedOwner) {
      setActiveDestination('hub');
    }
  }, [activeDestination, isAuthenticatedOwner]);

  if (!currentUser) {
    return (
      <ScreenBackground>
        <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
          <Text style={{ color: theme.colors.text, textAlign: 'center', fontWeight: '700', fontSize: 18 }}>
            {remoteSession
              ? remoteBootstrapState === 'resolving_local'
                ? 'Finishing your account setup...'
                : 'Your personal angler profile is still loading.'
              : 'No active user selected.'}
          </Text>
          <Text style={{ color: theme.colors.textSoft, textAlign: 'center', marginTop: 10, lineHeight: 20 }}>
            {remoteSession
              ? 'Stay on this screen while the app finishes linking your signed-in account to a local angler profile. If shared beta data is unavailable, your account should still recover once bootstrap completes.'
              : 'Sign in or select an angler profile before opening the utility center.'}
          </Text>
        </View>
      </ScreenBackground>
    );
  }

  const runAdminAction = async (action: () => Promise<void>, label: string) => {
    await action();
    Alert.alert('Action completed', label);
  };

  const confirmAdminAction = (title: string, message: string, action: () => Promise<void>, successLabel: string) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Continue',
        style: 'destructive',
        onPress: () => {
          runAdminAction(action, successLabel).catch((error) => {
            const reason = error instanceof Error ? error.message : 'Please try again.';
            Alert.alert('Unable to finish action', reason);
          });
        }
      }
    ]);
  };

  const cleanupConfig: Array<{ key: UserDataCleanupCategory; label: string; description: string; destructive?: boolean }> = [
    { key: 'experiments', label: 'Clear Experiments', description: 'Removes experiment results but keeps sessions, saved flies, and saved rivers.' },
    { key: 'sessions', label: 'Clear Sessions', description: 'Removes sessions and their linked experiments, but keeps saved flies and saved rivers.' },
    { key: 'flies', label: 'Clear Saved Flies', description: 'Removes saved flies but keeps sessions, experiments, and saved rivers.' },
    { key: 'formulas', label: 'Clear Leader Formulas', description: 'Removes saved leader formulas but keeps sessions, experiments, flies, and saved rivers.' },
    { key: 'rig_presets', label: 'Clear Rig Presets', description: 'Removes saved rig presets but keeps sessions, experiments, flies, and leader formulas.' },
    { key: 'rivers', label: 'Clear Saved Rivers', description: 'Removes saved rivers but keeps sessions, experiments, and saved flies.' },
    { key: 'all', label: 'Clear Everything', description: 'Removes sessions, experiments, saved flies, saved leader formulas, saved rig presets, and saved rivers for this profile.', destructive: true }
  ];

  const renderCleanupActions = (userId: number, userName: string) => (
    <ActionGroup>
      {cleanupConfig.map((item) => (
        <AppButton
          key={`${userId}-${item.key}`}
          label={item.label}
          onPress={() => handleCleanupCategory(userId, userName, item.key)}
          variant={item.destructive ? 'danger' : 'ghost'}
          surfaceTone="light"
        />
      ))}
    </ActionGroup>
  );

  const saveGroup = async () => {
    const name = newGroupName.trim();
    if (!name) {
      Alert.alert('Group name needed', 'Give the group a name before creating it.');
      return;
    }
    const created = await createGroup(name);
    setNewGroupName('');
    Alert.alert('Group created', `${created.name} is ready. Join code: ${created.joinCode}`);
  };

  const handleJoinGroup = async () => {
    const code = joinGroupCode.trim();
    if (!code) return;
    await joinGroup(code);
    setJoinGroupCode('');
    Alert.alert('Group joined', 'You can now decide what information to share with this group.');
  };

  const saveCompetition = async () => {
    const name = newCompetitionName.trim();
    const groupCount = Math.max(1, Math.min(4, Number(competitionGroupCount) || 1));
    const sessionCount = Math.max(1, Math.min(8, Number(competitionSessionCount) || 1));
    const normalizedSchedule = competitionSchedule.slice(0, sessionCount);
    const invalidSession = normalizedSchedule.find((session) => {
      const start = parseLocalTimeInput(session.startTime);
      const end = parseLocalTimeInput(session.endTime);
      if (!start || !end) return true;
      return end.hours * 60 + end.minutes <= start.hours * 60 + start.minutes;
    });

    if (!name || invalidSession) {
      Alert.alert('Competition details incomplete', 'Enter a name, choose group/session counts, and use valid start and end times for every session.');
      return;
    }
    const created = await createCompetition({
      name,
      groupCount,
      sessions: normalizedSchedule.map((session, index) => ({
        sessionNumber: index + 1,
        startTime: session.startTime,
        endTime: session.endTime
      }))
    });
    setNewCompetitionName('');
    setCompetitionGroupCount('2');
    setCompetitionSessionCount('3');
    Alert.alert('Competition created', `${created.name} is ready. Join code: ${created.joinCode}`);
  };

  const handleJoinCompetition = async () => {
    const code = competitionJoinCode.trim();
    if (!code) return;
    await joinCompetition(code);
    setCompetitionJoinCode('');
    Alert.alert('Competition joined', 'Enter your assignment details from the comp website when you start your session.');
  };

  const sendInvite = async () => {
    if (!inviteTargetGroupId) {
      Alert.alert('Choose a group', 'Select which friend group the invite should join.');
      return;
    }
    const invite = await createInvite({
      targetGroupId: inviteTargetGroupId,
      targetName: inviteTargetName.trim() || null
    });
    setInviteTargetName('');
    Alert.alert('Invite created', `Share this invite code: ${invite.inviteCode}`);
  };

  const handleAcceptInvite = async () => {
    const code = inviteAcceptCode.trim();
    if (!code) return;
    await acceptInvite(code);
    setInviteAcceptCode('');
    Alert.alert('Invite accepted', 'You now have sponsored power-user access and joined the shared group.');
  };

  const saveAssignment = async (
    competitionId: number,
    userId: number,
    competitionSessionId: number,
    draft: { competitionGroupId: number | null; beat: string; role: CompetitionSessionRole }
  ) => {
    if (!draft.competitionGroupId || !draft.beat.trim()) {
      Alert.alert('Assignment incomplete', 'Choose a competition group and enter a beat before saving.');
      return;
    }

    await upsertCompetitionAssignmentForUser(userId, {
      competitionId,
      competitionGroupId: draft.competitionGroupId,
      competitionSessionId,
      beat: draft.beat.trim(),
      role: draft.role
    });
    Alert.alert('Assignment saved', 'Competition assignment updated.');
  };

  const deleteCurrentProfile = async () => {
    confirmAdminAction(
      'Delete this angler profile?',
      `This permanently removes ${currentUser.name} and all of their saved fishing data from this device.`,
      () => deleteAngler(currentUser.id),
      `${currentUser.name} was deleted from this device.`
    );
  };

  const handleCleanupCategory = (userId: number, userName: string, category: UserDataCleanupCategory) => {
    const item = cleanupConfig.find((entry) => entry.key === category);
    if (!item) return;

    if (item.key === 'experiments') {
      Alert.alert(
        'Clear experiments',
        `Choose whether to delete only incomplete draft experiments or remove all experiments for ${userName}. Drafts are unfinished entries you may not need anymore. All experiments removes both draft and completed experiment history.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete Drafts Only',
            style: 'destructive',
            onPress: () => {
              runAdminAction(() => clearUserDataCategories(userId, ['drafts']), `Draft experiments deleted for ${userName}.`).catch((error) => {
                const reason = error instanceof Error ? error.message : 'Please try again.';
                Alert.alert('Unable to finish action', reason);
              });
            }
          },
          {
            text: 'Delete All Experiments',
            style: 'destructive',
            onPress: () => {
              runAdminAction(() => clearUserDataCategories(userId, ['experiments']), `All experiments deleted for ${userName}.`).catch((error) => {
                const reason = error instanceof Error ? error.message : 'Please try again.';
                Alert.alert('Unable to finish action', reason);
              });
            }
          }
        ]
      );
      return;
    }

    confirmAdminAction(
      `${item.label}?`,
      `${item.description} This only affects ${userName} on this device.`,
      () => (item.key === 'all' ? clearFishingDataForUser(userId) : clearUserDataCategories(userId, [item.key])),
      `${item.label.replace('Clear ', '')} finished for ${userName}.`
    );
  };

  const destinationMeta: Record<Exclude<AccessDestination, 'hub'>, { title: string; subtitle: string }> = {
    account: {
      title: 'Account & Security',
      subtitle: 'Manage your account details, password recovery, and MFA without digging through admin tools.'
    },
    groups: {
      title: 'Groups',
      subtitle: 'Create or join shared groups, manage sharing, and handle owner-managed power-user invites.'
    },
    subscription: {
      title: 'Subscription',
      subtitle: 'Review current access, sync readiness, and the parts of the app that are unlocked for this account.'
    },
    appearance: {
      title: 'Appearance',
      subtitle: 'Pick the reading experience that works best on the water, on the web, or while reviewing data indoors.'
    },
    competitions: {
      title: 'Competitions',
      subtitle: 'Create competitions, join by code, and manage assignments without competing for space with account settings.'
    },
    myData: {
      title: 'My Data',
      subtitle: 'Clean up or reset local fishing data for this angler profile without touching shared access settings.'
    },
    ownerTools: {
      title: 'Owner Tools',
      subtitle: 'Owner-only tester access and administrative controls stay isolated here.'
    }
  };

  const hubDestinations: Array<{ key: Exclude<AccessDestination, 'hub'>; label: string; description: string }> = [
    { key: 'account', label: 'Account & Security', description: 'Name, email, password recovery, MFA, and sign-out.' },
    { key: 'groups', label: 'Groups', description: 'Join crews, manage sharing, and accept or send power-user invites.' },
    { key: 'subscription', label: 'Subscription', description: 'Current access, premium features, sync status, and account readiness.' },
    { key: 'appearance', label: 'Appearance', description: 'Theme and readability choices for native testing and day-to-day use.' },
    { key: 'competitions', label: 'Competitions', description: 'Competition setup, joining, and assignment review.' },
    { key: 'myData', label: 'My Data', description: 'Local cleanup tools for this angler profile.' },
    ...(isAuthenticatedOwner
      ? [{ key: 'ownerTools' as const, label: 'Owner Tools', description: 'Tester access, sponsorship, and owner-only admin actions.' }]
      : [])
  ];

  const renderHub = () => (
    <>
      <SectionCard title="Current Account" subtitle="A quick snapshot without forcing every access detail onto one screen." tone="light">
        <Text style={{ color: theme.colors.textDark, fontWeight: '800', fontSize: 22 }}>{currentUser.name}</Text>
        <View
          style={{
            gap: 8,
            backgroundColor: theme.colors.nestedSurface,
            borderRadius: 12,
            padding: 12,
            borderWidth: 1,
            borderColor: theme.colors.nestedSurfaceBorder
          }}
        >
          <InlineSummaryRow label="Access" value={currentEntitlementLabel} tone="light" />
          <InlineSummaryRow label="Premium" value={currentHasPremiumAccess ? 'Enabled' : 'Locked'} valueMuted={!currentHasPremiumAccess} tone="light" />
          <InlineSummaryRow label="Signed In" value={remoteSession?.email ?? 'Not signed in'} valueMuted={!remoteSession?.email} tone="light" />
          <InlineSummaryRow label="Shared Sync" value={isSyncEnabled ? 'Enabled' : hasSupabaseConfig ? 'Waiting for sign-in' : 'Cloud setup missing'} valueMuted={!isSyncEnabled} tone="light" />
        </View>
        {authStatus === 'pending_verification' ? (
          <StatusBanner tone="info" text="Your account is waiting on an email step. Finish that first, then come back here." />
        ) : null}
        {syncStatus.lastError ? <StatusBanner tone="error" text={`Last sync issue: ${syncStatus.lastError}`} /> : null}
      </SectionCard>

      <SectionCard title="Settings" subtitle="Pick the area you want to manage instead of scrolling through one large utility dashboard." tone="light">
        <View style={{ gap: 12 }}>
          {hubDestinations.map((destination) => (
            <View
              key={destination.key}
              style={{
                gap: 8,
                backgroundColor: theme.colors.nestedSurface,
                borderRadius: 12,
                padding: 12,
                borderWidth: 1,
                borderColor: theme.colors.nestedSurfaceBorder
              }}
            >
              <Text style={{ color: theme.colors.textDark, fontWeight: '800', fontSize: 16 }}>{destination.label}</Text>
              <Text style={{ color: theme.colors.textDarkSoft, lineHeight: 20 }}>{destination.description}</Text>
              <AppButton label={`Open ${destination.label}`} onPress={() => setActiveDestination(destination.key)} variant="ghost" surfaceTone="light" />
            </View>
          ))}
        </View>
      </SectionCard>
    </>
  );

  const renderSubscription = () => (
    <SectionCard title="Subscription" subtitle="Current access and beta readiness stay here instead of competing with everyday account actions." tone="light">
      <View
        style={{
          gap: 8,
          backgroundColor: theme.colors.nestedSurface,
          borderRadius: 12,
          padding: 12,
          borderWidth: 1,
          borderColor: theme.colors.nestedSurfaceBorder
        }}
      >
        <InlineSummaryRow label="Current Access" value={currentEntitlementLabel} tone="light" />
        <InlineSummaryRow label="Premium Features" value={currentHasPremiumAccess ? 'Enabled' : 'Locked'} valueMuted={!currentHasPremiumAccess} tone="light" />
        <InlineSummaryRow label="Shared Data" value={sharedDataStatus} valueMuted={sharedDataStatus !== 'ready'} tone="light" />
        <InlineSummaryRow label="Sync Queue" value={`${syncStatus.pendingCount} pending, ${syncStatus.syncedCount} synced`} tone="light" />
        <InlineSummaryRow label="Sync State" value={syncStatus.state} tone="light" />
        <InlineSummaryRow label="Notifications" value={notificationPermissionStatus} valueMuted={notificationPermissionStatus !== 'granted' && notificationPermissionStatus !== 'provisional'} tone="light" />
        <InlineSummaryRow label="Last Sync" value={syncStatus.lastSyncedAt ? new Date(syncStatus.lastSyncedAt).toLocaleString() : 'Not synced yet'} valueMuted={!syncStatus.lastSyncedAt} tone="light" />
      </View>
      {sharedDataStatus === 'error' ? (
        <StatusBanner
          tone="error"
          text={
            syncStatus.lastError
              ? `Shared data hit a beta sync issue: ${syncStatus.lastError}`
              : 'Shared data could not load. Retry sync before assuming invites, assignments, or shared practice data are current.'
          }
        />
      ) : null}
      {notificationPermissionStatus === 'denied' ? (
        <StatusBanner tone="warning" text="Notifications are blocked on this device. Session reminders will stay in-app until phone notification access is re-enabled." />
      ) : null}
      <Text style={{ color: theme.colors.textDarkSoft, lineHeight: 20 }}>
        Subscription shows what this account can do right now. Group settings, account recovery, and owner workflows live in their own spaces.
      </Text>
    </SectionCard>
  );

  const renderAppearance = () => (
    <SectionCard title="Appearance" subtitle="Choose the look that is easiest to read on the water or on the web." tone="light">
      <OptionChips
        label="App Theme"
        options={themeOptions.map((themeOption) => themeOption.label)}
        value={themeOptions.find((themeOption) => themeOption.id === themeId)?.label ?? themeOptions[0]?.label}
        tone="light"
        onChange={(value) => {
          const selectedTheme = themeOptions.find((themeOption) => themeOption.label === value);
          if (selectedTheme) {
            setThemeId(selectedTheme.id);
          }
        }}
      />
      <Text style={{ color: theme.colors.textDarkSoft, lineHeight: 20 }}>
        `Default Professional` stays balanced, `High Contrast` is best outside, and `Daylight Light` is easiest to review on web or desktop.
      </Text>
    </SectionCard>
  );

  const renderActiveDestination = () => {
    switch (activeDestination) {
      case 'hub':
        return renderHub();
      case 'account':
        return (
          <AccountSecuritySection
            currentUserName={currentUser.name}
            currentEntitlementLabel={currentEntitlementLabel}
            currentHasPremiumAccess={currentHasPremiumAccess}
            ownerLinked={ownerIdentityLinked}
            isAuthenticatedOwner={isAuthenticatedOwner}
            showOwnerIdentityTools={currentUser.role === 'owner'}
            remoteSession={remoteSession}
            authStatus={authStatus}
            pendingTotpEnrollment={pendingTotpEnrollment}
            mfaFactors={mfaFactors}
            mfaAssuranceLevel={mfaAssuranceLevel}
            accountName={accountName}
            onAccountNameChange={setAccountName}
            accountEmail={accountEmail}
            onAccountEmailChange={setAccountEmail}
            passwordResetEmail={passwordResetEmail}
            onPasswordResetEmailChange={setPasswordResetEmail}
            mfaFriendlyName={mfaFriendlyName}
            onMfaFriendlyNameChange={setMfaFriendlyName}
            mfaCode={mfaCode}
            onMfaCodeChange={setMfaCode}
            onSaveName={() => updateCurrentUserName(accountName)}
            onUpdateEmail={() => updateAccountEmail(accountEmail)}
            onSendPasswordReset={() => sendPasswordResetEmail(passwordResetEmail)}
            onLinkOwnerIdentity={linkOwnerIdentity}
            onEnrollTotp={() => enrollTotpMfa(mfaFriendlyName)}
            onVerifyTotp={() => verifyTotpMfa(mfaCode)}
            onRemoveMfaFactor={removeMfaFactor}
            onRefreshMfaState={refreshMfaState}
            onSignOut={signOutRemote}
          />
        );
      case 'groups':
        return (
          <GroupsSharingSection
            currentUserId={currentUser.id}
            joinedGroups={joinedGroups}
            joinedMemberships={joinedMemberships}
            groups={groups}
            organizerGroups={organizerGroups}
            sharePreferences={sharePreferences}
            isAuthenticatedOwner={isAuthenticatedOwner}
            newGroupName={newGroupName}
            onNewGroupNameChange={setNewGroupName}
            joinGroupCode={joinGroupCode}
            onJoinGroupCodeChange={setJoinGroupCode}
            inviteTargetGroupId={inviteTargetGroupId}
            onInviteTargetGroupChange={setInviteTargetGroupId}
            inviteTargetName={inviteTargetName}
            onInviteTargetNameChange={setInviteTargetName}
            inviteAcceptCode={inviteAcceptCode}
            onInviteAcceptCodeChange={setInviteAcceptCode}
            invites={invites}
            sponsoredAccess={sponsoredAccess}
            users={users}
            onCreateGroup={saveGroup}
            onJoinGroup={handleJoinGroup}
            onUpdateSharePreference={updateSharePreference}
            onCreateInvite={sendInvite}
            onAcceptInvite={handleAcceptInvite}
            onRevokeSponsoredAccess={revokeSponsoredAccess}
          />
        );
      case 'subscription':
        return renderSubscription();
      case 'appearance':
        return renderAppearance();
      case 'competitions':
        return (
          <CompetitionsSection
            currentUser={currentUser}
            users={users}
            competitionGroups={competitionGroups}
            competitionSessions={competitionSessions}
            competitionParticipants={competitionParticipants}
            competitionAssignments={competitionAssignments}
            newCompetitionName={newCompetitionName}
            onNewCompetitionNameChange={setNewCompetitionName}
            competitionGroupCount={competitionGroupCount}
            onCompetitionGroupCountChange={setCompetitionGroupCount}
            competitionSessionCount={competitionSessionCount}
            onCompetitionSessionCountChange={setCompetitionSessionCount}
            competitionSchedule={competitionSchedule}
            onCompetitionScheduleChange={(index, next) =>
              setCompetitionSchedule((current) =>
                current.map((entry, entryIndex) => (entryIndex === index ? { ...entry, ...next } : entry))
              )
            }
            competitionJoinCode={competitionJoinCode}
            onCompetitionJoinCodeChange={setCompetitionJoinCode}
            joinedCompetitionList={joinedCompetitionList}
            getDraftForAssignment={getDraftForAssignment}
            onUpdateAssignmentDraft={updateAssignmentDraft}
            onCreateCompetition={saveCompetition}
            onJoinCompetition={handleJoinCompetition}
            onSaveAssignment={saveAssignment}
          />
        );
      case 'myData':
        return (
          <LocalDataSection
            isOwner={currentUser.role === 'owner'}
            cleanupActions={renderCleanupActions(currentUser.id, currentUser.name)}
            onDeleteProfile={deleteCurrentProfile}
          />
        );
      case 'ownerTools':
        return isAuthenticatedOwner ? (
          <OwnerControlsSection
            ownerUser={ownerUser}
            users={users}
            cleanupConfig={cleanupConfig}
            onGrantPowerUser={(userId, userName) => runAdminAction(() => grantPowerUserAccess(userId), `${userName} now has power-user access.`)}
            onStartTrial={(userId, userName) => runAdminAction(() => startTrialForUser(userId), `${userName} now has a 7-day trial.`)}
            onMarkSubscriber={(userId, userName) => runAdminAction(() => markSubscriberAccess(userId), `${userName} is marked as subscribed.`)}
            onResetAccess={(userId, userName) => runAdminAction(() => clearUserAccess(userId), `${userName} was reset to free access.`)}
            onCleanupCategory={handleCleanupCategory}
            onDeleteAngler={(userId, userName) =>
              confirmAdminAction(
                'Delete angler?',
                `This permanently removes ${userName} and all of their saved fishing data from this device.`,
                () => deleteAngler(userId),
                `${userName} was deleted from this device.`
              )
            }
          />
        ) : null;
      default:
        return null;
    }
  };

  return (
    <ScreenBackground>
      <ScrollView
        contentContainerStyle={layout.buildScrollContentStyle({ gap: 12, bottomPadding: 40 })}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader
          title={activeDestination === 'hub' ? 'Access & Billing' : destinationMeta[activeDestination].title}
          subtitle={
            activeDestination === 'hub'
              ? 'Manage your account, groups, access, and competitions from a calmer settings-style hub.'
              : destinationMeta[activeDestination].subtitle
          }
          eyebrow={activeDestination === 'hub' ? 'Utility Center' : 'Access Hub'}
        />
        {activeDestination !== 'hub' ? (
          <ActionGroup>
            <AppButton
              label="Back to Access Hub"
              onPress={() => setActiveDestination('hub')}
              variant="ghost"
              surfaceTone="light"
            />
          </ActionGroup>
        ) : null}
        {renderActiveDestination()}
      </ScrollView>
    </ScreenBackground>
  );
};
