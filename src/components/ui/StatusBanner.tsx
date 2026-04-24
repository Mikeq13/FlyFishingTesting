import React from 'react';
import { Text, YStack } from 'tamagui';
import { useTheme } from '@/design/theme';

export const StatusBanner = ({
  tone = 'warning',
  text
}: {
  tone?: 'warning' | 'success' | 'error' | 'info';
  text: string;
}) => {
  const { theme } = useTheme();
  const palette =
    tone === 'success'
      ? {
          backgroundColor: theme.colors.successBg,
          borderColor: theme.colors.successBorder,
          color: theme.colors.successText
        }
      : tone === 'error'
        ? {
            backgroundColor: theme.colors.errorBg,
            borderColor: theme.colors.errorBorder,
            color: theme.colors.errorText
          }
        : tone === 'info'
          ? {
              backgroundColor: theme.colors.infoBg,
              borderColor: theme.colors.infoBorder,
              color: theme.colors.infoText
            }
          : {
              backgroundColor: theme.colors.warningBg,
              borderColor: theme.colors.warningBorder,
              color: theme.colors.warningText
            };

  return (
    <YStack
      style={{
        backgroundColor: palette.backgroundColor,
        borderRadius: theme.radius.md,
        padding: theme.spacing.md,
        borderWidth: 1,
        borderColor: palette.borderColor
      }}
    >
      <Text style={{ color: palette.color, fontWeight: '800', lineHeight: 20 }}>{text}</Text>
    </YStack>
  );
};
