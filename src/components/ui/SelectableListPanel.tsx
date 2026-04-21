import React from 'react';
import { Pressable, ScrollView, Text } from 'react-native';
import { SurfaceTone, useTheme } from '@/design/theme';

export const SelectableListPanel = ({
  items,
  maxHeight = 180,
  tone = 'light'
}: {
  items: Array<{ key: string | number; label: string; onPress: () => void }>;
  maxHeight?: number;
  tone?: SurfaceTone;
}) => {
  const { theme } = useTheme();
  const useThemeElevatedPalette = tone === 'light' && theme.id !== 'daylight_light';
  const backgroundColor =
    tone === 'modal'
      ? theme.colors.modalSurfaceAlt
      : tone === 'light'
        ? useThemeElevatedPalette
          ? theme.colors.surfaceAlt
          : theme.colors.surfaceLight
        : theme.colors.surface;
  const borderColor =
    tone === 'modal'
      ? theme.colors.modalNestedBorder
      : tone === 'light'
        ? useThemeElevatedPalette
          ? theme.colors.borderStrong
          : theme.colors.borderStrong
        : theme.colors.borderStrong;
  const textColor =
    tone === 'modal'
      ? theme.colors.modalText
      : tone === 'light'
        ? useThemeElevatedPalette
          ? theme.colors.text
          : theme.colors.textDark
        : theme.colors.text;

  return (
  <ScrollView
    style={{
      maxHeight,
      borderWidth: 1,
      borderColor,
      borderRadius: theme.radius.md,
      backgroundColor
    }}
  >
    {items.map((item, index) => (
      <Pressable
        key={item.key}
        onPress={item.onPress}
        style={{
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.md,
          borderBottomWidth: index === items.length - 1 ? 0 : 1,
          borderBottomColor: theme.colors.borderLight
        }}
      >
        <Text style={{ color: textColor, fontWeight: '600' }}>{item.label}</Text>
      </Pressable>
    ))}
  </ScrollView>
  );
};
