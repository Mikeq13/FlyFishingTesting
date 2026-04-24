import React from 'react';
import { Text, YStack } from 'tamagui';
import { useTheme } from '@/design/theme';

export const ScreenHeader = ({
  title,
  subtitle,
  eyebrow
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
}) => {
  const { theme } = useTheme();

  return (
    <YStack style={{ gap: theme.spacing.xs }}>
      {eyebrow ? (
        <Text
          style={{
            color: theme.colors.textSoft,
            fontSize: 12,
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: 1
          }}
        >
          {eyebrow}
        </Text>
      ) : null}
      <Text style={{ fontSize: 30, fontWeight: '800', color: theme.colors.text }}>{title}</Text>
      {subtitle ? <Text style={{ color: theme.colors.textMuted, lineHeight: 20 }}>{subtitle}</Text> : null}
    </YStack>
  );
};
