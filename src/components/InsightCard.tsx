import React from 'react';
import { Text, View } from 'react-native';
import { Insight } from '@/types/experiment';

export const InsightCard = ({ insight }: { insight: Insight }) => (
  <View style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 8 }}>
    <Text style={{ fontWeight: '700' }}>{insight.type.toUpperCase()} ({insight.confidence})</Text>
    <Text>{insight.message}</Text>
  </View>
);
