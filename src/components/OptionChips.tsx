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
    <Text style={{ color: '#f4fbff', fontWeight: '800' }}>{label}</Text>
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
            borderColor: value === option ? '#84d9f4' : 'rgba(255,255,255,0.22)',
            backgroundColor: value === option ? 'rgba(132,217,244,0.28)' : 'rgba(6,28,41,0.5)'
          }}
        >
          <Text style={{ color: '#f4fbff', fontWeight: '700' }}>{option}</Text>
        </Pressable>
      ))}
    </View>
  </View>
);
