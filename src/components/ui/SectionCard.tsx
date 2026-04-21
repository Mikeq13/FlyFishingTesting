import React from 'react';
import { Text, View } from 'react-native';
import { SurfaceTone, useTheme } from '@/design/theme';

export const SectionCard = ({
  title,
  subtitle,
  tone = 'dark',
  children
}: {
  title?: string;
  subtitle?: string;
  tone?: SurfaceTone;
  children: React.ReactNode;
}) => {
  const { theme } = useTheme();
  const isModalTone = tone === 'modal';
  const isLightTone = tone === 'light';
  const useThemeElevatedPalette = isLightTone && theme.id !== 'daylight_light';
  const backgroundColor = tone === 'dark' ? theme.colors.surface : isModalTone ? theme.colors.modalSurfaceAlt : useThemeElevatedPalette ? theme.colors.surfaceAlt : theme.colors.surfaceLight;
  const borderColor = tone === 'dark' ? theme.colors.border : isModalTone ? theme.colors.modalNestedBorder : useThemeElevatedPalette ? theme.colors.borderStrong : theme.colors.borderLight;
  const titleColor = tone === 'dark' ? theme.colors.text : isModalTone ? theme.colors.modalText : useThemeElevatedPalette ? theme.colors.text : theme.colors.textDark;
  const subtitleColor = tone === 'dark' ? theme.colors.textMuted : isModalTone ? theme.colors.modalTextSoft : useThemeElevatedPalette ? theme.colors.textSoft : theme.colors.textDarkSoft;

  return (
    <View
      style={{
        gap: theme.spacing.sm,
        backgroundColor,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.lg,
        borderWidth: 1,
        borderColor
      }}
    >
      {title ? (
        <View style={{ gap: theme.spacing.xs }}>
          <Text
            style={{
              color: titleColor,
              fontWeight: '800',
              fontSize: 18
            }}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text style={{ color: subtitleColor, lineHeight: 20 }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      ) : null}
      {children}
    </View>
  );
};
