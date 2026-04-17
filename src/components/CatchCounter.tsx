import React from 'react';
import { Text, View } from 'react-native';
import { AppButton } from '@/components/ui/AppButton';
import { appTheme } from '@/design/theme';

export const CatchCounter = ({
  label,
  value,
  onIncrement,
  onDecrement
}: {
  label: string;
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
}) => (
  <View style={{ gap: 8, flex: 1, minWidth: 0 }}>
    <Text style={{ color: appTheme.colors.text }}>{label}: {value}</Text>
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <View style={{ flex: 1 }}>
        <AppButton label="- Catch" onPress={onDecrement} variant="neutral" />
      </View>
      <View style={{ flex: 1 }}>
        <AppButton label="+ Catch" onPress={onIncrement} />
      </View>
    </View>
  </View>
);
