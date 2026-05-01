import React from 'react';
import { Modal, ScrollView, View } from 'react-native';
import { Text, YStack } from 'tamagui';
import { useTheme } from '@/design/theme';
import { useResponsiveLayout } from '@/design/layout';

export const BottomSheetSurface = ({
  visible = true,
  title,
  subtitle,
  onOpenChange,
  onClose,
  children
}: {
  visible?: boolean;
  title: string;
  subtitle?: string;
  onOpenChange?: (open: boolean) => void;
  onClose: () => void;
  children: React.ReactNode;
}) => {
  const { theme } = useTheme();
  const layout = useResponsiveLayout();
  const maxFrameHeight = Math.max(260, layout.height - layout.horizontalPadding * 2);
  const maxBodyHeight = Math.max(220, maxFrameHeight - theme.spacing.lg * 7);
  const closeSheet = () => {
    onOpenChange?.(false);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={closeSheet}>
      <View
        style={{
          flex: 1,
          justifyContent: 'flex-end',
          backgroundColor: theme.colors.overlay,
          padding: layout.horizontalPadding,
          paddingBottom: theme.spacing.md
        }}
      >
      <YStack
        style={{
          gap: theme.spacing.md,
          borderTopLeftRadius: theme.radius.xl,
          borderTopRightRadius: theme.radius.xl,
          borderWidth: 1,
          borderColor: theme.colors.modalBorder,
          padding: theme.spacing.lg,
          paddingBottom: theme.spacing.md,
          backgroundColor: theme.colors.modalSurface,
          maxHeight: maxFrameHeight,
          width: '100%',
          alignSelf: 'center'
        }}
      >
        <View
          style={{
            width: 48,
            height: 4,
            borderRadius: theme.radius.pill,
            backgroundColor: theme.colors.modalBorder,
            alignSelf: 'center'
          }}
        />
        <YStack style={{ gap: theme.spacing.xs }}>
          <Text style={{ fontWeight: '800', fontSize: 20, color: theme.colors.modalText }}>{title}</Text>
          {subtitle ? <Text style={{ color: theme.colors.modalTextSoft, lineHeight: 20 }}>{subtitle}</Text> : null}
        </YStack>
        <ScrollView
          style={{ maxHeight: maxBodyHeight, flexShrink: 1 }}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ gap: theme.spacing.md, paddingBottom: theme.spacing.lg }}
          showsVerticalScrollIndicator
        >
          {children}
        </ScrollView>
      </YStack>
      </View>
    </Modal>
  );
};
