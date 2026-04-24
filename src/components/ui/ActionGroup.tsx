import React from 'react';
import { XStack, YStack } from 'tamagui';
import { useTheme } from '@/design/theme';

export const ActionGroup = ({
  direction = 'vertical',
  children
}: {
  direction?: 'vertical' | 'horizontal';
  children: React.ReactNode;
}) => {
  const { theme } = useTheme();

  const Stack = direction === 'horizontal' ? XStack : YStack;

  return (
    <Stack
      style={{
        gap: theme.spacing.sm,
        alignItems: direction === 'horizontal' ? 'stretch' : undefined
      }}
    >
      {children}
    </Stack>
  );
};
