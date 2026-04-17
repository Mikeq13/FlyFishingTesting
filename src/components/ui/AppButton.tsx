import React from 'react';
import { Pressable, Text } from 'react-native';
import { ButtonVariant, useTheme } from '@/design/theme';

export const AppButton = ({
  label,
  onPress,
  variant = 'primary',
  disabled = false
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
}) => {
  const { theme } = useTheme();
  const backgroundColor = disabled
    ? theme.colors.neutral
    : variant === 'secondary'
      ? theme.colors.secondary
      : variant === 'tertiary'
        ? theme.colors.tertiary
        : variant === 'neutral'
          ? theme.colors.neutral
          : variant === 'danger'
            ? theme.colors.danger
            : variant === 'ghost'
              ? theme.colors.surfaceMuted
              : theme.colors.primary;
  const textColor = variant === 'ghost' ? theme.colors.ghostButtonText : theme.colors.buttonText;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        backgroundColor,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.radius.md,
        opacity: disabled ? 0.78 : 1,
        borderWidth: variant === 'ghost' ? 1 : variant === 'tertiary' ? 1 : 0,
        borderColor: variant === 'ghost' ? theme.colors.borderStrong : variant === 'tertiary' ? theme.colors.borderStrong : 'transparent'
      }}
    >
      <Text style={{ color: textColor, textAlign: 'center', fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
};
