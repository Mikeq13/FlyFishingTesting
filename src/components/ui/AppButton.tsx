import React from 'react';
import { Pressable, Text } from 'react-native';
import { appTheme, buttonBackground, ButtonVariant } from '@/design/theme';

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
}) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    style={{
      backgroundColor: buttonBackground(variant, disabled),
      paddingVertical: appTheme.spacing.md,
      paddingHorizontal: appTheme.spacing.md,
      borderRadius: appTheme.radius.md,
      opacity: disabled ? 0.78 : 1
    }}
  >
    <Text style={{ color: appTheme.colors.text, textAlign: 'center', fontWeight: '700' }}>{label}</Text>
  </Pressable>
);
