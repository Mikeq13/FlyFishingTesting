import React from 'react';
import { Pressable, Text, View } from 'react-native';

export const HomeScreen = ({ navigation }: any) => (
  <View style={{ flex: 1, justifyContent: 'center', padding: 20, gap: 12 }}>
    <Text style={{ fontSize: 28, fontWeight: '700' }}>Fishing Lab</Text>
    {[
      ['Start Session', 'Session'],
      ['View History', 'History'],
      ['View Insights', 'Insights'],
      ['Ask AI Coach', 'Coach']
    ].map(([label, route]) => (
      <Pressable key={route} onPress={() => navigation.navigate(route)} style={{ backgroundColor: '#264653', padding: 14, borderRadius: 10 }}>
        <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>{label}</Text>
      </Pressable>
    ))}
  </View>
);
