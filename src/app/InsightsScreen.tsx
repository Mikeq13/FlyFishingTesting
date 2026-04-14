import React from 'react';
import { Pressable, ScrollView, Text } from 'react-native';
import { InsightCard } from '@/components/InsightCard';
import { useAppStore } from './store';
import { ScreenBackground } from '@/components/ScreenBackground';

export const InsightsScreen = ({ navigation }: any) => {
  const { insights, anglerComparisons, topFlyRecords, topFlyInsights } = useAppStore();

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: 8, color: 'white' }}>Insights</Text>
        {insights.map((insight, idx) => (
          <InsightCard key={`${insight.type}-${idx}`} insight={insight} />
        ))}
        {!!topFlyInsights.length && (
          <>
            <Text style={{ fontSize: 18, fontWeight: '700', marginTop: 8, marginBottom: 8, color: 'white' }}>Top Flies</Text>
            {topFlyInsights.map((insight, idx) => (
              <InsightCard key={`top-fly-${idx}`} insight={insight} />
            ))}
            {topFlyRecords.slice(0, 5).map((record) => (
              <Text key={`${record.name}-${record.hookSize}-${record.beadSizeMm}`} style={{ color: '#dbf5ff', marginBottom: 4 }}>
                {record.name} | #{record.hookSize} | bead {record.beadSizeMm} | {(record.rate * 100).toFixed(1)}% over {record.casts} casts
              </Text>
            ))}
          </>
        )}
        {!!anglerComparisons.length && (
          <>
            <Text style={{ fontSize: 18, fontWeight: '700', marginTop: 8, marginBottom: 8, color: 'white' }}>Across Anglers</Text>
            {anglerComparisons.map((insight, idx) => (
              <InsightCard key={`comparison-${idx}`} insight={insight} />
            ))}
          </>
        )}
        <Pressable onPress={() => navigation.navigate('Session')} style={{ backgroundColor: '#2a9d8f', borderRadius: 8, padding: 12, marginTop: 10 }}>
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Back to Session Setup</Text>
        </Pressable>
        <Pressable onPress={() => navigation.navigate('History')} style={{ backgroundColor: '#1d3557', borderRadius: 8, padding: 12, marginTop: 8 }}>
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>View History</Text>
        </Pressable>
        <Pressable onPress={() => navigation.navigate('Home')} style={{ backgroundColor: '#264653', borderRadius: 8, padding: 12, marginTop: 8 }}>
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Go Home</Text>
        </Pressable>
      </ScrollView>
    </ScreenBackground>
  );
};
