import React from 'react';
import { Text, View } from 'react-native';
import { AppButton } from '@/components/ui/AppButton';
import { appTheme } from '@/design/theme';

interface CastCounterProps {
  label: string;
  value: number;
  step: number;
  onIncrement: () => void;
  onDecrement: () => void;
}

export const CastCounter = ({ label, value, step, onIncrement, onDecrement }: CastCounterProps) => (
  <View style={{ gap: 8, flex: 1, minWidth: 0 }}>
    <Text style={{ color: appTheme.colors.text }}>{label}: {value}</Text>
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <View style={{ flex: 1 }}>
        <AppButton label={`-${step}`} onPress={onDecrement} variant="neutral" />
      </View>
      <View style={{ flex: 1 }}>
        <AppButton label={`+${step}`} onPress={onIncrement} variant="tertiary" />
      </View>
    </View>
  </View>
);
