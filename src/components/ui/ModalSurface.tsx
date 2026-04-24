import React from 'react';
import { ScrollView } from 'react-native';
import { Sheet, Text, YStack } from 'tamagui';
import { useTheme } from '@/design/theme';
import { useResponsiveLayout } from '@/design/layout';

export const ModalSurface = ({
  visible,
  title,
  subtitle,
  onOpenChange,
  onClose,
  scrollable = true,
  children
}: {
  visible?: boolean;
  title: string;
  subtitle?: string;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
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

  const panel = (
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
        {typeof visible === 'boolean' ? (
          <YStack
            style={{
              width: 48,
              height: 4,
              borderRadius: theme.radius.pill,
              backgroundColor: theme.colors.modalBorder,
              alignSelf: 'center'
            }}
          />
        ) : null}
        <YStack style={{ gap: theme.spacing.xs }}>
          <Text style={{ fontWeight: '800', fontSize: 20, color: theme.colors.modalText }}>{title}</Text>
          {subtitle ? <Text style={{ color: theme.colors.modalTextSoft, lineHeight: 20 }}>{subtitle}</Text> : null}
        </YStack>
        {body}
      </YStack>
  );

  if (typeof visible === 'boolean') {
    if (!visible) return null;

    return (
      <Sheet
        modal
        open={visible}
        snapPoints={[82]}
        dismissOnSnapToBottom
        onOpenChange={(open: boolean) => {
          onOpenChange?.(open);
          if (!open) onClose?.();
        }}
      >
        <Sheet.Overlay
          style={{
            backgroundColor: theme.colors.overlay
          }}
          onPress={onClose}
        />
        <Sheet.Frame
          style={{
            backgroundColor: 'transparent',
            padding: layout.horizontalPadding,
            paddingBottom: theme.spacing.xl
          }}
        >
          {panel}
        </Sheet.Frame>
      </Sheet>
    );
  }

  return (
    <YStack style={{ flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'center', padding: layout.horizontalPadding }}>
      {panel}
    </YStack>
  );
};
