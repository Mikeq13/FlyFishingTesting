import React from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { ScreenBackground } from '@/components/ScreenBackground';
import { useAppStore } from './store';

const HomeScreen = ({ navigation }: any) => {
  const { users, activeUserId, setActiveUserId, addUser } = useAppStore();
  const activeUser = users.find((u) => u.id === activeUserId);

  const cycleUser = () => {
    if (!users.length || !activeUserId) return;
    const idx = users.findIndex((u) => u.id === activeUserId);
    const next = users[(idx + 1) % users.length];
    setActiveUserId(next.id);
  };

  const createAnotherUser = async () => {
    const name = `Angler ${users.length + 1}`;
    const id = await addUser(name);
    setActiveUserId(id);
    Alert.alert('New profile created', `${name} is now active.`);
  };

  return (
    <ScreenBackground>
      <View style={{ flex: 1, justifyContent: 'center', padding: 20, gap: 12 }}>
        <Text style={{ fontSize: 30, fontWeight: '800', color: 'white' }}>Fishing Lab</Text>
        <Text style={{ color: '#dbf5ff', marginBottom: 6 }}>A field notebook that learns how you fish.</Text>
        <Text style={{ color: 'white', fontWeight: '700' }}>Active angler: {activeUser?.name ?? 'Loading...'}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable onPress={cycleUser} style={{ flex: 1, backgroundColor: 'rgba(38,84,124,0.92)', padding: 10, borderRadius: 10 }}>
            <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Switch Angler</Text>
          </Pressable>
          <Pressable onPress={createAnotherUser} style={{ flex: 1, backgroundColor: 'rgba(42,157,143,0.92)', padding: 10, borderRadius: 10 }}>
            <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Create Angler</Text>
          </Pressable>
        </View>
        {[
          ['Start Session', 'Session'],
          ['View History', 'History'],
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