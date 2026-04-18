import React from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { ScreenBackground } from '@/components/ScreenBackground';
import { UserDataCleanupCategory, useAppStore } from './store';
import { parseLocalTimeInput } from '@/utils/dateTime';
import { CompetitionSessionRole } from '@/types/group';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ActionGroup } from '@/components/ui/ActionGroup';
import { AppButton } from '@/components/ui/AppButton';
import { AccountSecuritySection } from '@/components/access/AccountSecuritySection';
import { SecuritySection } from '@/components/access/SecuritySection';
import { LocalDataSection } from '@/components/access/LocalDataSection';
import { GroupsSharingSection } from '@/components/access/GroupsSharingSection';
import { CompetitionsSection } from '@/components/access/CompetitionsSection';
import { CompetitionOrganizerSection } from '@/components/access/CompetitionOrganizerSection';
import { OwnerControlsSection } from '@/components/access/OwnerControlsSection';
import { RemoteTesterOnboardingSection } from '@/components/access/RemoteTesterOnboardingSection';
import { SectionCard } from '@/components/ui/SectionCard';
import { InlineSummaryRow } from '@/components/ui/InlineSummaryRow';
import { StatusBanner } from '@/components/ui/StatusBanner';
import { OptionChips } from '@/components/OptionChips';
import { useResponsiveLayout } from '@/design/layout';
import { useTheme } from '@/design/theme';
import { getAppSetting, setAppSetting } from '@/db/settingsRepo';

type UtilitySectionKey = 'accountInfo' | 'appearance' | 'billing' | 'competitions' | 'dataManagement' | 'groups' | 'security' | 'powerTools' | 'ownerTools';

const normalizeIdentityEmail = (email?: string | null) => email?.trim().toLowerCase() ?? null;

const getManageableProfileScore = (user: { remoteAuthId?: string | null; email?: string | null; accessLevel: string; id: number }) => {
  const accessRank = user.accessLevel === 'power_user' ? 4 : user.accessLevel === 'trial' ? 3 : user.accessLevel === 'subscriber' ? 2 : 1;
  return (user.remoteAuthId ? 100 : 0) + (normalizeIdentityEmail(user.email) ? 10 : 0) + accessRank - user.id / 100000;
};

const IOS_PREVIEW_LINK_KEY = 'tester_onboarding.iosPreviewLink';
const ANDROID_PREVIEW_LINK_KEY = 'tester_onboarding.androidPreviewLink';
const ACCESS_CODE_KEY = 'tester_onboarding.accessCode';
const ONBOARDING_NOTE_KEY = 'tester_onboarding.note';

export const AccessScreen = ({ navigation }: any) => {
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
    leaveGroup,
    deleteGroup,
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
  const [iosPreviewUrl, setIosPreviewUrl] = React.useState('');
  const [androidPreviewUrl, setAndroidPreviewUrl] = React.useState('');
  const [testerAccessCode, setTesterAccessCode] = React.useState('');
  const [testerOnboardingNote, setTesterOnboardingNote] = React.useState('Install the build for your phone, open the app, create your account, and then redeem the code if one was included.');
  const [accountName, setAccountName] = React.useState(currentUser?.name ?? '');
  const [accountEmail, setAccountEmail] = React.useState(currentUser?.email ?? remoteSession?.email ?? '');
  const [passwordResetEmail, setPasswordResetEmail] = React.useState(currentUser?.email ?? remoteSession?.email ?? '');
  const [mfaFriendlyName, setMfaFriendlyName] = React.useState('Fishing Lab Authenticator');
  const [mfaCode, setMfaCode] = React.useState('');
  const [expandedSections, setExpandedSections] = React.useState<Record<UtilitySectionKey, boolean>>({
    accountInfo: true,
    appearance: false,
    billing: false,
    competitions: false,
    dataManagement: false,
    groups: false,
    security: false,
    powerTools: false,
    ownerTools: false
  });
  const [competitionSchedule, setCompetitionSchedule] = React.useState([
    { sessionNumber: 1, startTime: '08:00', endTime: '11:00' },
    { sessionNumber: 2, startTime: '13:00', endTime: '16:00' },
    { sessionNumber: 3, startTime: '17:00', endTime: '20:00' }
  ]);
  const [assignmentDrafts, setAssignmentDrafts] = React.useState<Record<string, { competitionGroupId: number | null; beat: string; role: CompetitionSessionRole }>>({});
  const [powerToolsSections, setPowerToolsSections] = React.useState({
    competitionOrganizer: false,
    userManagement: false
  });

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
  const canAccessPowerTools = currentUser?.role === 'owner' || currentUser?.accessLevel === 'power_user';
  const organizerCompetitionList = React.useMemo(
    () => competitions.filter((competition) => competition.organizerUserId === currentUser?.id),
    [competitions, currentUser?.id]
  );
  const ownerAuthIdentity = ownerUser?.ownerLinkedAuthId ?? ownerUser?.remoteAuthId ?? null;
  const ownerEmailIdentity = normalizeIdentityEmail(ownerUser?.ownerLinkedEmail ?? ownerUser?.email ?? null);
  const manageableUsers = React.useMemo(() => {
    const deduped = new Map<string, (typeof users)[number]>();

    for (const user of users) {
      if (user.role === 'owner') continue;
      const normalizedEmail = normalizeIdentityEmail(user.email ?? user.ownerLinkedEmail ?? null);
      if ((ownerAuthIdentity && user.remoteAuthId === ownerAuthIdentity) || (ownerEmailIdentity && normalizedEmail === ownerEmailIdentity) || user.id === ownerUser?.id) {
        continue;
      }
      const key = user.remoteAuthId ? `auth:${user.remoteAuthId}` : normalizedEmail ? `email:${normalizedEmail}` : `local:${user.id}`;
      const existing = deduped.get(key);
      if (!existing || getManageableProfileScore(user) > getManageableProfileScore(existing)) {
        deduped.set(key, user);
      }
    }

    return Array.from(deduped.values()).sort((left, right) => left.name.localeCompare(right.name));
  }, [ownerAuthIdentity, ownerEmailIdentity, ownerUser?.id, users]);

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
    let cancelled = false;

    const loadTesterOnboardingSettings = async () => {
      const [savedIosLink, savedAndroidLink, savedAccessCode, savedNote] = await Promise.all([
        getAppSetting(IOS_PREVIEW_LINK_KEY),
        getAppSetting(ANDROID_PREVIEW_LINK_KEY),
        getAppSetting(ACCESS_CODE_KEY),
        getAppSetting(ONBOARDING_NOTE_KEY)
      ]);

      if (cancelled) return;
      setIosPreviewUrl(savedIosLink ?? '');
      setAndroidPreviewUrl(savedAndroidLink ?? '');
      setTesterAccessCode(savedAccessCode ?? '');
      setTesterOnboardingNote(savedNote ?? 'Install the build for your phone, open the app, create your account, and then redeem the code if one was included.');
    };

    loadTesterOnboardingSettings().catch(console.error);

    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (isAuthenticatedOwner) return;
    setExpandedSections((current) => (current.ownerTools ? { ...current, ownerTools: false } : current));
  }, [isAuthenticatedOwner]);

  React.useEffect(() => {
    if (canAccessPowerTools) return;
    setExpandedSections((current) => (current.powerTools ? { ...current, powerTools: false } : current));
  }, [canAccessPowerTools]);

  React.useEffect(() => {
    if (canAccessPowerTools) return;
    setPowerToolsSections({ competitionOrganizer: false, userManagement: false });
  }, [canAccessPowerTools]);

  React.useEffect(() => {
    if (isAuthenticatedOwner) return;
    setPowerToolsSections((current) => (current.userManagement ? { ...current, userManagement: false } : current));
  }, [isAuthenticatedOwner]);

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
              : 'Sign in or select an angler profile before opening Settings.'}
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
    { key: 'groups', label: 'Clear Groups', description: 'Removes groups you own, leaves groups you joined, and clears related sharing or invite records tied to those groups.' },
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

  const renderBilling = () => (
    <>
      <InlineSummaryRow label="Current Plan" value={currentEntitlementLabel} tone="light" />
      <InlineSummaryRow label="Premium Features" value={currentHasPremiumAccess ? 'Enabled' : 'Locked'} valueMuted={!currentHasPremiumAccess} tone="light" />
      <InlineSummaryRow label="Billing Status" value={currentHasPremiumAccess ? 'Premium features available' : 'Free access active'} valueMuted={!currentHasPremiumAccess} tone="light" />
      <Text style={{ color: theme.colors.textDarkSoft, lineHeight: 20 }}>
        Billing is the one place that explains what this account can access right now. Account identity, security, and sync details stay in their own spaces.
      </Text>
    </>
  );

  const renderAppearance = () => (
    <>
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
    </>
  );

  const toggleSection = (key: UtilitySectionKey) => {
    setExpandedSections((current) => ({ ...current, [key]: !current[key] }));
  };

  const togglePowerToolsSection = (key: keyof typeof powerToolsSections) => {
    setPowerToolsSections((current) => ({ ...current, [key]: !current[key] }));
  };

  const saveTesterOnboardingSettings = async () => {
    await Promise.all([
      setAppSetting(IOS_PREVIEW_LINK_KEY, iosPreviewUrl.trim()),
      setAppSetting(ANDROID_PREVIEW_LINK_KEY, androidPreviewUrl.trim()),
      setAppSetting(ACCESS_CODE_KEY, testerAccessCode.trim()),
      setAppSetting(ONBOARDING_NOTE_KEY, testerOnboardingNote.trim())
    ]);
  };

  const renderCollapsibleCard = ({
    sectionKey,
    title,
    subtitle,
    summary,
    children
  }: {
    sectionKey: UtilitySectionKey;
    title: string;
    subtitle: string;
    summary?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <SectionCard title={title} subtitle={subtitle} tone="light">
      {!expandedSections[sectionKey] && summary ? summary : null}
      <Pressable
        onPress={() => toggleSection(sectionKey)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 6
        }}
      >
        <Text style={{ color: theme.colors.textDarkSoft, fontWeight: '700' }}>
          {expandedSections[sectionKey] ? 'Hide details' : 'Show details'}
        </Text>
        <Text style={{ color: theme.colors.textDark, fontSize: 18, fontWeight: '800' }}>
          {expandedSections[sectionKey] ? '-' : '+'}
        </Text>
      </Pressable>
      {expandedSections[sectionKey] ? children : null}
    </SectionCard>
  );

  const renderNestedCollapsibleSection = ({
    title,
    subtitle,
    expanded,
    onToggle,
    children
  }: {
    title: string;
    subtitle: string;
    expanded: boolean;
    onToggle: () => void;
    children: React.ReactNode;
  }) => (
    <View
      style={{
        gap: 8,
        borderRadius: theme.radius.md,
        padding: 12,
        backgroundColor: theme.colors.nestedSurface,
        borderWidth: 1,
        borderColor: theme.colors.nestedSurfaceBorder
      }}
    >
      <Pressable
        onPress={onToggle}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8
        }}
      >
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ color: theme.colors.textDark, fontWeight: '800' }}>{title}</Text>
          <Text style={{ color: theme.colors.textDarkSoft, lineHeight: 18 }}>{subtitle}</Text>
        </View>
        <Text style={{ color: theme.colors.textDark, fontSize: 18, fontWeight: '800' }}>
          {expanded ? '-' : '+'}
        </Text>
      </Pressable>
      {expanded ? children : null}
    </View>
  );

  return (
    <ScreenBackground>
      <ScrollView
        contentContainerStyle={layout.buildScrollContentStyle({ gap: 12, bottomPadding: 40 })}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader
          title="Settings"
          subtitle="Keep account, billing, groups, and fishing preferences in one calmer place without repeating the same details everywhere."
        />
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
        {renderCollapsibleCard({
          sectionKey: 'accountInfo',
          title: 'Account Information',
          subtitle: 'Identity, signed-in email, and access type live here once so the rest of Settings can stay quieter.',
          summary: (
            <Text style={{ color: theme.colors.textDarkSoft, lineHeight: 20 }}>
              {currentUser.name} • {remoteSession?.email ?? 'Not signed in'} • {currentEntitlementLabel}
            </Text>
          ),
          children: (
            <AccountSecuritySection
              currentUserName={currentUser.name}
              currentEntitlementLabel={currentEntitlementLabel}
              remoteSession={remoteSession}
              authStatus={authStatus}
              accountName={accountName}
              onAccountNameChange={setAccountName}
              accountEmail={accountEmail}
              onAccountEmailChange={setAccountEmail}
              onSaveName={() => updateCurrentUserName(accountName)}
              onUpdateEmail={() => updateAccountEmail(accountEmail)}
              embedded
            />
          )
        })}

        {renderCollapsibleCard({
          sectionKey: 'appearance',
          title: 'Appearance',
          subtitle: 'Theme choices for glare, desktop review, and everyday use.',
          summary: (
            <InlineSummaryRow
              label="Current Theme"
              value={themeOptions.find((themeOption) => themeOption.id === themeId)?.label ?? themeOptions[0]?.label ?? 'Default'}
              tone="light"
            />
          ),
          children: renderAppearance()
        })}

        {renderCollapsibleCard({
          sectionKey: 'billing',
          title: 'Billing',
          subtitle: 'Plan details stay here instead of repeating across account and admin tools.',
          summary: (
            <Text style={{ color: theme.colors.textDarkSoft, lineHeight: 20 }}>
              {currentEntitlementLabel} • {currentHasPremiumAccess ? 'Premium features enabled' : 'Free access active'}
            </Text>
          ),
          children: renderBilling()
        })}

        {renderCollapsibleCard({
          sectionKey: 'competitions',
          title: 'Competitions',
          subtitle: 'Join by code, manage your own assignments, and jump into competition-only history.',
          summary: (
            <InlineSummaryRow label="Competition History" value={joinedCompetitionList.length ? 'Open filtered competition results' : 'No competition history yet'} valueMuted={!joinedCompetitionList.length} tone="light" />
          ),
          children: (
            <CompetitionsSection
              currentUser={currentUser}
              competitionGroups={competitionGroups}
              competitionSessions={competitionSessions}
              competitionAssignments={competitionAssignments}
              competitionJoinCode={competitionJoinCode}
              onCompetitionJoinCodeChange={setCompetitionJoinCode}
              joinedCompetitionList={joinedCompetitionList}
              getDraftForAssignment={getDraftForAssignment}
              onUpdateAssignmentDraft={updateAssignmentDraft}
              onJoinCompetition={handleJoinCompetition}
              onSaveAssignment={saveAssignment}
              onOpenCompetitionHistory={() => navigation.navigate('History', { modeFilter: 'competition' })}
              embedded
            />
          )
        })}

        {renderCollapsibleCard({
          sectionKey: 'dataManagement',
          title: 'Data Management',
          subtitle: 'Keep cleanup and profile maintenance tools nearby without leaving them open all the time.',
          summary: <Text style={{ color: theme.colors.textDarkSoft, lineHeight: 20 }}>Cleanup and local profile maintenance for {currentUser.name}.</Text>,
          children: (
            <LocalDataSection
              isOwner={currentUser.role === 'owner'}
              cleanupActions={renderCleanupActions(currentUser.id, currentUser.name)}
              onDeleteProfile={deleteCurrentProfile}
              embedded
            />
          )
        })}

        {renderCollapsibleCard({
          sectionKey: 'groups',
          title: 'Groups',
          subtitle: 'Normal group joining stays here, while owner-managed power-user invites stay clearly separated.',
          summary: (
            <Text style={{ color: theme.colors.textDarkSoft, lineHeight: 20 }}>
              {joinedGroups.length} groups • {organizerGroups.length} organized by you • {isAuthenticatedOwner ? 'owner invites here' : 'owner-only invites'}
            </Text>
          ),
          children: (
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
              onLeaveGroup={leaveGroup}
              onDeleteGroup={deleteGroup}
              embedded
            />
          )
        })}

        {renderCollapsibleCard({
          sectionKey: 'security',
          title: 'Security',
          subtitle: 'Recovery, MFA, sign-out, and owner verification live here instead of inside account details.',
          summary: (
            <Text style={{ color: theme.colors.textDarkSoft, lineHeight: 20 }}>
              {remoteSession?.emailVerifiedAt ? 'Verified email' : authStatus === 'pending_verification' ? 'Email verification pending' : 'Email not verified'} • {mfaFactors.length ? `${mfaFactors.length} MFA factor${mfaFactors.length === 1 ? '' : 's'}` : 'No MFA yet'}
            </Text>
          ),
          children: (
            <SecuritySection
              ownerLinked={ownerIdentityLinked}
              isAuthenticatedOwner={isAuthenticatedOwner}
              showOwnerIdentityTools={currentUser.role === 'owner'}
              remoteSession={remoteSession}
              authStatus={authStatus}
              pendingTotpEnrollment={pendingTotpEnrollment}
              mfaFactors={mfaFactors}
              mfaAssuranceLevel={mfaAssuranceLevel}
              passwordResetEmail={passwordResetEmail}
              onPasswordResetEmailChange={setPasswordResetEmail}
              mfaFriendlyName={mfaFriendlyName}
              onMfaFriendlyNameChange={setMfaFriendlyName}
              mfaCode={mfaCode}
              onMfaCodeChange={setMfaCode}
              onSendPasswordReset={() => sendPasswordResetEmail(passwordResetEmail)}
              onLinkOwnerIdentity={linkOwnerIdentity}
              onEnrollTotp={() => enrollTotpMfa(mfaFriendlyName)}
              onVerifyTotp={() => verifyTotpMfa(mfaCode)}
              onRemoveMfaFactor={removeMfaFactor}
              onRefreshMfaState={refreshMfaState}
              onSignOut={signOutRemote}
              embedded
            />
          )
        })}

        {canAccessPowerTools
          ? renderCollapsibleCard({
              sectionKey: 'powerTools',
              title: 'Power Tools',
              subtitle: 'Competition organization is reserved for owner and power-user sessions so the standard path stays lighter.',
              summary: organizerCompetitionList.length ? (
                <InlineSummaryRow label="Organizer Competitions" value={`${organizerCompetitionList.length}`} tone="light" />
              ) : undefined,
              children: (
                <View style={{ gap: 10 }}>
                  {renderNestedCollapsibleSection({
                    title: 'Competition Organizer',
                    subtitle: 'Create competitions, shape the session schedule, and review assignments without opening a wall of organizer controls.',
                    expanded: powerToolsSections.competitionOrganizer,
                    onToggle: () => togglePowerToolsSection('competitionOrganizer'),
                    children: (
                      <CompetitionOrganizerSection
                        users={users}
                        organizerCompetitions={organizerCompetitionList}
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
                        getDraftForAssignment={getDraftForAssignment}
                        onUpdateAssignmentDraft={updateAssignmentDraft}
                        onCreateCompetition={saveCompetition}
                        onSaveAssignment={saveAssignment}
                        embedded
                      />
                    )
                  })}
                  {renderNestedCollapsibleSection({
                    title: 'User Management',
                    subtitle: isAuthenticatedOwner
                      ? 'Grant power-user access, start trials, reset access, and keep tester install links in one owner-only section.'
                      : 'Only the authenticated owner can manage tester access from here.',
                    expanded: powerToolsSections.userManagement,
                    onToggle: () => togglePowerToolsSection('userManagement'),
                    children: isAuthenticatedOwner ? (
                      <>
                        <OwnerControlsSection
                          ownerUser={ownerUser}
                          manageableUsers={manageableUsers}
                          onGrantPowerUser={(userId, userName) => runAdminAction(() => grantPowerUserAccess(userId), `${userName} now has power-user access.`)}
                          onStartTrial={(userId, userName) => runAdminAction(() => startTrialForUser(userId), `${userName} now has a 7-day trial.`)}
                          onResetAccess={(userId, userName) => runAdminAction(() => clearUserAccess(userId), `${userName} was reset to free access.`)}
                          embedded
                        />
                        <RemoteTesterOnboardingSection
                          iosPreviewUrl={iosPreviewUrl}
                          onIosPreviewUrlChange={setIosPreviewUrl}
                          androidPreviewUrl={androidPreviewUrl}
                          onAndroidPreviewUrlChange={setAndroidPreviewUrl}
                          accessCode={testerAccessCode}
                          onAccessCodeChange={setTesterAccessCode}
                          onboardingNote={testerOnboardingNote}
                          onOnboardingNoteChange={setTesterOnboardingNote}
                          onSave={saveTesterOnboardingSettings}
                        />
                      </>
                    ) : (
                      <Text style={{ color: theme.colors.textDarkSoft, lineHeight: 20 }}>
                        Sign in as the owner account to manage tester access and saved onboarding links.
                      </Text>
                    )
                  })}
                </View>
              )
            })
          : null}
      </ScrollView>
    </ScreenBackground>
  );
};
