import React from 'react';
import { Pressable, Text } from 'react-native';
import { buttonBackground, buttonTextColor, ButtonVariant, useTheme } from '@/design/theme';

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

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        backgroundColor: buttonBackground(variant, disabled),
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.radius.md,
        opacity: disabled ? 0.78 : 1,
        borderWidth: variant === 'ghost' ? 1 : 0,
        borderColor: variant === 'ghost' ? theme.colors.borderStrong : 'transparent'
      }}
    >
      <Text style={{ color: buttonTextColor(variant), textAlign: 'center', fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
};
