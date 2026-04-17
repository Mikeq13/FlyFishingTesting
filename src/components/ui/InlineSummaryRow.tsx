import React from 'react';
import { Text, View } from 'react-native';
import { appTheme } from '@/design/theme';

export const InlineSummaryRow = ({
  label,
  value,
  valueMuted = false
}: {
  label: string;
  value: string;
  valueMuted?: boolean;
}) => (
  <View style={{ gap: 2 }}>
    <Text style={{ color: appTheme.colors.textSoft, fontWeight: '700' }}>{label}</Text>
    <Text style={{ color: valueMuted ? appTheme.colors.textMuted : appTheme.colors.text, fontWeight: '600' }}>{value}</Text>
  </View>
);
