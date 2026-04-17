import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { appTheme } from '@/design/theme';

interface OptionChipsProps<T extends string> {
  label: string;
  options: readonly T[];
  value?: T | null;
  onChange: (value: T) => void;
}

export const OptionChips = <T extends string>({ label, options, value, onChange }: OptionChipsProps<T>) => (
  <View style={{ gap: 8 }}>
    <Text style={{ color: appTheme.colors.text, fontWeight: '800' }}>{label}</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((option) => (
        <Pressable
          key={option}
          onPress={() => onChange(option)}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: appTheme.radius.pill,
            borderWidth: 1,
            borderColor: value === option ? appTheme.colors.chipSelectedBorder : appTheme.colors.chipBorder,
            backgroundColor: value === option ? appTheme.colors.chipSelectedBg : appTheme.colors.chipBg
          }}
        >
          <Text style={{ color: appTheme.colors.text, fontWeight: '700' }}>{option}</Text>
        </Pressable>
      ))}
    </View>
  </View>
);
