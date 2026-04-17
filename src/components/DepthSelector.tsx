import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { DepthRange } from '@/types/session';
import { DEPTH_RANGES } from '@/constants/options';
import { appTheme } from '@/design/theme';

export const DepthSelector = ({ value, onChange }: { value: DepthRange; onChange: (v: DepthRange) => void }) => (
  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
    {DEPTH_RANGES.map((o) => (
      <Pressable
        key={o}
        onPress={() => onChange(o)}
        style={{
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderWidth: 1,
          borderColor: value === o ? appTheme.colors.chipSelectedBorder : appTheme.colors.chipBorder,
          backgroundColor: value === o ? appTheme.colors.chipSelectedBg : appTheme.colors.chipBg,
          borderRadius: appTheme.radius.sm
        }}
      >
        <Text style={{ color: appTheme.colors.text, fontWeight: '700' }}>{o}</Text>
      </Pressable>
    ))}
  </View>
);
