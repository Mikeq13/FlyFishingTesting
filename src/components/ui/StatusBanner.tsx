import React from 'react';
import { Text, View } from 'react-native';
import { appTheme } from '@/design/theme';

export const StatusBanner = ({
  tone = 'warning',
  text
}: {
  tone?: 'warning' | 'success' | 'error' | 'info';
  text: string;
}) => {
  const palette =
    tone === 'success'
      ? {
          backgroundColor: appTheme.colors.successBg,
          borderColor: appTheme.colors.successBorder,
          color: appTheme.colors.successText
        }
      : tone === 'error'
        ? {
            backgroundColor: appTheme.colors.errorBg,
            borderColor: appTheme.colors.errorBorder,
            color: appTheme.colors.errorText
          }
        : tone === 'info'
          ? {
              backgroundColor: 'rgba(132,217,244,0.18)',
              borderColor: 'rgba(132,217,244,0.34)',
              color: appTheme.colors.text
            }
          : {
              backgroundColor: appTheme.colors.warningBg,
              borderColor: appTheme.colors.warningBorder,
              color: appTheme.colors.warningText
            };

  return (
    <View
      style={{
        backgroundColor: palette.backgroundColor,
        borderRadius: appTheme.radius.md,
        padding: appTheme.spacing.md,
        borderWidth: 1,
        borderColor: palette.borderColor
      }}
    >
      <Text style={{ color: palette.color, fontWeight: '800' }}>{text}</Text>
    </View>
  );
};
