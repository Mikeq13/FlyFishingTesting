import React from 'react';
import { Text, TextStyle, View, ViewStyle } from 'react-native';
import { appTheme, useTheme } from '@/design/theme';

export const getFormInputStyle = (): ViewStyle & TextStyle => ({
  borderWidth: 1,
  borderColor: appTheme.colors.borderStrong,
  padding: appTheme.spacing.md,
  borderRadius: appTheme.radius.md,
  backgroundColor: appTheme.colors.inputBg,
  color: appTheme.colors.inputText
});

export const FormField = ({
  label,
  helper,
  error,
  children
}: {
  label: string;
  helper?: string | null;
  error?: string | null;
  children: React.ReactNode;
}) => {
  const { theme } = useTheme();

  return (
    <View style={{ gap: theme.spacing.xs }}>
      <Text style={{ color: theme.colors.text, fontWeight: '800' }}>{label}</Text>
      {children}
      {error ? <Text style={{ color: theme.colors.errorText }}>{error}</Text> : null}
      {!error && helper ? <Text style={{ color: theme.colors.textSoft, lineHeight: 19 }}>{helper}</Text> : null}
    </View>
  );
};
