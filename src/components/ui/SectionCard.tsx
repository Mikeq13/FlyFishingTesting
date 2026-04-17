import React from 'react';
import { Text, View } from 'react-native';
import { appTheme } from '@/design/theme';

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
}) => (
  <View
    style={{
      gap: appTheme.spacing.sm,
      backgroundColor: tone === 'dark' ? appTheme.colors.surface : appTheme.colors.surfaceLight,
      borderRadius: appTheme.radius.lg,
      padding: appTheme.spacing.lg,
      borderWidth: 1,
      borderColor: tone === 'dark' ? appTheme.colors.border : 'rgba(202,240,248,0.18)'
    }}
  >
    {title ? (
      <View style={{ gap: appTheme.spacing.xs }}>
        <Text
          style={{
            color: tone === 'dark' ? appTheme.colors.text : appTheme.colors.textDark,
            fontWeight: '800',
            fontSize: 18
          }}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ color: tone === 'dark' ? appTheme.colors.textMuted : appTheme.colors.textDarkSoft, lineHeight: 20 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    ) : null}
    {children}
  </View>
);
