import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '@/design/theme';

interface OptionChipsProps<T extends string> {
  label: string;
  options: readonly T[];
  value?: T | null;
  onChange: (value: T) => void;
}

export const OptionChips = <T extends string>({ label, options, value, onChange }: OptionChipsProps<T>) => {
  const { theme } = useTheme();

  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: theme.colors.text, fontWeight: '800' }}>{label}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map((option) => (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: theme.radius.pill,
              borderWidth: 1,
              borderColor: value === option ? theme.colors.chipSelectedBorder : theme.colors.chipBorder,
              backgroundColor: value === option ? theme.colors.chipSelectedBg : theme.colors.chipBg
            }}
          >
            <Text style={{ color: value === option ? theme.colors.chipSelectedText : theme.colors.chipText, fontWeight: '700' }}>{option}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
};
