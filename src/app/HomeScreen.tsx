import React from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { ScreenBackground } from '@/components/ScreenBackground';
import { useAppStore } from './store';

export const HomeScreen = ({ navigation }: any) => {
  const { users, activeUserId, setActiveUserId, addUser } = useAppStore();
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
      <View style={{ flex: 1, justifyContent: 'center', padding: 20, gap: 12 }}>
        <Text style={{ fontSize: 30, fontWeight: '800', color: 'white' }}>Fishing Lab</Text>
        <Text style={{ color: '#dbf5ff', marginBottom: 6 }}>A field notebook that learns how you fish.</Text>
        <Text style={{ color: 'white', fontWeight: '700' }}>Active angler: {activeUser?.name ?? 'Loading...'}</Text>
        <View style={{ gap: 8, backgroundColor: 'rgba(7, 36, 58, 0.45)', padding: 12, borderRadius: 12 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable
              onPress={() => setShowAnglerList((current) => !current)}
              style={{ flex: 1, backgroundColor: 'rgba(38,84,124,0.92)', padding: 10, borderRadius: 10 }}
            >
              <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>
                {showAnglerList ? 'Hide Anglers' : 'Choose Angler'}
              </Text>
            </Pressable>
            <Pressable
              onPress={createAnotherUser}
              disabled={isCreatingUser}
              style={{ flex: 1, backgroundColor: 'rgba(42,157,143,0.92)', padding: 10, borderRadius: 10, opacity: isCreatingUser ? 0.7 : 1 }}
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
            placeholderTextColor="#6c757d"
            style={{ borderRadius: 10, padding: 10, backgroundColor: 'rgba(255,255,255,0.95)' }}
          />

          {showAnglerList ? (
            <View style={{ gap: 8 }}>
              {users.map((user) => (
                <Pressable
                  key={user.id}
                  onPress={() => selectUser(user.id)}
                  style={{
                    padding: 10,
                    borderRadius: 10,
                    backgroundColor: user.id === activeUserId ? 'rgba(42,157,143,0.92)' : 'rgba(255,255,255,0.14)'
                  }}
                >
                  <Text style={{ color: 'white', fontWeight: '700' }}>{user.name}</Text>
                  <Text style={{ color: '#dbf5ff', fontSize: 12 }}>
                    Added {new Date(user.createdAt).toLocaleDateString()}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable onPress={() => navigation.navigate('Session')} style={{ flex: 1, backgroundColor: 'rgba(38,84,124,0.92)', padding: 14, borderRadius: 10 }}>
            <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Start Session</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('History')} style={{ flex: 1, backgroundColor: 'rgba(38,84,124,0.92)', padding: 14, borderRadius: 10 }}>
            <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>View History</Text>
          </Pressable>
        </View>
        {[
          ['View Insights', 'Insights'],
          ['Ask AI Coach', 'Coach']
        ].map(([label, route]) => (
          <Pressable key={route} onPress={() => navigation.navigate(route)} style={{ backgroundColor: 'rgba(38,84,124,0.92)', padding: 14, borderRadius: 10 }}>
            <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </ScreenBackground>
  );
};

export default HomeScreen;
