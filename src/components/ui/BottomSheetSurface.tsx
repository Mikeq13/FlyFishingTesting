import React from 'react';
import { ScrollView } from 'react-native';
import { Sheet, Text, YStack } from 'tamagui';
import { useTheme } from '@/design/theme';

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

  if (!visible) return null;

  return (
    <Sheet
      modal
      open={visible}
      snapPoints={[86]}
      dismissOnSnapToBottom
      onOpenChange={(open: boolean) => {
        onOpenChange?.(open);
        if (!open) onClose();
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
          gap: theme.spacing.md,
          borderTopLeftRadius: theme.radius.xl,
          borderTopRightRadius: theme.radius.xl,
          borderWidth: 1,
          borderColor: theme.colors.modalBorder,
          padding: theme.spacing.lg,
          paddingBottom: theme.spacing.xl,
          backgroundColor: theme.colors.modalSurface
        }}
      >
        <Sheet.Handle
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
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: theme.spacing.md }}>
          {children}
        </ScrollView>
      </Sheet.Frame>
    </Sheet>
  );
};
