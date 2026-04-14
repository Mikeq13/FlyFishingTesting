import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { DepthRange } from '@/types/session';

const options: DepthRange[] = ['surface', '1-3 ft', '3-6 ft', '6+ ft'];

export const DepthSelector = ({ value, onChange }: { value: DepthRange; onChange: (v: DepthRange) => void }) => (
  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
    {options.map((o) => (
      <Pressable key={o} onPress={() => onChange(o)} style={{ padding: 8, borderWidth: 1, borderColor: value === o ? '#2a9d8f' : '#aaa', borderRadius: 8 }}>
        <Text>{o}</Text>
      </Pressable>
    ))}
  </View>
);
