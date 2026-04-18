import React from 'react';
import { Text, TextStyle, View, ViewStyle } from 'react-native';
import { AppTheme, appTheme, useTheme } from '@/design/theme';

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
  tone?: 'dark' | 'light';
  children: React.ReactNode;
}) => {
  const { theme } = useTheme();

  return (
    <View style={{ gap: theme.spacing.xs }}>
      <Text style={{ color: tone === 'light' ? theme.colors.textDark : theme.colors.text, fontWeight: '800' }}>{label}</Text>
      {children}
      {error ? <Text style={{ color: theme.colors.errorText }}>{error}</Text> : null}
      {!error && helper ? (
        <Text style={{ color: tone === 'light' ? theme.colors.textDarkSoft : theme.colors.textSoft, lineHeight: 19 }}>
          {helper}
        </Text>
      ) : null}
    </View>
  );
};
