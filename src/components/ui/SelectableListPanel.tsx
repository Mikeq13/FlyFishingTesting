import React from 'react';
import { Pressable, ScrollView, Text } from 'react-native';
import { appTheme } from '@/design/theme';

export const SelectableListPanel = ({
  items,
  maxHeight = 180
}: {
  items: Array<{ key: string | number; label: string; onPress: () => void }>;
  maxHeight?: number;
}) => (
  <ScrollView
    style={{
      maxHeight,
      borderWidth: 1,
      borderColor: appTheme.colors.borderStrong,
      borderRadius: appTheme.radius.md,
      backgroundColor: appTheme.colors.surfaceLight
    }}
  >
    {items.map((item, index) => (
      <Pressable
        key={item.key}
        onPress={item.onPress}
        style={{
          paddingHorizontal: appTheme.spacing.md,
          paddingVertical: appTheme.spacing.md,
          borderBottomWidth: index === items.length - 1 ? 0 : 1,
          borderBottomColor: '#d8e2eb'
        }}
      >
        <Text style={{ color: appTheme.colors.textDark, fontWeight: '600' }}>{item.label}</Text>
      </Pressable>
    ))}
  </ScrollView>
);
