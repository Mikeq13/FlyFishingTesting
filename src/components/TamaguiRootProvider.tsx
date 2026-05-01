import React from 'react';
import { PortalProvider } from '@tamagui/portal';
import { TamaguiProvider, Theme as TamaguiTheme } from 'tamagui';
import { useTheme } from '@/design/theme';
import tamaguiConfig from '@/design/tamagui.config';

export const TamaguiRootProvider = ({ children }: { children: React.ReactNode }) => {
  const { themeId } = useTheme();

  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme={themeId}>
      <PortalProvider shouldAddRootHost={false}>
        <TamaguiTheme name={themeId}>{children}</TamaguiTheme>
      </PortalProvider>
    </TamaguiProvider>
  );
};

