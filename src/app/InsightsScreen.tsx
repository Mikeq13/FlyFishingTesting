import React from 'react';
import { ScrollView, Text } from 'react-native';
import { InsightCard } from '@/components/InsightCard';
import { useAppStore } from './store';

export const InsightsScreen = () => {
  const { insights } = useAppStore();

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: 8 }}>Insights</Text>
      {insights.map((insight, idx) => (
        <InsightCard key={`${insight.type}-${idx}`} insight={insight} />
      ))}
    </ScrollView>
  );
};
