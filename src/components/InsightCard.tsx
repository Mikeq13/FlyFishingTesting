import React from 'react';
import { Text, View } from 'react-native';
import { Insight } from '@/types/experiment';
import { appTheme } from '@/design/theme';

export const InsightCard = ({ insight }: { insight: Insight }) => (
  <View
    style={{
      borderWidth: 1,
      borderColor: appTheme.colors.borderStrong,
      borderRadius: appTheme.radius.md,
      padding: 14,
      marginBottom: 10,
      backgroundColor: appTheme.colors.surface
    }}
  >
    <Text style={{ fontWeight: '800', color: appTheme.colors.text, marginBottom: 4 }}>
      {insight.type.toUpperCase()} ({insight.confidence})
    </Text>
    <Text style={{ color: appTheme.colors.textMuted, lineHeight: 22 }}>{insight.message}</Text>
  </View>
);
