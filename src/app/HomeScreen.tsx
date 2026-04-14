import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { ScreenBackground } from '@/components/ScreenBackground';

export const HomeScreen = ({ navigation }: any) => (
  <ScreenBackground>
    <View style={{ flex: 1, justifyContent: 'center', padding: 20, gap: 12 }}>
      <Text style={{ fontSize: 30, fontWeight: '800', color: 'white' }}>Fishing Lab</Text>
      <Text style={{ color: '#dbf5ff', marginBottom: 8 }}>A field notebook that learns how you fish.</Text>
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
