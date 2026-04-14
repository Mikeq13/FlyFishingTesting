import React from 'react';
import { Pressable, Text, View } from 'react-native';

interface OptionChipsProps<T extends string> {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
}

export const OptionChips = <T extends string>({ label, options, value, onChange }: OptionChipsProps<T>) => (
  <View style={{ gap: 8 }}>
    <Text style={{ color: 'white', fontWeight: '700' }}>{label}</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((option) => (
        <Pressable
          key={option}
          onPress={() => onChange(option)}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: value === option ? '#2a9d8f' : 'rgba(255,255,255,0.3)',
            backgroundColor: value === option ? 'rgba(42,157,143,0.22)' : 'rgba(255,255,255,0.08)'
          }}
        >
          <Text style={{ color: 'white', fontWeight: '600' }}>{option}</Text>
        </Pressable>
      ))}
    </View>
  </View>
);
