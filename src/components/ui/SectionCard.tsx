import React from 'react';
import { Text, YStack } from 'tamagui';
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
  const backgroundColor = tone === 'dark' ? theme.colors.surface : isModalTone ? theme.colors.modalSurfaceAlt : theme.colors.surfaceLight;
  const borderColor = tone === 'dark' ? theme.colors.border : isModalTone ? theme.colors.modalNestedBorder : theme.colors.borderLight;
  const titleColor = tone === 'dark' ? theme.colors.text : isModalTone ? theme.colors.modalText : theme.colors.textDark;
  const subtitleColor = tone === 'dark' ? theme.colors.textMuted : isModalTone ? theme.colors.modalTextSoft : theme.colors.textDarkSoft;

  return (
    <YStack
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
        <YStack style={{ gap: theme.spacing.xs }}>
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
        </YStack>
      ) : null}
      {children}
    </YStack>
  );
};
