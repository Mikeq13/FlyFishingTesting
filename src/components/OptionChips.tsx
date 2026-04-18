import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '@/design/theme';

interface OptionChipsProps<T extends string> {
  label: string;
  options: readonly T[];
  value?: T | null;
  onChange: (value: T) => void;
  tone?: 'dark' | 'light';
  disabled?: boolean;
}

export const OptionChips = <T extends string>({ label, options, value, onChange, tone = 'dark', disabled = false }: OptionChipsProps<T>) => {
  const { theme } = useTheme();

  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: tone === 'light' ? theme.colors.textDark : theme.colors.text, fontWeight: '800' }}>{label}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map((option, index) => (
          <Pressable
            key={`${option}-${index}`}
            onPress={() => {
              if (!disabled) {
                onChange(option);
              }
            }}
            disabled={disabled}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: theme.radius.pill,
              borderWidth: 1,
              borderColor: value === option ? theme.colors.chipSelectedBorder : theme.colors.chipBorder,
              backgroundColor: value === option ? theme.colors.chipSelectedBg : theme.colors.chipBg,
              opacity: disabled ? 0.55 : 1
            }}
          >
            <Text style={{ color: value === option ? theme.colors.chipSelectedText : theme.colors.chipText, fontWeight: '700' }}>{option}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
};
