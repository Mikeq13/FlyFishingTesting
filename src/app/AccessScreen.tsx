import React from 'react';
import { Alert, Platform, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { ScreenBackground } from '@/components/ScreenBackground';
import { UserDataCleanupCategory, useAppStore } from './store';
import { getEntitlementLabel, hasPremiumAccess } from '@/engine/entitlementEngine';
import { beginAppleSubscriptionPurchase, PREMIUM_MONTHLY_PRICE_LABEL, PREMIUM_TRIAL_LABEL } from '@/billing/storekit';
import { parseLocalTimeInput } from '@/utils/dateTime';
import { CompetitionSessionRole } from '@/types/group';
import { AppButton } from '@/components/ui/AppButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { StatusBanner } from '@/components/ui/StatusBanner';
import { appTheme } from '@/design/theme';

export const AccessScreen = () => {
  const { width } = useWindowDimensions();
  const {
    users,
    ownerUser,
    currentUser,
    currentEntitlementLabel,
    currentHasPremiumAccess,
    canManageAccess,
    syncStatus,
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
  const contentMaxWidth = Platform.OS === 'web' ? Math.min(width - 24, 980) : undefined;
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

  const renderCleanupActions = (userId: number, userName: string, tone: 'dark' | 'light') => (
    <View style={{ gap: 8 }}>
      {cleanupConfig.map((item) => (
        <Pressable
          key={`${userId}-${item.key}`}
          onPress={() => {
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
                      runAdminAction(
                        () => clearUserDataCategories(userId, ['drafts']),
                        `Draft experiments deleted for ${userName}.`
                      ).catch((error) => {
                        const reason = error instanceof Error ? error.message : 'Please try again.';
                        Alert.alert('Unable to finish action', reason);
                      });
                    }
                  },
                  {
                    text: 'Delete All Experiments',
                    style: 'destructive',
                    onPress: () => {
                      runAdminAction(
                        () => clearUserDataCategories(userId, ['experiments']),
                        `All experiments deleted for ${userName}.`
                      ).catch((error) => {
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
          }}
          style={{
            backgroundColor:
              tone === 'dark'
                ? item.destructive ? '#6c584c' : 'rgba(255,255,255,0.10)'
                : item.destructive ? '#6c584c' : '#e9f5fb',
            padding: 12,
            borderRadius: 12,
            borderWidth: tone === 'dark' && !item.destructive ? 1 : 0,
            borderColor: 'rgba(202,240,248,0.16)'
          }}
        >
          <Text style={{ color: tone === 'dark' || item.destructive ? 'white' : '#102a43', textAlign: 'center', fontWeight: '700' }}>
            {item.label}
          </Text>
        </Pressable>
      ))}
    </View>
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

  return (
    <ScreenBackground>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          padding: 16,
          paddingBottom: 40,
          gap: 12,
          width: '100%',
          alignSelf: 'center',
          maxWidth: contentMaxWidth
        }}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader
          title="Access & Billing"
          subtitle="Manage shared beta sync, premium access, friend groups, and competitions from one place."
          eyebrow="Utility Center"
        />

        <SectionCard title="Current Access" subtitle="Your sync state, remote sign-in, and subscription tools live here.">
          <Text style={{ color: '#f7fdff', fontWeight: '800', fontSize: 22 }}>{currentUser.name}</Text>
          <Text style={{ color: '#bde6f6' }}>Status: {currentEntitlementLabel}</Text>
          <Text style={{ color: '#bde6f6' }}>Premium features: {currentHasPremiumAccess ? 'Enabled' : 'Locked'}</Text>
          <Text style={{ color: '#bde6f6' }}>Sync queue: {syncStatus.pendingCount} pending, {syncStatus.syncedCount} synced</Text>
          <Text style={{ color: '#bde6f6' }}>Sync state: {syncStatus.state}</Text>
          <Text style={{ color: '#bde6f6' }}>Remote auth: {remoteSession?.email ?? 'Not signed in'}</Text>
          <Text style={{ color: '#bde6f6' }}>Shared sync: {isSyncEnabled ? 'Enabled' : 'Waiting for sign-in or env setup'}</Text>
          <Text style={{ color: '#bde6f6' }}>
            Last sync: {syncStatus.lastSyncedAt ? new Date(syncStatus.lastSyncedAt).toLocaleString() : 'Not synced yet'}
          </Text>
          {syncStatus.lastError ? <StatusBanner tone="error" text={`Last sync issue: ${syncStatus.lastError}`} /> : null}
          <Text style={{ color: '#d7f3ff' }}>
            Plan: {PREMIUM_MONTHLY_PRICE_LABEL} with a {PREMIUM_TRIAL_LABEL.toLowerCase()}
          </Text>
          <View style={{ gap: 8 }}>
            <TextInput
              value={authEmail}
              onChangeText={setAuthEmail}
              placeholder="angler@email.com"
              placeholderTextColor="#5a6c78"
              autoCapitalize="none"
              keyboardType="email-address"
              style={{ borderRadius: appTheme.radius.md, padding: 12, backgroundColor: appTheme.colors.inputBg, color: appTheme.colors.textDark }}
            />
            <AppButton
              label={authStatus === 'authenticating' ? 'Sending Magic Link...' : 'Send Magic Link'}
              onPress={() =>
                signInWithMagicLink(authEmail)
                  .then(() =>
                    Alert.alert(
                      'Magic link sent',
                      'Check your email on this device and open the link to finish signing in.'
                    )
                  )
                  .catch((error) =>
                    Alert.alert('Unable to start sign-in', error instanceof Error ? error.message : 'Please try again.')
                  )
              }
              disabled={authStatus === 'authenticating'}
            />
            {remoteSession ? (
              <AppButton
                label="Sign Out of Shared Beta"
                onPress={() =>
                  signOutRemote()
                    .then(() => Alert.alert('Signed out', 'Shared beta sync is now disconnected on this device.'))
                    .catch((error) =>
                      Alert.alert('Unable to sign out', error instanceof Error ? error.message : 'Please try again.')
                    )
                }
                variant="danger"
              />
            ) : null}
            <AppButton
              label="Sync Now"
              onPress={() =>
                flushSyncQueue()
                  .then(() => Alert.alert('Sync complete', 'Pending shared records were pushed to Supabase.'))
                  .catch((error) =>
                    Alert.alert('Unable to sync now', error instanceof Error ? error.message : 'Please try again.')
                  )
              }
              variant="tertiary"
            />
          </View>

          {currentUser.role !== 'owner' && (
            <>
              <AppButton label="Start 7-Day Trial" onPress={() => { runAdminAction(() => startTrialForUser(currentUser.id), '7-day trial started for this account.').catch(console.error); }} />
              <AppButton label="Continue With Apple Subscription" onPress={() => { handlePurchase().catch(console.error); }} variant="secondary" />
            </>
          )}
        </SectionCard>

        <View style={{ gap: 8, backgroundColor: 'rgba(6, 27, 44, 0.72)', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: 'rgba(202,240,248,0.16)' }}>
          <Text style={{ color: '#d7f3ff', fontWeight: '700', fontSize: 16 }}>My Data</Text>
          <Text style={{ color: '#d7f3ff', lineHeight: 20 }}>
            Clean up local fishing data for the active profile without affecting other anglers on this device.
          </Text>
          {renderCleanupActions(currentUser.id, currentUser.name, 'dark')}
          {currentUser.role !== 'owner' ? (
            <Pressable
              onPress={() =>
                confirmAdminAction(
                  'Delete this angler profile?',
                  `This permanently removes ${currentUser.name} and all of their saved fishing data from this device.`,
                  () => deleteAngler(currentUser.id),
                  `${currentUser.name} was deleted from this device.`
                )
              }
              style={{ backgroundColor: '#5b0b0b', padding: 12, borderRadius: 12 }}
            >
              <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Delete My Angler Profile</Text>
            </Pressable>
          ) : (
            <View style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 10 }}>
              <Text style={{ color: '#d7f3ff' }}>
                The owner profile stays in place, but you can still clear its fishing data when you want a fresh start.
              </Text>
            </View>
          )}
        </View>

        <SectionCard title="Groups & Sharing" subtitle="Keep friend sharing useful and easy to understand.">
          <Text style={{ color: '#d7f3ff', lineHeight: 20 }}>
            Create or join a group, then choose what this angler shares with that crew for joint learning.
          </Text>
          <TextInput
            value={newGroupName}
            onChangeText={setNewGroupName}
            placeholder="New group name"
            placeholderTextColor="#5a6c78"
            style={{ borderRadius: appTheme.radius.md, padding: 12, backgroundColor: appTheme.colors.inputBg, color: appTheme.colors.textDark }}
          />
          <AppButton label="Create Group" onPress={() => { saveGroup().catch((error) => Alert.alert('Unable to create group', error instanceof Error ? error.message : 'Please try again.')); }} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              value={joinGroupCode}
              onChangeText={setJoinGroupCode}
              placeholder="Join group code"
              placeholderTextColor="#5a6c78"
              autoCapitalize="characters"
              style={{ flex: 1, borderRadius: appTheme.radius.md, padding: 12, backgroundColor: appTheme.colors.inputBg, color: appTheme.colors.textDark }}
            />
            <View style={{ justifyContent: 'center' }}>
              <AppButton label="Join" onPress={() => { handleJoinGroup().catch((error) => Alert.alert('Unable to join group', error instanceof Error ? error.message : 'Please try again.')); }} variant="secondary" />
            </View>
          </View>

          {joinedGroups.map((group) => {
            const pref = sharePreferences.find((item) => item.groupId === group.id && item.userId === currentUser.id);
            const membership = joinedMemberships.find((item) => item.groupId === group.id);
            return (
              <View key={group.id} style={{ gap: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 12 }}>
                <Text style={{ color: '#f7fdff', fontWeight: '800' }}>{group.name}</Text>
                <Text style={{ color: '#bde6f6' }}>Join code: {group.joinCode} | Role: {membership?.role ?? 'member'}</Text>
                {[
                  ['Journal Entries', 'shareJournalEntries'],
                  ['Practice Sessions', 'sharePracticeSessions'],
                  ['Competition Sessions', 'shareCompetitionSessions'],
                  ['Insights', 'shareInsights']
                ].map(([label, key]) => (
                  <View key={key} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: '#d7f3ff', fontWeight: '700' }}>{label}</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {(['On', 'Off'] as const).map((option) => {
                        const enabled = pref ? pref[key as keyof typeof pref] : false;
                        const selected = option === 'On' ? enabled : !enabled;
                        return (
                          <Pressable
                            key={option}
                            onPress={() =>
                              updateSharePreference(group.id, {
                                shareJournalEntries: pref?.shareJournalEntries ?? false,
                                sharePracticeSessions: pref?.sharePracticeSessions ?? false,
                                shareCompetitionSessions: pref?.shareCompetitionSessions ?? false,
                                shareInsights: pref?.shareInsights ?? false,
                                [key]: option === 'On'
                              } as any).catch((error) =>
                                Alert.alert('Unable to update sharing', error instanceof Error ? error.message : 'Please try again.')
                              )
                            }
                            style={{ backgroundColor: selected ? '#2a9d8f' : 'rgba(255,255,255,0.12)', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999 }}
                          >
                            <Text style={{ color: 'white', fontWeight: '700' }}>{option}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </View>
            );
          })}
        </SectionCard>

        <SectionCard title="Friend Invites & Sponsorship" subtitle="Invite trusted testers into shared learning and manage sponsored power-user access.">
          <Text style={{ color: '#d7f3ff', lineHeight: 20 }}>
            Invite friends into a shared group and automatically sponsor their power-user access for beta testing.
          </Text>
          {joinedGroups.length ? (
            <>
              <Text style={{ color: '#d7f3ff', fontWeight: '700' }}>Invite into Group</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {organizerGroups.map((group) => (
                  <Pressable
                    key={group.id}
                    onPress={() => setInviteTargetGroupId(group.id)}
                    style={{ backgroundColor: inviteTargetGroupId === group.id ? '#2a9d8f' : 'rgba(255,255,255,0.12)', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 999 }}
                  >
                    <Text style={{ color: 'white', fontWeight: '700' }}>{group.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <TextInput
                value={inviteTargetName}
                onChangeText={setInviteTargetName}
                placeholder="Friend name (optional)"
                placeholderTextColor="#5a6c78"
                style={{ borderRadius: appTheme.radius.md, padding: 12, backgroundColor: appTheme.colors.inputBg, color: appTheme.colors.textDark }}
              />
              <AppButton label="Create Invite" onPress={() => { sendInvite().catch((error) => Alert.alert('Unable to create invite', error instanceof Error ? error.message : 'Please try again.')); }} />
            </>
          ) : (
            <Text style={{ color: '#bde6f6' }}>Create or join a friend group first before sending invites.</Text>
          )}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              value={inviteAcceptCode}
              onChangeText={setInviteAcceptCode}
              placeholder="Accept invite code"
              placeholderTextColor="#5a6c78"
              autoCapitalize="characters"
              style={{ flex: 1, borderRadius: appTheme.radius.md, padding: 12, backgroundColor: appTheme.colors.inputBg, color: appTheme.colors.textDark }}
            />
            <View style={{ justifyContent: 'center' }}>
              <AppButton label="Accept" onPress={() => { handleAcceptInvite().catch((error) => Alert.alert('Unable to accept invite', error instanceof Error ? error.message : 'Please try again.')); }} variant="secondary" />
            </View>
          </View>
          {!!invites.length && (
            <View style={{ gap: 8 }}>
              <Text style={{ color: '#f7fdff', fontWeight: '700' }}>Invites</Text>
              {invites.map((invite) => {
                const group = groups.find((entry) => entry.id === invite.targetGroupId);
                const inviter = users.find((entry) => entry.id === invite.inviterUserId);
                return (
                  <View key={invite.id} style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 10, gap: 4 }}>
                    <Text style={{ color: '#f7fdff', fontWeight: '700' }}>{group?.name ?? 'Unknown group'}</Text>
                    <Text style={{ color: '#d7f3ff' }}>Code: {invite.inviteCode}</Text>
                    <Text style={{ color: '#d7f3ff' }}>Inviter: {inviter?.name ?? `Angler ${invite.inviterUserId}`}</Text>
                    <Text style={{ color: '#d7f3ff' }}>Status: {invite.status}</Text>
                  </View>
                );
              })}
            </View>
          )}
          {!!sponsoredAccess.length && (
            <View style={{ gap: 8 }}>
              <Text style={{ color: '#f7fdff', fontWeight: '700' }}>Sponsored Access</Text>
              {sponsoredAccess.map((entry) => {
                const group = groups.find((groupEntry) => groupEntry.id === entry.targetGroupId);
                const sponsor = users.find((user) => user.id === entry.sponsorUserId);
                const sponsored = users.find((user) => user.id === entry.sponsoredUserId);
                return (
                  <View key={entry.id} style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 10, gap: 6 }}>
                    <Text style={{ color: '#f7fdff', fontWeight: '700' }}>{sponsored?.name ?? `Angler ${entry.sponsoredUserId}`}</Text>
                    <Text style={{ color: '#d7f3ff' }}>Sponsor: {sponsor?.name ?? `Angler ${entry.sponsorUserId}`}</Text>
                    <Text style={{ color: '#d7f3ff' }}>Group: {group?.name ?? 'Unknown group'}</Text>
                    <Text style={{ color: '#d7f3ff' }}>Status: {entry.active ? 'Active' : 'Revoked'}</Text>
                    {entry.active && entry.sponsorUserId === currentUser.id ? (
                      <AppButton label="Revoke Sponsored Access" onPress={() => { revokeSponsoredAccess(entry.id).then(() => Alert.alert('Sponsored access revoked', 'The owner-sponsored power-user grant was removed.')).catch((error) => Alert.alert('Unable to revoke access', error instanceof Error ? error.message : 'Please try again.')); }} variant="danger" />
                    ) : null}
                  </View>
                );
              })}
            </View>
          )}
        </SectionCard>

        <SectionCard title="Competitions" subtitle="Set the event clock once, then let anglers join and assignments stay reviewable.">
          <Text style={{ color: '#d7f3ff', lineHeight: 20 }}>
            Competitions now own their own groups and session schedule. Organizers create the event once, anglers join by code, and assignments can be reviewed and corrected before the event starts.
          </Text>
          <>
            <TextInput
              value={newCompetitionName}
              onChangeText={setNewCompetitionName}
              placeholder="Competition name"
              placeholderTextColor="#5a6c78"
              style={{ borderRadius: appTheme.radius.md, padding: 12, backgroundColor: appTheme.colors.inputBg, color: appTheme.colors.textDark }}
            />
            <Text style={{ color: '#d7f3ff', fontWeight: '700' }}>Competition Groups</Text>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {[1, 2, 3, 4].map((count) => (
                <Pressable
                  key={count}
                  onPress={() => setCompetitionGroupCount(String(count))}
                  style={{ backgroundColor: competitionGroupCount === String(count) ? '#2a9d8f' : 'rgba(255,255,255,0.12)', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 999 }}
                >
                  <Text style={{ color: 'white', fontWeight: '700' }}>{count}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={{ color: '#d7f3ff', fontWeight: '700' }}>Total Sessions</Text>
            <TextInput
              value={competitionSessionCount}
              onChangeText={setCompetitionSessionCount}
              keyboardType="number-pad"
              placeholder="Session count"
              placeholderTextColor="#5a6c78"
              style={{ borderRadius: appTheme.radius.md, padding: 12, backgroundColor: appTheme.colors.inputBg, color: appTheme.colors.textDark }}
            />
            <View style={{ gap: 8 }}>
              {competitionSchedule.map((session, index) => (
                <View key={session.sessionNumber} style={{ gap: 6, backgroundColor: appTheme.colors.surfaceMuted, borderRadius: appTheme.radius.md, padding: 12 }}>
                  <Text style={{ color: '#f7fdff', fontWeight: '700' }}>Session {index + 1}</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput
                      value={session.startTime}
                      onChangeText={(value) =>
                        setCompetitionSchedule((current) =>
                          current.map((entry, entryIndex) => (entryIndex === index ? { ...entry, startTime: value } : entry))
                        )
                      }
                      placeholder="08:00"
                      placeholderTextColor="#5a6c78"
                      style={{ flex: 1, borderRadius: appTheme.radius.md, padding: 12, backgroundColor: appTheme.colors.inputBg, color: appTheme.colors.textDark }}
                    />
                    <TextInput
                      value={session.endTime}
                      onChangeText={(value) =>
                        setCompetitionSchedule((current) =>
                          current.map((entry, entryIndex) => (entryIndex === index ? { ...entry, endTime: value } : entry))
                        )
                      }
                      placeholder="11:00"
                      placeholderTextColor="#5a6c78"
                      style={{ flex: 1, borderRadius: appTheme.radius.md, padding: 12, backgroundColor: appTheme.colors.inputBg, color: appTheme.colors.textDark }}
                    />
                  </View>
                </View>
              ))}
            </View>
            <AppButton label="Create Competition" onPress={() => { saveCompetition().catch((error) => Alert.alert('Unable to create competition', error instanceof Error ? error.message : 'Please try again.')); }} />
          </>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              value={competitionJoinCode}
              onChangeText={setCompetitionJoinCode}
              placeholder="Competition join code"
              placeholderTextColor="#5a6c78"
              autoCapitalize="characters"
              style={{ flex: 1, borderRadius: appTheme.radius.md, padding: 12, backgroundColor: appTheme.colors.inputBg, color: appTheme.colors.textDark }}
            />
            <View style={{ justifyContent: 'center' }}>
              <AppButton label="Join" onPress={() => { handleJoinCompetition().catch((error) => Alert.alert('Unable to join competition', error instanceof Error ? error.message : 'Please try again.')); }} variant="secondary" />
            </View>
          </View>

          {joinedCompetitionList.map((competition) => {
            const compGroups = competitionGroups.filter((item) => item.competitionId === competition.id);
            const compSessions = competitionSessions.filter((item) => item.competitionId === competition.id);
            const participants = competitionParticipants.filter((participant) => participant.competitionId === competition.id);
            const assignments = competitionAssignments.filter((assignment) => assignment.competitionId === competition.id);
            return (
              <View key={competition.id} style={{ gap: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 12 }}>
                <Text style={{ color: '#f7fdff', fontWeight: '800' }}>{competition.name}</Text>
                <Text style={{ color: '#bde6f6' }}>Join code: {competition.joinCode}</Text>
                <Text style={{ color: '#bde6f6' }}>Competition groups: {compGroups.map((group) => group.label).join(', ') || 'Not generated yet'}</Text>
                <Text style={{ color: '#d7f3ff' }}>Participants: {participants.length} | Assignments entered: {new Set(assignments.map((assignment) => assignment.userId)).size}</Text>
                <View style={{ gap: 6 }}>
                  {compSessions.map((session) => (
                    <Text key={session.id} style={{ color: '#d7f3ff' }}>
                      Session {session.sessionNumber}: {session.startTime} - {session.endTime}
                    </Text>
                  ))}
                </View>
                <View style={{ gap: 8, marginTop: 4 }}>
                  <Text style={{ color: '#f7fdff', fontWeight: '700' }}>My Assignments</Text>
                  {compSessions.map((session) => {
                    const existingAssignment = assignments.find(
                      (assignment) =>
                        assignment.userId === currentUser.id && assignment.competitionSessionId === session.id
                    );
                    const draft = getDraftForAssignment(competition.id, currentUser.id, session.id, {
                      competitionGroupId: existingAssignment?.competitionGroupId ?? compGroups[0]?.id ?? null,
                      beat: existingAssignment?.beat ?? '',
                      role: existingAssignment?.role ?? 'fishing'
                    });
                    return (
                      <View key={`me-${session.id}`} style={{ gap: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 10 }}>
                        <Text style={{ color: '#d7f3ff', fontWeight: '700' }}>Session {session.sessionNumber}</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                          {compGroups.map((group) => (
                            <Pressable
                              key={group.id}
                              onPress={() => updateAssignmentDraft(competition.id, currentUser.id, session.id, { competitionGroupId: group.id })}
                              style={{ backgroundColor: draft.competitionGroupId === group.id ? '#2a9d8f' : 'rgba(255,255,255,0.12)', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999 }}
                            >
                              <Text style={{ color: 'white', fontWeight: '700' }}>Group {group.label}</Text>
                            </Pressable>
                          ))}
                        </ScrollView>
                        <TextInput
                          value={draft.beat}
                          onChangeText={(value) => updateAssignmentDraft(competition.id, currentUser.id, session.id, { beat: value })}
                          placeholder="Beat / section"
                          placeholderTextColor="#5a6c78"
                          style={{ borderRadius: 12, padding: 12, backgroundColor: 'rgba(245,252,255,0.96)', color: '#102a43' }}
                        />
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          {(['fishing', 'controlling'] as const).map((role) => (
                            <Pressable
                              key={role}
                              onPress={() => updateAssignmentDraft(competition.id, currentUser.id, session.id, { role })}
                              style={{ backgroundColor: draft.role === role ? '#2a9d8f' : 'rgba(255,255,255,0.12)', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999 }}
                            >
                              <Text style={{ color: 'white', fontWeight: '700' }}>{role}</Text>
                            </Pressable>
                          ))}
                        </View>
                        <AppButton label={`Save Session ${session.sessionNumber}`} onPress={() => { saveAssignment(competition.id, currentUser.id, session.id, draft).catch((error) => Alert.alert('Unable to save assignment', error instanceof Error ? error.message : 'Please try again.')); }} variant="tertiary" />
                      </View>
                    );
                  })}
                </View>
                {competition.organizerUserId === currentUser.id ? (
                  <View style={{ gap: 8, marginTop: 6 }}>
                    <Text style={{ color: '#f7fdff', fontWeight: '700' }}>Organizer Review</Text>
                    {participants.map((participant) => {
                      const participantUser = users.find((user) => user.id === participant.userId);
                      return (
                        <View key={participant.id} style={{ gap: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 10 }}>
                          <Text style={{ color: '#f7fdff', fontWeight: '700' }}>{participantUser?.name ?? `Angler ${participant.userId}`}</Text>
                          {compSessions.map((session) => {
                            const existingAssignment = assignments.find(
                              (assignment) =>
                                assignment.userId === participant.userId && assignment.competitionSessionId === session.id
                            );
                            const draft = getDraftForAssignment(competition.id, participant.userId, session.id, {
                              competitionGroupId: existingAssignment?.competitionGroupId ?? compGroups[0]?.id ?? null,
                              beat: existingAssignment?.beat ?? '',
                              role: existingAssignment?.role ?? 'fishing'
                            });
                            return (
                              <View key={`${participant.id}-${session.id}`} style={{ gap: 6 }}>
                                <Text style={{ color: '#d7f3ff', fontWeight: '700' }}>Session {session.sessionNumber}</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                                  {compGroups.map((group) => (
                                    <Pressable
                                      key={group.id}
                                      onPress={() => updateAssignmentDraft(competition.id, participant.userId, session.id, { competitionGroupId: group.id })}
                                      style={{ backgroundColor: draft.competitionGroupId === group.id ? '#2a9d8f' : 'rgba(255,255,255,0.12)', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999 }}
                                    >
                                      <Text style={{ color: 'white', fontWeight: '700' }}>Group {group.label}</Text>
                                    </Pressable>
                                  ))}
                                </ScrollView>
                                <TextInput
                                  value={draft.beat}
                                  onChangeText={(value) => updateAssignmentDraft(competition.id, participant.userId, session.id, { beat: value })}
                                  placeholder="Beat / section"
                                  placeholderTextColor="#5a6c78"
                                  style={{ borderRadius: 12, padding: 12, backgroundColor: 'rgba(245,252,255,0.96)', color: '#102a43' }}
                                />
                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                  {(['fishing', 'controlling'] as const).map((role) => (
                                    <Pressable
                                      key={role}
                                      onPress={() => updateAssignmentDraft(competition.id, participant.userId, session.id, { role })}
                                      style={{ backgroundColor: draft.role === role ? '#2a9d8f' : 'rgba(255,255,255,0.12)', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999 }}
                                    >
                                      <Text style={{ color: 'white', fontWeight: '700' }}>{role}</Text>
                                    </Pressable>
                                  ))}
                                </View>
                                <AppButton label="Save Review Edit" onPress={() => { saveAssignment(competition.id, participant.userId, session.id, draft).catch((error) => Alert.alert('Unable to save assignment', error instanceof Error ? error.message : 'Please try again.')); }} variant="tertiary" />
                              </View>
                            );
                          })}
                        </View>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            );
          })}
        </SectionCard>

        {canManageAccess && (
          <SectionCard title="Owner Controls" subtitle="Keep tester access changes powerful, but easier to scan and safer to use.">
            {ownerUser && (
              <Text style={{ color: '#d7f3ff' }}>
                Admin access is controlled by {ownerUser.name}. You can manage access while testing with any active angler.
              </Text>
            )}
            {users.map((user) => (
              <View
                key={user.id}
                style={{
                  gap: 8,
                  backgroundColor: 'rgba(245,252,255,0.96)',
                  borderRadius: 18,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: 'rgba(202,240,248,0.18)'
                }}
              >
                <Text style={{ color: '#102a43', fontWeight: '800', fontSize: 18 }}>{user.name}</Text>
                <Text style={{ color: '#334e68' }}>Role: {user.role}</Text>
                <Text style={{ color: '#334e68' }}>Access: {getEntitlementLabel(user)}</Text>
                <Text style={{ color: '#334e68' }}>Premium: {hasPremiumAccess(user) ? 'Enabled' : 'Locked'}</Text>

                {user.role === 'owner' ? (
                  <View style={{ backgroundColor: '#e9f5fb', borderRadius: 12, padding: 10 }}>
                    <Text style={{ color: '#102a43', fontWeight: '700' }}>Owner access stays enabled.</Text>
                  </View>
                ) : (
                  <>
                    <AppButton label="Grant Power User" onPress={() => { runAdminAction(() => grantPowerUserAccess(user.id), `${user.name} now has power-user access.`).catch(console.error); }} />
                    <AppButton label="Start 7-Day Trial" onPress={() => { runAdminAction(() => startTrialForUser(user.id), `${user.name} now has a 7-day trial.`).catch(console.error); }} variant="secondary" />
                    <AppButton label="Mark Subscriber" onPress={() => { runAdminAction(() => markSubscriberAccess(user.id), `${user.name} is marked as subscribed.`).catch(console.error); }} variant="tertiary" />
                    <AppButton label="Reset Access" onPress={() => { runAdminAction(() => clearUserAccess(user.id), `${user.name} was reset to free access.`).catch(console.error); }} variant="danger" />
                    {renderCleanupActions(user.id, user.name, 'light')}
                    <AppButton
                      label="Delete Angler"
                      onPress={() =>
                        confirmAdminAction(
                          'Delete angler?',
                          `This permanently removes ${user.name} and all of their saved fishing data from this device.`,
                          () => deleteAngler(user.id),
                          `${user.name} was deleted from this device.`
                        )
                      }
                      variant="danger"
                    />
                  </>
                )}
              </View>
            ))}
          </SectionCard>
        )}
      </ScrollView>
    </ScreenBackground>
  );
};
