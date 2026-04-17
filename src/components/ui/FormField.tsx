import React from 'react';
import { Text, TextStyle, View, ViewStyle } from 'react-native';
import { appTheme } from '@/design/theme';

export const formInputStyle: ViewStyle & TextStyle = {
  borderWidth: 1,
  borderColor: appTheme.colors.borderStrong,
  padding: appTheme.spacing.md,
  borderRadius: appTheme.radius.md,
  backgroundColor: appTheme.colors.inputBg,
  color: appTheme.colors.textDark
};

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
}) => (
  <View style={{ gap: appTheme.spacing.xs }}>
    <Text style={{ color: appTheme.colors.text, fontWeight: '800' }}>{label}</Text>
    {children}
    {error ? <Text style={{ color: '#fca5a5' }}>{error}</Text> : null}
    {!error && helper ? <Text style={{ color: appTheme.colors.textSoft, lineHeight: 19 }}>{helper}</Text> : null}
  </View>
);
