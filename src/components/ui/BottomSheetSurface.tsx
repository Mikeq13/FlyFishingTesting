import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '@/design/theme';
import { useResponsiveLayout } from '@/design/layout';

export const BottomSheetSurface = ({
  title,
  subtitle,
  onClose,
  children
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) => {
  const { theme } = useTheme();
  const layout = useResponsiveLayout();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.overlay,
        justifyContent: 'flex-end'
      }}
    >
      <Pressable style={{ flex: 1 }} onPress={onClose} />
      <View
        style={{
          gap: theme.spacing.md,
          borderTopLeftRadius: theme.radius.xl,
          borderTopRightRadius: theme.radius.xl,
          borderWidth: 1,
          borderColor: theme.colors.borderStrong,
          padding: theme.spacing.lg,
          paddingBottom: theme.spacing.xl,
          backgroundColor: theme.colors.modalSurface,
          width: '100%',
          alignSelf: 'center',
          maxWidth: layout.modalMaxWidth
        }}
      >
        <View
          style={{
            width: 48,
            height: 4,
            borderRadius: theme.radius.pill,
            backgroundColor: theme.colors.borderStrong,
            alignSelf: 'center'
          }}
        />
        <View style={{ gap: theme.spacing.xs }}>
          <Text style={{ fontWeight: '800', fontSize: 20, color: theme.colors.textDark }}>{title}</Text>
          {subtitle ? <Text style={{ color: theme.colors.textDarkSoft, lineHeight: 20 }}>{subtitle}</Text> : null}
        </View>
        {children}
      </View>
    </View>
  );
};
