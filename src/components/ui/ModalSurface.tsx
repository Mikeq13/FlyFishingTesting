import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '@/design/theme';
import { useResponsiveLayout } from '@/design/layout';

export const ModalSurface = ({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) => {
  const { theme } = useTheme();
  const layout = useResponsiveLayout();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'center', padding: layout.horizontalPadding }}>
      <View
        style={{
          gap: theme.spacing.md,
          borderWidth: 1,
          borderColor: theme.colors.borderStrong,
          borderRadius: theme.radius.xl,
          padding: theme.spacing.lg,
          backgroundColor: theme.colors.modalSurface,
          width: '100%',
          maxWidth: layout.modalMaxWidth,
          alignSelf: 'center'
        }}
      >
        <View style={{ gap: theme.spacing.xs }}>
          <Text style={{ fontWeight: '800', fontSize: 20, color: theme.colors.textDark }}>{title}</Text>
          {subtitle ? <Text style={{ color: theme.colors.textDarkSoft, lineHeight: 20 }}>{subtitle}</Text> : null}
        </View>
        {children}
      </View>
    </View>
  );
};
