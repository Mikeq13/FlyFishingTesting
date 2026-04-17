import React from 'react';
import { Text, View } from 'react-native';
import { appTheme } from '@/design/theme';

export const ModalSurface = ({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) => (
  <View style={{ flex: 1, backgroundColor: appTheme.colors.overlay, justifyContent: 'center', padding: 20 }}>
    <View
      style={{
        gap: appTheme.spacing.md,
        borderWidth: 1,
        borderColor: appTheme.colors.borderStrong,
        borderRadius: appTheme.radius.xl,
        padding: appTheme.spacing.lg,
        backgroundColor: 'rgba(245,252,255,0.98)'
      }}
    >
      <View style={{ gap: appTheme.spacing.xs }}>
        <Text style={{ fontWeight: '800', fontSize: 20, color: appTheme.colors.textDark }}>{title}</Text>
        {subtitle ? <Text style={{ color: appTheme.colors.textDarkSoft, lineHeight: 20 }}>{subtitle}</Text> : null}
      </View>
      {children}
    </View>
  </View>
);
