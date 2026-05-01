import React from 'react';
import { Modal, ScrollView, View } from 'react-native';
import { Text, YStack } from 'tamagui';
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
  const maxPanelHeight = Math.max(260, layout.height - layout.horizontalPadding * 2);
  const maxBodyHeight = Math.max(220, maxPanelHeight - theme.spacing.lg * 8);
  const closeModal = () => {
    onOpenChange?.(false);
    onClose?.();
  };
  const body = scrollable ? (
    <ScrollView
      style={{ maxHeight: maxBodyHeight, flexShrink: 1 }}
      contentContainerStyle={{ gap: theme.spacing.md, paddingBottom: theme.spacing.lg }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator
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
          maxHeight: maxPanelHeight,
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
      <Modal visible={visible} transparent animationType="fade" onRequestClose={closeModal}>
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            backgroundColor: theme.colors.overlay,
            padding: layout.horizontalPadding
          }}
        >
          {panel}
        </View>
      </Modal>
    );
  }

  return (
    <YStack style={{ flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'center', padding: layout.horizontalPadding }}>
      {panel}
    </YStack>
  );
};
