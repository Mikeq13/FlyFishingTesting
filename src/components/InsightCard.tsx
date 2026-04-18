import React from 'react';
import { Text, View } from 'react-native';
import { Insight } from '@/types/experiment';
import { useTheme } from '@/design/theme';

export const InsightCard = ({ insight }: { insight: Insight }) => {
  const { theme } = useTheme();

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: theme.colors.borderStrong,
        borderRadius: theme.radius.md,
        padding: 14,
        marginBottom: 10,
        backgroundColor: theme.colors.surface
      }}
    >
      <Text style={{ fontWeight: '800', color: theme.colors.text, marginBottom: 4 }}>
        {insight.type.toUpperCase()} ({insight.confidence})
      </Text>
      <Text style={{ color: theme.colors.textMuted, lineHeight: 22 }}>{insight.message}</Text>
    </View>
  );
};
