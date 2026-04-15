import React from 'react';
import { Pressable, Text, View } from 'react-native';

interface CastCounterProps {
  label: string;
  value: number;
  step: number;
  onIncrement: () => void;
  onDecrement: () => void;
}

export const CastCounter = ({ label, value, step, onIncrement, onDecrement }: CastCounterProps) => (
  <View style={{ gap: 8, flex: 1, minWidth: 0 }}>
    <Text style={{ color: '#f7fdff' }}>{label}: {value}</Text>
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <Pressable onPress={onDecrement} style={{ backgroundColor: '#5c6770', padding: 10, borderRadius: 8, flex: 1 }}>
        <Text style={{ color: 'white', fontWeight: '700', textAlign: 'center' }}>-{step}</Text>
      </Pressable>
      <Pressable onPress={onIncrement} style={{ backgroundColor: '#26547c', padding: 10, borderRadius: 8, flex: 1 }}>
        <Text style={{ color: 'white', fontWeight: '700', textAlign: 'center' }}>+{step}</Text>
      </Pressable>
    </View>
  </View>
);
