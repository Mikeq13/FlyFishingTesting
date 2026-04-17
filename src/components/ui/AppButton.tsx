import React from 'react';
import { Pressable, Text } from 'react-native';
import { ButtonVariant, useTheme } from '@/design/theme';

export const AppButton = ({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  surfaceTone = 'dark'
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  surfaceTone?: 'dark' | 'light';
}) => {
  const { theme } = useTheme();
  const isLightSurface = surfaceTone === 'light';
  const backgroundColor = disabled
    ? theme.colors.neutral
    : variant === 'secondary'
      ? theme.colors.secondary
      : variant === 'tertiary'
        ? isLightSurface
          ? theme.colors.surfaceLightAlt
          : theme.colors.tertiary
        : variant === 'neutral'
          ? isLightSurface
            ? theme.colors.surfaceLightAlt
            : theme.colors.neutral
          : variant === 'danger'
            ? theme.colors.danger
            : variant === 'ghost'
              ? isLightSurface
                ? theme.colors.surfaceLightAlt
                : theme.colors.surfaceMuted
              : theme.colors.primary;
  const textColor =
    disabled
      ? theme.colors.buttonText
      : variant === 'ghost'
        ? isLightSurface
          ? theme.colors.textDark
          : theme.colors.ghostButtonText
        : variant === 'tertiary' || variant === 'neutral'
          ? isLightSurface
            ? theme.colors.textDark
            : theme.colors.buttonText
          : theme.colors.buttonText;
  const borderColor =
    variant === 'ghost' || variant === 'tertiary' || (variant === 'neutral' && isLightSurface)
      ? isLightSurface
        ? theme.colors.borderStrong
        : theme.colors.borderStrong
      : 'transparent';

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
        borderWidth: variant === 'ghost' || variant === 'tertiary' || (variant === 'neutral' && isLightSurface) ? 1 : 0,
        borderColor
      }}
    >
      <Text style={{ color: textColor, textAlign: 'center', fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
};
