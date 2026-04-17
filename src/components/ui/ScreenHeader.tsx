import React from 'react';
import { Text, View } from 'react-native';
import { appTheme } from '@/design/theme';

export const ScreenHeader = ({
  title,
  subtitle,
  eyebrow
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
}) => (
  <View style={{ gap: appTheme.spacing.xs }}>
    {eyebrow ? (
      <Text
        style={{
          color: appTheme.colors.textSoft,
          fontSize: 12,
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: 1
        }}
      >
        {eyebrow}
      </Text>
    ) : null}
    <Text style={{ fontSize: 30, fontWeight: '800', color: appTheme.colors.text }}>{title}</Text>
    {subtitle ? <Text style={{ color: appTheme.colors.textMuted, lineHeight: 20 }}>{subtitle}</Text> : null}
  </View>
);
