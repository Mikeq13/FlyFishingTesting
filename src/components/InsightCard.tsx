import React from 'react';
import { Text, View } from 'react-native';
import { Insight } from '@/types/experiment';

export const InsightCard = ({ insight }: { insight: Insight }) => (
  <View style={{ borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 12, padding: 14, marginBottom: 10, backgroundColor: 'rgba(9, 27, 40, 0.78)' }}>
    <Text style={{ fontWeight: '800', color: '#f5fbff', marginBottom: 4 }}>{insight.type.toUpperCase()} ({insight.confidence})</Text>
    <Text style={{ color: '#e6f4fb', lineHeight: 22 }}>{insight.message}</Text>
  </View>
);
