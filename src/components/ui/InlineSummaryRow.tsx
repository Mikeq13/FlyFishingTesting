import React from 'react';
import { Text, View } from 'react-native';
import { appTheme } from '@/design/theme';

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
}) => (
  <View style={{ gap: 2 }}>
    <Text
      style={{
        color: tone === 'light' ? appTheme.colors.textDarkSoft : appTheme.colors.textSoft,
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
              ? appTheme.colors.textDarkSoft
              : appTheme.colors.textDark
            : valueMuted
              ? appTheme.colors.textMuted
              : appTheme.colors.text,
        fontWeight: '600'
      }}
    >
      {value}
    </Text>
  </View>
);
