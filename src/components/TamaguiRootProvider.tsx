import React from 'react';
import { TamaguiProvider, Theme as TamaguiTheme } from 'tamagui';
import { useTheme } from '@/design/theme';
import tamaguiConfig from '@/design/tamagui.config';

export const TamaguiRootProvider = ({ children }: { children: React.ReactNode }) => {
  const { themeId } = useTheme();

  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme={themeId}>
      <TamaguiTheme name={themeId}>{children}</TamaguiTheme>
    </TamaguiProvider>
  );
};

