import React from 'react';
import { Pressable, Text, View } from 'react-native';

interface CastCounterProps {
  label: string;
  value: number;
  step: number;
  onIncrement: () => void;
}

export const CastCounter = ({ label, value, step, onIncrement }: CastCounterProps) => (
  <View style={{ gap: 8 }}>
    <Text>{label}: {value}</Text>
    <Pressable onPress={onIncrement} style={{ backgroundColor: '#26547c', padding: 10, borderRadius: 8 }}>
      <Text style={{ color: 'white', fontWeight: '700' }}>+{step} Casts</Text>
    </Pressable>
  </View>
);
