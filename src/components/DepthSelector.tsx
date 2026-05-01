import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { DepthRange } from '@/types/session';
import { DEPTH_RANGES } from '@/constants/options';
import { useTheme } from '@/design/theme';

export const DepthSelector = ({
  value,
  onChange,
  options = DEPTH_RANGES
}: {
  value: DepthRange;
  onChange: (v: DepthRange) => void;
  options?: readonly DepthRange[];
}) => {
  const { theme } = useTheme();

  return (
  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
    {options.map((o) => (
      <Pressable
        key={o}
        onPress={() => onChange(o)}
        style={{
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderWidth: 1,
          borderColor: value === o ? theme.colors.chipSelectedBorder : theme.colors.chipBorder,
          backgroundColor: value === o ? theme.colors.chipSelectedBg : theme.colors.chipBg,
          borderRadius: theme.radius.sm
        }}
      >
        <Text style={{ color: value === o ? theme.colors.chipSelectedText : theme.colors.chipText, fontWeight: '700' }}>{o}</Text>
      </Pressable>
    ))}
  </View>
  );
};
