import React from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { KeyboardDismissView } from '@/components/KeyboardDismissView';
import { ScreenBackground } from '@/components/ScreenBackground';
import { useAppStore } from './store';
import { SessionMode } from '@/types/session';

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
  const { users, activeUserId, setActiveUserId, addUser, currentEntitlementLabel, currentHasPremiumAccess, currentUser, canManageAccess, syncStatus } = useAppStore();
  const { width } = useWindowDimensions();
  const activeUser = users.find((u) => u.id === activeUserId);
  const [newUserName, setNewUserName] = React.useState('');
  const [showAnglerList, setShowAnglerList] = React.useState(false);
  const [isCreatingUser, setIsCreatingUser] = React.useState(false);
  const [showSessionChooser, setShowSessionChooser] = React.useState(false);
  const isCompactLayout = width < 720;
  const shouldCenterContent = Platform.OS !== 'web' && !isCompactLayout;
  const contentContainerStyle = {
    flexGrow: 1,
    justifyContent: shouldCenterContent ? 'center' as const : 'flex-start' as const,
    padding: 20,
    paddingBottom: 40,
    gap: 14,
    width: '100%' as const,
    alignSelf: 'center' as const,
    maxWidth: Platform.OS === 'web' ? 980 : undefined
  };

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
        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 34, fontWeight: '800', color: '#f7fdff' }}>Fishing Lab</Text>
          <Text style={{ color: '#d7f3ff', fontSize: 16, lineHeight: 22 }}>
            A Fly Fishing Journal designed to help you improve with insights and coaching.
          </Text>
        </View>
        <View
          style={{
            gap: 10,
            backgroundColor: 'rgba(6, 27, 44, 0.72)',
            padding: 16,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: 'rgba(202, 240, 248, 0.18)'
          }}
        >
          <Text style={{ color: '#d7f3ff', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>
            Active Angler
          </Text>
          <Text style={{ color: '#f7fdff', fontWeight: '800', fontSize: 24 }}>{activeUser?.name ?? 'Loading...'}</Text>
          <Text style={{ color: '#bde6f6' }}>Choose a saved angler or create a new profile before you head into a session.</Text>
          <Text style={{ color: '#d7f3ff' }}>Access: {currentEntitlementLabel}</Text>
          <Text style={{ color: '#bde6f6' }}>Premium features: {currentHasPremiumAccess ? 'Enabled' : 'Locked'}</Text>
          <Text style={{ color: '#bde6f6' }}>Beta sync queue: {syncStatus.pendingCount} pending</Text>
          <Text style={{ color: '#bde6f6' }}>Sync state: {syncStatus.state}</Text>
          {syncStatus.lastError ? <Text style={{ color: '#f7b4b4' }}>Last sync issue: {syncStatus.lastError}</Text> : null}
        </View>
        <View style={{ gap: 10, backgroundColor: 'rgba(7, 36, 58, 0.62)', padding: 14, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(202,240,248,0.16)' }}>
          <View style={{ flexDirection: isCompactLayout ? 'column' : 'row', gap: 8 }}>
            <Pressable
              onPress={() => setShowAnglerList((current) => !current)}
              style={{ flex: 1, backgroundColor: 'rgba(29,53,87,0.95)', padding: 12, borderRadius: 12 }}
            >
              <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>
                {showAnglerList ? 'Hide Anglers' : 'Choose Angler'}
              </Text>
            </Pressable>
            <Pressable
              onPress={createAnotherUser}
              disabled={isCreatingUser}
              style={{ flex: 1, backgroundColor: 'rgba(42,157,143,0.96)', padding: 12, borderRadius: 12, opacity: isCreatingUser ? 0.7 : 1 }}
            >
              <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>
                {isCreatingUser ? 'Creating...' : 'Create Angler'}
              </Text>
            </Pressable>
          </View>

          <TextInput
            value={newUserName}
            onChangeText={setNewUserName}
            placeholder="Enter angler name"
            placeholderTextColor="#5a6c78"
            style={{ borderRadius: 12, padding: 12, backgroundColor: 'rgba(245,252,255,0.96)', color: '#102a43' }}
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
                    backgroundColor: user.id === activeUserId ? 'rgba(42,157,143,0.92)' : 'rgba(255,255,255,0.12)',
                    borderWidth: 1,
                    borderColor: user.id === activeUserId ? 'rgba(255,255,255,0.26)' : 'rgba(202,240,248,0.10)'
                  }}
                >
                  <Text style={{ color: '#f7fdff', fontWeight: '700', fontSize: 16 }}>{user.name}</Text>
                  <Text style={{ color: '#dbf5ff', fontSize: 12 }}>
                    Added {new Date(user.createdAt).toLocaleDateString()}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
        <View style={{ flexDirection: isCompactLayout ? 'column' : 'row', gap: 10 }}>
          <Pressable onPress={() => setShowSessionChooser(true)} style={{ flex: 1, backgroundColor: 'rgba(18,74,112,0.95)', padding: 16, borderRadius: 16 }}>
            <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Start Session</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('History')} style={{ flex: 1, backgroundColor: 'rgba(18,74,112,0.95)', padding: 16, borderRadius: 16 }}>
            <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>View History</Text>
          </Pressable>
        </View>
        {[
          [`View Insights${currentHasPremiumAccess ? '' : ' (Premium)'}`, 'Insights'],
          [`Ask AI Coach${currentHasPremiumAccess ? '' : ' (Premium)'}`, 'Coach'],
          [canManageAccess ? 'Manage Access' : 'Subscription', 'Access']
        ].map(([label, route]) => (
          <Pressable key={route} onPress={() => navigation.navigate(route)} style={{ backgroundColor: 'rgba(6, 27, 44, 0.72)', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(202,240,248,0.16)' }}>
            <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>{label}</Text>
          </Pressable>
        ))}
      </ScrollView>
      </KeyboardDismissView>
      <Modal visible={showSessionChooser} transparent animationType="fade" onRequestClose={() => setShowSessionChooser(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(4, 18, 29, 0.76)', justifyContent: 'center', padding: 20 }}>
          <View
            style={{
              backgroundColor: 'rgba(8, 28, 41, 0.96)',
              borderRadius: 22,
              padding: 18,
              gap: 12,
              borderWidth: 1,
              borderColor: 'rgba(202,240,248,0.18)'
            }}
          >
            <View style={{ gap: 4 }}>
              <Text style={{ color: '#f7fdff', fontSize: 24, fontWeight: '800' }}>What are you doing today?</Text>
              <Text style={{ color: '#d7f3ff', lineHeight: 20 }}>
                Choose the session style that best matches today’s water and how you want to log intel.
              </Text>
            </View>

            {SESSION_MODE_OPTIONS.map((option) => (
              <Pressable
                key={option.mode}
                onPress={() => beginSession(option.mode)}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  borderRadius: 16,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: 'rgba(202,240,248,0.14)',
                  gap: 4
                }}
              >
                <Text style={{ color: '#f7fdff', fontWeight: '800', fontSize: 17 }}>{option.title}</Text>
                <Text style={{ color: '#d7f3ff', lineHeight: 19 }}>{option.description}</Text>
              </Pressable>
            ))}

            <Pressable
              onPress={() => setShowSessionChooser(false)}
              style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: 12 }}
            >
              <Text style={{ color: '#f7fdff', textAlign: 'center', fontWeight: '700' }}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScreenBackground>
  );
};

export default HomeScreen;
