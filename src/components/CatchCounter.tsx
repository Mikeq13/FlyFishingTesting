import React from 'react';
import { Pressable, Text, View } from 'react-native';

export const CatchCounter = ({ label, value, onIncrement }: { label: string; value: number; onIncrement: () => void }) => (
  <View style={{ gap: 8 }}>
    <Text>{label}: {value}</Text>
    <Pressable onPress={onIncrement} style={{ backgroundColor: '#2a9d8f', padding: 10, borderRadius: 8 }}>
      <Text style={{ color: 'white', fontWeight: '700' }}>+ Catch</Text>
    </Pressable>
  </View>
);
