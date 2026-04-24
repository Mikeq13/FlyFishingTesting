import React from 'react';
import { Button, Text } from 'tamagui';
import { ButtonVariant, SurfaceTone, useTheme } from '@/design/theme';

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
  surfaceTone?: SurfaceTone;
}) => {
  const { theme } = useTheme();
  const isLightSurface = surfaceTone === 'light';
  const isModalSurface = surfaceTone === 'modal';
  const useThemeElevatedPalette = isLightSurface && theme.id !== 'daylight_light';
  const elevatedSurfaceColor = useThemeElevatedPalette ? theme.colors.surfaceAlt : theme.colors.surfaceLightAlt;
  const elevatedTextColor = useThemeElevatedPalette ? theme.colors.text : theme.colors.textDark;
  const elevatedBorderColor = useThemeElevatedPalette ? theme.colors.borderStrong : theme.colors.borderStrong;
  const backgroundColor = disabled
    ? theme.colors.neutral
    : variant === 'secondary'
      ? theme.colors.secondary
      : variant === 'tertiary'
        ? isLightSurface
          ? elevatedSurfaceColor
          : isModalSurface
            ? theme.colors.modalSurfaceAlt
            : theme.colors.tertiary
        : variant === 'neutral'
          ? isLightSurface
            ? elevatedSurfaceColor
            : isModalSurface
              ? theme.colors.modalSurfaceAlt
              : theme.colors.neutral
          : variant === 'danger'
            ? theme.colors.danger
            : variant === 'ghost'
              ? isLightSurface
                ? elevatedSurfaceColor
                : isModalSurface
                  ? theme.colors.modalSurfaceAlt
                  : theme.colors.surfaceMuted
              : theme.colors.primary;
  const textColor =
    disabled
      ? theme.colors.buttonText
      : variant === 'ghost'
        ? isLightSurface
          ? elevatedTextColor
          : isModalSurface
            ? theme.colors.modalText
            : theme.colors.ghostButtonText
        : variant === 'tertiary' || variant === 'neutral'
          ? isLightSurface
            ? elevatedTextColor
            : isModalSurface
              ? theme.colors.modalText
              : theme.colors.buttonText
          : theme.colors.buttonText;
  const borderColor =
    variant === 'ghost' || variant === 'tertiary' || (variant === 'neutral' && (isLightSurface || isModalSurface))
      ? isModalSurface
        ? theme.colors.modalNestedBorder
        : elevatedBorderColor
      : 'transparent';

  return (
    <Button
      unstyled
      onPress={onPress}
      disabled={disabled}
      style={{
        backgroundColor,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.radius.md,
        opacity: disabled ? 0.78 : 1,
        borderWidth: variant === 'ghost' || variant === 'tertiary' || (variant === 'neutral' && (isLightSurface || isModalSurface)) ? 1 : 0,
        borderColor,
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <Text style={{ color: textColor, textAlign: 'center', fontWeight: '700' }}>{label}</Text>
    </Button>
  );
};
