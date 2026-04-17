import React from 'react';
import { View } from 'react-native';
import { appTheme } from '@/design/theme';

export const ActionGroup = ({
  direction = 'vertical',
  children
}: {
  direction?: 'vertical' | 'horizontal';
  children: React.ReactNode;
}) => (
  <View
    style={{
      flexDirection: direction === 'horizontal' ? 'row' : 'column',
      gap: appTheme.spacing.sm,
      alignItems: direction === 'horizontal' ? 'stretch' : undefined
    }}
  >
    {children}
  </View>
);
