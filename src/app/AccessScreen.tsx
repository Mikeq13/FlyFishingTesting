import React from 'react';
import { Alert, Platform, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { ScreenBackground } from '@/components/ScreenBackground';
import { UserDataCleanupCategory, useAppStore } from './store';
import { getEntitlementLabel, hasPremiumAccess } from '@/engine/entitlementEngine';
import { beginAppleSubscriptionPurchase, PREMIUM_MONTHLY_PRICE_LABEL, PREMIUM_TRIAL_LABEL } from '@/billing/storekit';
import { formatLocalDateTimeInput, formatReadableDateTime, parseLocalDateTimeInput } from '@/utils/dateTime';

export const AccessScreen = () => {
  const { width } = useWindowDimensions();
  const {
    users,
    ownerUser,
    currentUser,
    currentEntitlementLabel,
    currentHasPremiumAccess,
    canManageAccess,
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
    competitionParticipants,
    competitionAssignments,
    createGroup,
    joinGroup,
    updateSharePreference,
    createCompetition,
    joinCompetition
  } = useAppStore();
  const contentMaxWidth = Platform.OS === 'web' ? Math.min(width - 24, 980) : undefined;
  const [newGroupName, setNewGroupName] = React.useState('');
  const [joinGroupCode, setJoinGroupCode] = React.useState('');
  const [newCompetitionName, setNewCompetitionName] = React.useState('');
  const [selectedCompetitionGroupId, setSelectedCompetitionGroupId] = React.useState<number | null>(null);
  const [competitionJoinCode, setCompetitionJoinCode] = React.useState('');
  const [competitionStartInput, setCompetitionStartInput] = React.useState(() => formatLocalDateTimeInput(new Date()));
  const [competitionEndInput, setCompetitionEndInput] = React.useState(() => formatLocalDateTimeInput(new Date(Date.now() + 3 * 60 * 60 * 1000)));

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
  const joinedCompetitionList = React.useMemo(
    () =>
      competitionParticipants
        .filter((participant) => participant.userId === currentUser?.id)
        .map((participant) => competitions.find((competition) => competition.id === participant.competitionId))
        .filter((competition): competition is (typeof competitions)[number] => !!competition),
    [competitionParticipants, competitions, currentUser?.id]
  );

  React.useEffect(() => {
    if (!selectedCompetitionGroupId && joinedGroups[0]) {
      setSelectedCompetitionGroupId(joinedGroups[0].id);
    }
  }, [joinedGroups, selectedCompetitionGroupId]);

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
    const parsedStart = parseLocalDateTimeInput(competitionStartInput);
    const parsedEnd = parseLocalDateTimeInput(competitionEndInput);
    if (!newCompetitionName.trim() || !selectedCompetitionGroupId || !parsedStart || !parsedEnd || new Date(parsedEnd) <= new Date(parsedStart)) {
      Alert.alert('Competition details incomplete', 'Enter a name, choose a group, and use valid start/end times.');
      return;
    }
    const created = await createCompetition({
      groupId: selectedCompetitionGroupId,
      name: newCompetitionName.trim(),
      startAt: parsedStart,
      endAt: parsedEnd
    });
    setNewCompetitionName('');
    Alert.alert('Competition created', `${created.name} is ready. Join code: ${created.joinCode}`);
  };

  const handleJoinCompetition = async () => {
    const code = competitionJoinCode.trim();
    if (!code) return;
    await joinCompetition(code);
    setCompetitionJoinCode('');
    Alert.alert('Competition joined', 'Enter your assignment details from the comp website when you start your session.');
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
        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 28, fontWeight: '800', color: '#f7fdff' }}>Access & Billing</Text>
          <Text style={{ color: '#d7f3ff', lineHeight: 20 }}>
            Manage premium access, subscription status, and power-user access from one place.
          </Text>
        </View>

        <View style={{ gap: 8, backgroundColor: 'rgba(6, 27, 44, 0.72)', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: 'rgba(202,240,248,0.16)' }}>
          <Text style={{ color: '#d7f3ff', fontWeight: '700', fontSize: 16 }}>Current Access</Text>
          <Text style={{ color: '#f7fdff', fontWeight: '800', fontSize: 22 }}>{currentUser.name}</Text>
          <Text style={{ color: '#bde6f6' }}>Status: {currentEntitlementLabel}</Text>
          <Text style={{ color: '#bde6f6' }}>Premium features: {currentHasPremiumAccess ? 'Enabled' : 'Locked'}</Text>
          <Text style={{ color: '#d7f3ff' }}>
            Plan: {PREMIUM_MONTHLY_PRICE_LABEL} with a {PREMIUM_TRIAL_LABEL.toLowerCase()}
          </Text>

          {currentUser.role !== 'owner' && (
            <>
              <Pressable onPress={() => runAdminAction(() => startTrialForUser(currentUser.id), '7-day trial started for this account.')} style={{ backgroundColor: '#2a9d8f', padding: 12, borderRadius: 12 }}>
                <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Start 7-Day Trial</Text>
              </Pressable>
              <Pressable onPress={handlePurchase} style={{ backgroundColor: '#1d3557', padding: 12, borderRadius: 12 }}>
                <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Continue With Apple Subscription</Text>
              </Pressable>
            </>
          )}
        </View>

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

        <View style={{ gap: 10, backgroundColor: 'rgba(6, 27, 44, 0.72)', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: 'rgba(202,240,248,0.16)' }}>
          <Text style={{ color: '#d7f3ff', fontWeight: '700', fontSize: 16 }}>Groups & Sharing</Text>
          <Text style={{ color: '#d7f3ff', lineHeight: 20 }}>
            Create or join a group, then choose what this angler shares with that crew for joint learning.
          </Text>
          <TextInput
            value={newGroupName}
            onChangeText={setNewGroupName}
            placeholder="New group name"
            placeholderTextColor="#5a6c78"
            style={{ borderRadius: 12, padding: 12, backgroundColor: 'rgba(245,252,255,0.96)', color: '#102a43' }}
          />
          <Pressable onPress={() => saveGroup().catch((error) => Alert.alert('Unable to create group', error instanceof Error ? error.message : 'Please try again.'))} style={{ backgroundColor: '#2a9d8f', padding: 12, borderRadius: 12 }}>
            <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Create Group</Text>
          </Pressable>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              value={joinGroupCode}
              onChangeText={setJoinGroupCode}
              placeholder="Join group code"
              placeholderTextColor="#5a6c78"
              autoCapitalize="characters"
              style={{ flex: 1, borderRadius: 12, padding: 12, backgroundColor: 'rgba(245,252,255,0.96)', color: '#102a43' }}
            />
            <Pressable onPress={() => handleJoinGroup().catch((error) => Alert.alert('Unable to join group', error instanceof Error ? error.message : 'Please try again.'))} style={{ backgroundColor: '#1d3557', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, justifyContent: 'center' }}>
              <Text style={{ color: 'white', fontWeight: '700' }}>Join</Text>
            </Pressable>
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
        </View>

        <View style={{ gap: 10, backgroundColor: 'rgba(6, 27, 44, 0.72)', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: 'rgba(202,240,248,0.16)' }}>
          <Text style={{ color: '#d7f3ff', fontWeight: '700', fontSize: 16 }}>Competitions</Text>
          <Text style={{ color: '#d7f3ff', lineHeight: 20 }}>
            Organizers create a comp and share the join code. Each angler joins, then enters their own group, beat, and session details from the external draw website.
          </Text>
          {!!joinedGroups.length ? (
            <>
              <TextInput
                value={newCompetitionName}
                onChangeText={setNewCompetitionName}
                placeholder="Competition name"
                placeholderTextColor="#5a6c78"
                style={{ borderRadius: 12, padding: 12, backgroundColor: 'rgba(245,252,255,0.96)', color: '#102a43' }}
              />
              <Text style={{ color: '#d7f3ff', fontWeight: '700' }}>Competition Group</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {joinedGroups.map((group) => (
                  <Pressable
                    key={group.id}
                    onPress={() => setSelectedCompetitionGroupId(group.id)}
                    style={{ backgroundColor: selectedCompetitionGroupId === group.id ? '#2a9d8f' : 'rgba(255,255,255,0.12)', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 999 }}
                  >
                    <Text style={{ color: 'white', fontWeight: '700' }}>{group.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <TextInput value={competitionStartInput} onChangeText={setCompetitionStartInput} placeholder="Start (YYYY-MM-DD HH:MM)" placeholderTextColor="#5a6c78" style={{ borderRadius: 12, padding: 12, backgroundColor: 'rgba(245,252,255,0.96)', color: '#102a43' }} />
              <TextInput value={competitionEndInput} onChangeText={setCompetitionEndInput} placeholder="End (YYYY-MM-DD HH:MM)" placeholderTextColor="#5a6c78" style={{ borderRadius: 12, padding: 12, backgroundColor: 'rgba(245,252,255,0.96)', color: '#102a43' }} />
              <Pressable onPress={() => saveCompetition().catch((error) => Alert.alert('Unable to create competition', error instanceof Error ? error.message : 'Please try again.'))} style={{ backgroundColor: '#2a9d8f', padding: 12, borderRadius: 12 }}>
                <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Create Competition</Text>
              </Pressable>
            </>
          ) : (
            <Text style={{ color: '#bde6f6' }}>Join or create a group first so the competition has a shared roster.</Text>
          )}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              value={competitionJoinCode}
              onChangeText={setCompetitionJoinCode}
              placeholder="Competition join code"
              placeholderTextColor="#5a6c78"
              autoCapitalize="characters"
              style={{ flex: 1, borderRadius: 12, padding: 12, backgroundColor: 'rgba(245,252,255,0.96)', color: '#102a43' }}
            />
            <Pressable onPress={() => handleJoinCompetition().catch((error) => Alert.alert('Unable to join competition', error instanceof Error ? error.message : 'Please try again.'))} style={{ backgroundColor: '#1d3557', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, justifyContent: 'center' }}>
              <Text style={{ color: 'white', fontWeight: '700' }}>Join</Text>
            </Pressable>
          </View>

          {joinedCompetitionList.map((competition) => {
            const group = groups.find((item) => item.id === competition.groupId);
            const participants = competitionParticipants.filter((participant) => participant.competitionId === competition.id);
            const assignments = competitionAssignments.filter((assignment) => assignment.competitionId === competition.id);
            return (
              <View key={competition.id} style={{ gap: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 12 }}>
                <Text style={{ color: '#f7fdff', fontWeight: '800' }}>{competition.name}</Text>
                <Text style={{ color: '#bde6f6' }}>Join code: {competition.joinCode}</Text>
                <Text style={{ color: '#bde6f6' }}>Group: {group?.name ?? 'Unknown group'}</Text>
                <Text style={{ color: '#bde6f6' }}>Window: {formatReadableDateTime(competition.startAt)} to {formatReadableDateTime(competition.endAt)}</Text>
                <Text style={{ color: '#d7f3ff' }}>Participants: {participants.length} | Assignments entered: {new Set(assignments.map((assignment) => assignment.userId)).size}</Text>
              </View>
            );
          })}
        </View>

        {canManageAccess && (
          <View style={{ gap: 10 }}>
            <Text style={{ color: '#f7fdff', fontWeight: '800', fontSize: 20 }}>Owner Controls</Text>
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
                    <Pressable onPress={() => runAdminAction(() => grantPowerUserAccess(user.id), `${user.name} now has power-user access.`)} style={{ backgroundColor: '#2a9d8f', padding: 12, borderRadius: 12 }}>
                      <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Grant Power User</Text>
                    </Pressable>
                    <Pressable onPress={() => runAdminAction(() => startTrialForUser(user.id), `${user.name} now has a 7-day trial.`)} style={{ backgroundColor: '#1d3557', padding: 12, borderRadius: 12 }}>
                      <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Start 7-Day Trial</Text>
                    </Pressable>
                    <Pressable onPress={() => runAdminAction(() => markSubscriberAccess(user.id), `${user.name} is marked as subscribed.`)} style={{ backgroundColor: '#264653', padding: 12, borderRadius: 12 }}>
                      <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Mark Subscriber</Text>
                    </Pressable>
                    <Pressable onPress={() => runAdminAction(() => clearUserAccess(user.id), `${user.name} was reset to free access.`)} style={{ backgroundColor: '#8d0801', padding: 12, borderRadius: 12 }}>
                      <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Reset Access</Text>
                    </Pressable>
                    {renderCleanupActions(user.id, user.name, 'light')}
                    <Pressable
                      onPress={() =>
                        confirmAdminAction(
                          'Delete angler?',
                          `This permanently removes ${user.name} and all of their saved fishing data from this device.`,
                          () => deleteAngler(user.id),
                          `${user.name} was deleted from this device.`
                        )
                      }
                      style={{ backgroundColor: '#5b0b0b', padding: 12, borderRadius: 12 }}
                    >
                      <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Delete Angler</Text>
                    </Pressable>
                  </>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </ScreenBackground>
  );
};
