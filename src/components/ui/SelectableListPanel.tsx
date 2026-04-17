import React from 'react';
import { Pressable, ScrollView, Text } from 'react-native';
import { useTheme } from '@/design/theme';

export const SelectableListPanel = ({
  items,
  maxHeight = 180
}: {
  items: Array<{ key: string | number; label: string; onPress: () => void }>;
  maxHeight?: number;
}) => {
  const { theme } = useTheme();

  return (
  <ScrollView
    style={{
      maxHeight,
      borderWidth: 1,
      borderColor: theme.colors.borderStrong,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surfaceLight
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
        <Text style={{ color: theme.colors.textDark, fontWeight: '600' }}>{item.label}</Text>
      </Pressable>
    ))}
  </ScrollView>
  );
};
