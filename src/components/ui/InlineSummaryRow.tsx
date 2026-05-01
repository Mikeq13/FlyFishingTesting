import React from 'react';
import { Text, YStack } from 'tamagui';
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
  const labelColor =
    tone === 'modal'
      ? theme.colors.modalTextSoft
      : tone === 'light'
        ? theme.colors.textDarkSoft
        : theme.colors.textSoft;
  const valueColor =
    tone === 'modal'
      ? valueMuted
        ? theme.colors.modalTextSoft
        : theme.colors.modalText
      : tone === 'light'
        ? valueMuted
          ? theme.colors.textDarkSoft
          : theme.colors.textDark
        : valueMuted
          ? theme.colors.textMuted
          : theme.colors.text;

  return (
    <YStack style={{ gap: 2 }}>
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
    </YStack>
  );
};
