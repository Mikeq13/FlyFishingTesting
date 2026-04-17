import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/design/theme';

export const ActionGroup = ({
  direction = 'vertical',
  children
}: {
  direction?: 'vertical' | 'horizontal';
  children: React.ReactNode;
}) => {
  const { theme } = useTheme();

  return (
  <View
    style={{
      flexDirection: direction === 'horizontal' ? 'row' : 'column',
      gap: theme.spacing.sm,
      alignItems: direction === 'horizontal' ? 'stretch' : undefined
    }}
  >
    {children}
  </View>
  );
};
