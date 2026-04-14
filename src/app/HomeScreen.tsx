import React from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { KeyboardDismissView } from '@/components/KeyboardDismissView';
import { ScreenBackground } from '@/components/ScreenBackground';
import { useAppStore } from './store';

export const HomeScreen = ({ navigation }: any) => {
  const { users, activeUserId, setActiveUserId, addUser, currentEntitlementLabel, currentHasPremiumAccess, currentUser } = useAppStore();
  const activeUser = users.find((u) => u.id === activeUserId);
  const [newUserName, setNewUserName] = React.useState('');
  const [showAnglerList, setShowAnglerList] = React.useState(false);
  const [isCreatingUser, setIsCreatingUser] = React.useState(false);

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

  return (
    <ScreenBackground>
      <KeyboardDismissView>
      <View style={{ flex: 1, justifyContent: 'center', padding: 20, gap: 14 }}>
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
        </View>
        <View style={{ gap: 10, backgroundColor: 'rgba(7, 36, 58, 0.62)', padding: 14, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(202,240,248,0.16)' }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
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
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable onPress={() => navigation.navigate('Session')} style={{ flex: 1, backgroundColor: 'rgba(18,74,112,0.95)', padding: 16, borderRadius: 16 }}>
            <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Start Session</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('History')} style={{ flex: 1, backgroundColor: 'rgba(18,74,112,0.95)', padding: 16, borderRadius: 16 }}>
            <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>View History</Text>
          </Pressable>
        </View>
        {[
          [`View Insights${currentHasPremiumAccess ? '' : ' (Premium)'}`, 'Insights'],
          [`Ask AI Coach${currentHasPremiumAccess ? '' : ' (Premium)'}`, 'Coach'],
          [currentUser?.role === 'owner' ? 'Manage Access' : 'Subscription', 'Access']
        ].map(([label, route]) => (
          <Pressable key={route} onPress={() => navigation.navigate(route)} style={{ backgroundColor: 'rgba(6, 27, 44, 0.72)', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(202,240,248,0.16)' }}>
            <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>{label}</Text>
          </Pressable>
        ))}
      </View>
      </KeyboardDismissView>
    </ScreenBackground>
  );
};

export default HomeScreen;
