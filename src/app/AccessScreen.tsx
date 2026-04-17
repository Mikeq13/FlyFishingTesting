import React from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { ScreenBackground } from '@/components/ScreenBackground';
import { UserDataCleanupCategory, useAppStore } from './store';
import { beginAppleSubscriptionPurchase, PREMIUM_MONTHLY_PRICE_LABEL, PREMIUM_TRIAL_LABEL } from '@/billing/storekit';
import { parseLocalTimeInput } from '@/utils/dateTime';
import { CompetitionSessionRole } from '@/types/group';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ActionGroup } from '@/components/ui/ActionGroup';
import { AppButton } from '@/components/ui/AppButton';
import { AccessStatusSection } from '@/components/access/AccessStatusSection';
import { LocalDataSection } from '@/components/access/LocalDataSection';
import { GroupsSharingSection } from '@/components/access/GroupsSharingSection';
import { InvitesSponsorshipSection } from '@/components/access/InvitesSponsorshipSection';
import { CompetitionsSection } from '@/components/access/CompetitionsSection';
import { OwnerControlsSection } from '@/components/access/OwnerControlsSection';
import { BetaReadinessSection } from '@/components/access/BetaReadinessSection';
import { SectionCard } from '@/components/ui/SectionCard';
import { StatusBanner } from '@/components/ui/StatusBanner';
import { OptionChips } from '@/components/OptionChips';
import { useResponsiveLayout } from '@/design/layout';
import { useTheme } from '@/design/theme';

export const AccessScreen = () => {
  const layout = useResponsiveLayout();
  const { theme, themeId, setThemeId, themeOptions } = useTheme();
  const {
    users,
    ownerUser,
    currentUser,
    currentEntitlementLabel,
    currentHasPremiumAccess,
    canManageAccess,
    syncStatus,
    sharedDataStatus,
    notificationPermissionStatus,
    authStatus,
    remoteSession,
    isSyncEnabled,
    invites,
    sponsoredAccess,
    signInWithMagicLink,
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
    revokeSponsoredAccess,
    flushSyncQueue
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
  const [authEmail, setAuthEmail] = React.useState(currentUser?.email ?? '');
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
    setAuthEmail(currentUser?.email ?? '');
  }, [currentUser?.email]);

  if (!currentUser) {
    return (
      <ScreenBackground>
        <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
          <Text style={{ color: '#f7fdff', textAlign: 'center' }}>No active user selected.</Text>
        </View>
      </ScreenBackground>
    );
  }

  const handlePurchase = async () => {
    const result = await beginAppleSubscriptionPurchase();
    if (!result.ok) {
      Alert.alert('Apple subscription not ready yet', result.reason);
      return;
    }

    await markSubscriberAccess(currentUser.id);
    Alert.alert('Premium unlocked', result.message);
  };

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

  return (
    <ScreenBackground>
      <ScrollView
        contentContainerStyle={layout.buildScrollContentStyle({ gap: 12, bottomPadding: 40 })}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader
          title="Access & Billing"
          subtitle="Manage shared beta sync, premium access, friend groups, and competitions from one place."
          eyebrow="Utility Center"
        />
        <AccessStatusSection
          currentUserName={currentUser.name}
          currentEntitlementLabel={currentEntitlementLabel}
          currentHasPremiumAccess={currentHasPremiumAccess}
          syncStatus={syncStatus}
          sharedDataStatus={sharedDataStatus}
          notificationPermissionStatus={notificationPermissionStatus}
          remoteSession={remoteSession}
          isSyncEnabled={isSyncEnabled}
          authStatus={authStatus}
          authEmail={authEmail}
          onAuthEmailChange={setAuthEmail}
          onSendMagicLink={() => signInWithMagicLink(authEmail)}
          onSignOut={signOutRemote}
          onSyncNow={flushSyncQueue}
          showPremiumActions={currentUser.role !== 'owner'}
          onStartTrial={() => runAdminAction(() => startTrialForUser(currentUser.id), '7-day trial started for this account.')}
          onContinueWithApple={handlePurchase}
          currentUserRole={currentUser.role}
        />

        <BetaReadinessSection
          authStatus={authStatus}
          remoteSession={remoteSession}
          sharedDataStatus={sharedDataStatus}
          syncStatus={syncStatus}
          notificationPermissionStatus={notificationPermissionStatus}
        />

        <SectionCard title="Appearance" subtitle="Choose the look that best matches recruiter demos, outdoor readability, or long web review sessions." tone="light">
          <OptionChips
            label="App Theme"
            options={themeOptions.map((theme) => theme.label)}
            value={themeOptions.find((theme) => theme.id === themeId)?.label ?? themeOptions[0]?.label}
            tone="light"
            onChange={(value) => {
              const selectedTheme = themeOptions.find((theme) => theme.label === value);
              if (selectedTheme) {
                setThemeId(selectedTheme.id);
              }
            }}
          />
          <Text style={{ color: theme.colors.textDarkSoft, lineHeight: 20 }}>
            `Default Professional` is the recruiter-facing default, `High Contrast` is best outside, and `Daylight Light` is easiest to review on web or desktop.
          </Text>
          <StatusBanner tone="info" text="For the cleanest recruiter demo, use Default Professional or Daylight Light. High Contrast is the fastest truth test when a screen still feels too subtle." />
        </SectionCard>

        <LocalDataSection
          isOwner={currentUser.role === 'owner'}
          cleanupActions={renderCleanupActions(currentUser.id, currentUser.name)}
          onDeleteProfile={deleteCurrentProfile}
        />

        <GroupsSharingSection
          currentUserId={currentUser.id}
          joinedGroups={joinedGroups}
          joinedMemberships={joinedMemberships}
          sharePreferences={sharePreferences}
          newGroupName={newGroupName}
          onNewGroupNameChange={setNewGroupName}
          joinGroupCode={joinGroupCode}
          onJoinGroupCodeChange={setJoinGroupCode}
          onCreateGroup={saveGroup}
          onJoinGroup={handleJoinGroup}
          onUpdateSharePreference={updateSharePreference}
        />

        <InvitesSponsorshipSection
          currentUserId={currentUser.id}
          joinedGroups={joinedGroups}
          organizerGroups={organizerGroups}
          inviteTargetGroupId={inviteTargetGroupId}
          onInviteTargetGroupChange={setInviteTargetGroupId}
          inviteTargetName={inviteTargetName}
          onInviteTargetNameChange={setInviteTargetName}
          inviteAcceptCode={inviteAcceptCode}
          onInviteAcceptCodeChange={setInviteAcceptCode}
          invites={invites}
          sponsoredAccess={sponsoredAccess}
          groups={groups}
          users={users}
          onCreateInvite={sendInvite}
          onAcceptInvite={handleAcceptInvite}
          onRevokeSponsoredAccess={revokeSponsoredAccess}
        />

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

        {canManageAccess ? (
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
        ) : null}
      </ScrollView>
    </ScreenBackground>
  );
};
