import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { DepthRange } from '@/types/session';

const options: DepthRange[] = ['surface', '1-3 ft', '3-6 ft', '6+ ft'];

export const DepthSelector = ({ value, onChange }: { value: DepthRange; onChange: (v: DepthRange) => void }) => (
  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
    {options.map((o) => (
      <Pressable
        key={o}
        onPress={() => onChange(o)}
        style={{
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderWidth: 1,
          borderColor: value === o ? '#84d9f4' : 'rgba(255,255,255,0.22)',
          backgroundColor: value === o ? 'rgba(132,217,244,0.28)' : 'rgba(6,28,41,0.5)',
          borderRadius: 10
        }}
      >
        <Text style={{ color: '#f4fbff', fontWeight: '700' }}>{o}</Text>
      </Pressable>
    ))}
  </View>
);
