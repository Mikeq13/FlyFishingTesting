import React from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { KeyboardDismissView } from '@/components/KeyboardDismissView';
import { ScreenBackground } from '@/components/ScreenBackground';
import { AppButton } from '@/components/ui/AppButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { StatusBanner } from '@/components/ui/StatusBanner';
import { useTheme } from '@/design/theme';
import { useAppStore } from './store';
import { SessionMode } from '@/types/session';
import { useResponsiveLayout } from '@/design/layout';

const SESSION_MODE_OPTIONS: Array<{
  mode: SessionMode;
  title: string;
  description: string;
}> = [
  {
    mode: 'experiment',
    title: 'Experiment Journal',
    description: 'Run baseline and test fly experiments with deeper controls, hypotheses, and research-style logging.'
  },
  {
    mode: 'practice',
    title: 'Practice Session',
    description: 'Keep it lightweight for a practice day and get ready for quicker catch logging built around saved flies.'
  },
  {
    mode: 'competition',
    title: 'Competition',
    description: 'Use a comp-focused session flow today, with the data model ready for future shared intel and teammate comparison.'
  }
];

export const HomeScreen = ({ navigation }: any) => {
  const { users, activeUserId, setActiveUserId, addUser, currentEntitlementLabel, currentHasPremiumAccess, currentUser, canManageAccess, syncStatus, sharedDataStatus, notificationPermissionStatus, authStatus, remoteSession } = useAppStore();
  const { theme } = useTheme();
  const layout = useResponsiveLayout();
  const activeUser = users.find((u) => u.id === activeUserId);
  const [newUserName, setNewUserName] = React.useState('');
  const [showAnglerList, setShowAnglerList] = React.useState(false);
  const [isCreatingUser, setIsCreatingUser] = React.useState(false);
  const [showSessionChooser, setShowSessionChooser] = React.useState(false);
  const shouldCenterContent = Platform.OS !== 'web' && !layout.isCompactLayout;
  const contentContainerStyle = layout.buildScrollContentStyle({
    centered: shouldCenterContent,
    gap: 14,
    bottomPadding: 40
  });

  const createAnotherUser = async () => {
    const name = newUserName.trim();
    if (!name) {
      Alert.alert('Angler name needed', 'Enter a name before creating a new angler.');
      return;
    }

    if (users.some((user) => user.name.trim().toLowerCase() === name.toLowerCase())) {
      Alert.alert('Angler already exists', 'Choose a different name so profiles stay easy to recognize.');
      return;
    }

    setIsCreatingUser(true);
    try {
      await addUser(name);
      setNewUserName('');
      setShowAnglerList(false);
      Alert.alert('New profile created', `${name} is now active.`);
    } finally {
      setIsCreatingUser(false);
    }
  };

  const selectUser = async (id: number) => {
    await setActiveUserId(id);
    setShowAnglerList(false);
  };

  const beginSession = (mode: SessionMode) => {
    setShowSessionChooser(false);
    navigation.navigate('Session', { mode });
  };

  return (
    <ScreenBackground>
      <KeyboardDismissView>
      <ScrollView contentContainerStyle={contentContainerStyle} keyboardShouldPersistTaps="handled">
        <ScreenHeader
          title="Fishing Lab"
          subtitle="A fly fishing journal designed to help you improve with insights, coaching, and shared learning."
          eyebrow="On The Water"
        />
        <SectionCard>
          <Text style={{ color: theme.colors.textMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>
            Active Angler
          </Text>
          <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 24 }}>{activeUser?.name ?? 'Loading...'}</Text>
          <Text style={{ color: theme.colors.textSoft }}>Choose a saved angler or create a new profile before you head into a session.</Text>
          <Text style={{ color: theme.colors.textMuted }}>Access: {currentEntitlementLabel}</Text>
          <Text style={{ color: theme.colors.textSoft }}>Premium features: {currentHasPremiumAccess ? 'Enabled' : 'Locked'}</Text>
          <Text style={{ color: theme.colors.textSoft }}>Beta sync queue: {syncStatus.pendingCount} pending</Text>
          <Text style={{ color: theme.colors.textSoft }}>Sync state: {syncStatus.state}</Text>
          <Text style={{ color: theme.colors.textSoft }}>Shared data: {sharedDataStatus}</Text>
          <Text style={{ color: theme.colors.textSoft }}>Notifications: {notificationPermissionStatus}</Text>
          {authStatus === 'authenticating' && !remoteSession ? <StatusBanner tone="info" text="Finish the magic-link sign-in on this device to turn shared beta sync on." /> : null}
          {syncStatus.lastError ? <StatusBanner tone="error" text={`Last sync issue: ${syncStatus.lastError}`} /> : null}
          {notificationPermissionStatus === 'denied' ? <StatusBanner tone="warning" text="Device notifications are turned off, so session reminders will stay in-app only until permissions are restored." /> : null}
        </SectionCard>
        <SectionCard title="Profiles" subtitle="Keep profile switching and session setup quick and clear.">
          <View style={{ flexDirection: layout.stackDirection, gap: 8 }}>
            <View style={{ flex: 1 }}>
              <AppButton label={showAnglerList ? 'Hide Anglers' : 'Choose Angler'} onPress={() => setShowAnglerList((current) => !current)} variant="secondary" />
            </View>
            <View style={{ flex: 1 }}>
              <AppButton label={isCreatingUser ? 'Creating...' : 'Create Angler'} onPress={createAnotherUser} disabled={isCreatingUser} />
            </View>
          </View>

          <TextInput
            value={newUserName}
            onChangeText={setNewUserName}
            placeholder="Enter angler name"
            placeholderTextColor={theme.colors.inputPlaceholder}
            style={{ borderRadius: 12, padding: 12, backgroundColor: theme.colors.inputBg, color: theme.colors.inputText, borderWidth: 1, borderColor: theme.colors.borderStrong }}
          />

          {showAnglerList ? (
            <View style={{ gap: 8 }}>
              {users.map((user) => (
                <Pressable
                  key={user.id}
                  onPress={() => selectUser(user.id)}
                  style={{
                    padding: 12,
                    borderRadius: 14,
                    backgroundColor: user.id === activeUserId ? theme.colors.primary : theme.colors.surfaceMuted,
                    borderWidth: 1,
                    borderColor: user.id === activeUserId ? theme.colors.borderStrong : theme.colors.border
                  }}
                >
                  <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 16 }}>{user.name}</Text>
                  <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                    Added {new Date(user.createdAt).toLocaleDateString()}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </SectionCard>
        <View style={{ flexDirection: layout.stackDirection, gap: 10 }}>
          <View style={{ flex: 1 }}>
            <AppButton label="Start Session" onPress={() => setShowSessionChooser(true)} variant="secondary" />
          </View>
          <View style={{ flex: 1 }}>
            <AppButton label="View History" onPress={() => navigation.navigate('History')} variant="secondary" />
          </View>
        </View>
        {[
          [`View Insights${currentHasPremiumAccess ? '' : ' (Premium)'}`, 'Insights'],
          [`Ask AI Coach${currentHasPremiumAccess ? '' : ' (Premium)'}`, 'Coach'],
          [canManageAccess ? 'Manage Access' : 'Subscription', 'Access']
        ].map(([label, route]) => (
          <AppButton key={route} label={label} onPress={() => navigation.navigate(route)} variant="tertiary" />
        ))}
      </ScrollView>
      </KeyboardDismissView>
      <Modal visible={showSessionChooser} transparent animationType="fade" onRequestClose={() => setShowSessionChooser(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(4, 18, 29, 0.76)', justifyContent: 'center', padding: 20 }}>
          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderRadius: 22,
              padding: 18,
              gap: 12,
              borderWidth: 1,
              borderColor: theme.colors.borderStrong,
              width: '100%',
              maxWidth: layout.modalMaxWidth,
              alignSelf: 'center'
            }}
          >
            <View style={{ gap: 4 }}>
              <Text style={{ color: theme.colors.text, fontSize: 24, fontWeight: '800' }}>What are you doing today?</Text>
              <Text style={{ color: theme.colors.textMuted, lineHeight: 20 }}>
                Choose the session style that best matches today’s water and how you want to log intel.
              </Text>
            </View>

            {SESSION_MODE_OPTIONS.map((option) => (
              <Pressable
                key={option.mode}
                onPress={() => beginSession(option.mode)}
                style={{
                backgroundColor: theme.colors.surfaceMuted,
                borderRadius: 16,
                padding: 14,
                borderWidth: 1,
                borderColor: theme.colors.border,
                gap: 4
              }}
              >
                <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 17 }}>{option.title}</Text>
                <Text style={{ color: theme.colors.textMuted, lineHeight: 19 }}>{option.description}</Text>
              </Pressable>
            ))}

            <AppButton label="Cancel" onPress={() => setShowSessionChooser(false)} variant="ghost" />
          </View>
        </View>
      </Modal>
    </ScreenBackground>
  );
};

export default HomeScreen;
