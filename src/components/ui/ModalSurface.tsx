import React from 'react';
import { ScrollView } from 'react-native';
import { Text, YStack } from 'tamagui';
import { useTheme } from '@/design/theme';
import { useResponsiveLayout } from '@/design/layout';

export const ModalSurface = ({
  title,
  subtitle,
  scrollable = true,
  children
}: {
  title: string;
  subtitle?: string;
  scrollable?: boolean;
  children: React.ReactNode;
}) => {
  const { theme } = useTheme();
  const layout = useResponsiveLayout();
  const maxBodyHeight = Math.min(layout.height * 0.72, layout.height - layout.horizontalPadding * 4);
  const body = scrollable ? (
    <ScrollView
      style={{ maxHeight: maxBodyHeight }}
      contentContainerStyle={{ gap: theme.spacing.md }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    children
  );

  return (
    <YStack style={{ flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'center', padding: layout.horizontalPadding }}>
      <YStack
        style={{
          gap: theme.spacing.md,
          borderWidth: 1,
          borderColor: theme.colors.modalBorder,
          borderRadius: theme.radius.xl,
          padding: theme.spacing.lg,
          backgroundColor: theme.colors.modalSurface,
          width: '100%',
          maxWidth: layout.modalMaxWidth,
          alignSelf: 'center'
        }}
      >
        <YStack style={{ gap: theme.spacing.xs }}>
          <Text style={{ fontWeight: '800', fontSize: 20, color: theme.colors.modalText }}>{title}</Text>
          {subtitle ? <Text style={{ color: theme.colors.modalTextSoft, lineHeight: 20 }}>{subtitle}</Text> : null}
        </YStack>
        {body}
      </YStack>
    </YStack>
  );
};
