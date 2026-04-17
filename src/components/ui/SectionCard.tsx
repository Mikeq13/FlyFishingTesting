import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '@/design/theme';

export const SectionCard = ({
  title,
  subtitle,
  tone = 'dark',
  children
}: {
  title?: string;
  subtitle?: string;
  tone?: 'dark' | 'light';
  children: React.ReactNode;
}) => {
  const { theme } = useTheme();

  return (
    <View
      style={{
        gap: theme.spacing.sm,
        backgroundColor: tone === 'dark' ? theme.colors.surface : theme.colors.surfaceLight,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.lg,
        borderWidth: 1,
        borderColor: tone === 'dark' ? theme.colors.border : theme.colors.borderLight
      }}
    >
      {title ? (
        <View style={{ gap: theme.spacing.xs }}>
          <Text
            style={{
              color: tone === 'dark' ? theme.colors.text : theme.colors.textDark,
              fontWeight: '800',
              fontSize: 18
            }}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text style={{ color: tone === 'dark' ? theme.colors.textMuted : theme.colors.textDarkSoft, lineHeight: 20 }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      ) : null}
      {children}
    </View>
  );
};
