import React from 'react';
import { TextStyle, ViewStyle } from 'react-native';
import { Text, YStack } from 'tamagui';
import { AppTheme, appTheme, SurfaceTone, useTheme } from '@/design/theme';

export const getFormInputStyle = (themeOverride?: AppTheme): ViewStyle & TextStyle => {
  const resolvedTheme = themeOverride ?? appTheme;

  return {
    borderWidth: 1,
    borderColor: resolvedTheme.colors.borderStrong,
    padding: resolvedTheme.spacing.md,
    borderRadius: resolvedTheme.radius.md,
    backgroundColor: resolvedTheme.colors.inputBg,
    color: resolvedTheme.colors.inputText
  };
};

export const FormField = ({
  label,
  helper,
  error,
  tone = 'dark',
  children
}: {
  label: string;
  helper?: string | null;
  error?: string | null;
  tone?: SurfaceTone;
  children: React.ReactNode;
}) => {
  const { theme } = useTheme();
  const labelColor = tone === 'modal' ? theme.colors.modalText : tone === 'light' ? theme.colors.textDark : theme.colors.text;
  const helperColor = tone === 'modal' ? theme.colors.modalTextSoft : tone === 'light' ? theme.colors.textDarkSoft : theme.colors.textSoft;

  return (
    <YStack style={{ gap: theme.spacing.xs }}>
      <Text style={{ color: labelColor, fontWeight: '800' }}>{label}</Text>
      {children}
      {error ? <Text style={{ color: theme.colors.errorText }}>{error}</Text> : null}
      {!error && helper ? (
        <Text style={{ color: helperColor, lineHeight: 19 }}>
          {helper}
        </Text>
      ) : null}
    </YStack>
  );
};
