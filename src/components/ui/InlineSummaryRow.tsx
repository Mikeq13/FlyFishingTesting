import React from 'react';
import { Text, View } from 'react-native';
import { SurfaceTone, useTheme } from '@/design/theme';

export const InlineSummaryRow = ({
  label,
  value,
  valueMuted = false,
  tone = 'dark'
}: {
  label: string;
  value: string;
  valueMuted?: boolean;
  tone?: SurfaceTone;
}) => {
  const { theme } = useTheme();
  const useThemeElevatedPalette = tone === 'light' && theme.id !== 'daylight_light';
  const labelColor =
    tone === 'modal'
      ? theme.colors.modalTextSoft
      : tone === 'light'
        ? useThemeElevatedPalette
          ? theme.colors.textSoft
          : theme.colors.textDarkSoft
        : theme.colors.textSoft;
  const valueColor =
    tone === 'modal'
      ? valueMuted
        ? theme.colors.modalTextSoft
        : theme.colors.modalText
      : tone === 'light'
        ? useThemeElevatedPalette
          ? valueMuted
            ? theme.colors.textSoft
            : theme.colors.text
          : valueMuted
            ? theme.colors.textDarkSoft
            : theme.colors.textDark
        : valueMuted
          ? theme.colors.textMuted
          : theme.colors.text;

  return (
    <View style={{ gap: 2 }}>
      <Text
        style={{
          color: labelColor,
          fontWeight: '700'
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: valueColor,
          fontWeight: '600'
        }}
      >
        {value}
      </Text>
    </View>
  );
};
