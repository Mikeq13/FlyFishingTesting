import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '@/design/theme';

export const InlineSummaryRow = ({
  label,
  value,
  valueMuted = false,
  tone = 'dark'
}: {
  label: string;
  value: string;
  valueMuted?: boolean;
  tone?: 'dark' | 'light';
}) => {
  const { theme } = useTheme();

  return (
    <View style={{ gap: 2 }}>
      <Text
        style={{
          color: tone === 'light' ? theme.colors.textDarkSoft : theme.colors.textSoft,
          fontWeight: '700'
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color:
            tone === 'light'
              ? valueMuted
                ? theme.colors.textDarkSoft
                : theme.colors.textDark
              : valueMuted
                ? theme.colors.textMuted
                : theme.colors.text,
          fontWeight: '600'
        }}
      >
        {value}
      </Text>
    </View>
  );
};
