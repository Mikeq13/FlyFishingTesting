import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { InsightCard } from '@/components/InsightCard';
import { PremiumFeatureGate } from '@/components/PremiumFeatureGate';
import { useAppStore } from './store';
import { ScreenBackground } from '@/components/ScreenBackground';

export const InsightsScreen = ({ navigation }: any) => {
  const { insights, anglerComparisons, topFlyRecords, topFlyInsights, currentHasPremiumAccess } = useAppStore();

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
        {!currentHasPremiumAccess ? (
          <PremiumFeatureGate
            title="Premium Insights"
            description="River-specific trends, top flies, and cross-angler comparisons are part of the premium research experience."
          />
        ) : (
          <>
        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 28, fontWeight: '800', color: '#f7fdff' }}>Insights</Text>
          <Text style={{ color: '#d7f3ff', lineHeight: 20 }}>
            Review the strongest patterns in your data, your best flies, and where anglers overlap.
          </Text>
        </View>
        {insights.map((insight, idx) => (
          <InsightCard key={`${insight.type}-${idx}`} insight={insight} />
        ))}
        {!!topFlyInsights.length && (
          <>
            <Text style={{ fontSize: 20, fontWeight: '800', marginTop: 4, marginBottom: 2, color: '#f7fdff' }}>Top Flies</Text>
            {topFlyInsights.map((insight, idx) => (
              <InsightCard key={`top-fly-${idx}`} insight={insight} />
            ))}
            <View style={{ gap: 8 }}>
              {topFlyRecords.slice(0, 5).map((record) => (
                <View
                  key={`${record.name}-${record.hookSize}-${record.beadSizeMm}`}
                  style={{ backgroundColor: 'rgba(6, 27, 44, 0.70)', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: 'rgba(202,240,248,0.16)' }}
                >
                  <Text style={{ color: '#f7fdff', fontWeight: '700', fontSize: 16 }}>{record.name}</Text>
                  <Text style={{ color: '#d7f3ff' }}>
                    #{record.hookSize} | bead {record.beadSizeMm} | {(record.rate * 100).toFixed(1)}% catch rate
                  </Text>
                  <Text style={{ color: '#bde6f6', fontSize: 12 }}>{record.casts} casts logged</Text>
                  {record.averageSizeInches ? (
                    <Text style={{ color: '#bde6f6', fontSize: 12 }}>
                      Avg fish size: {record.averageSizeInches}"{record.largestFishInches ? ` | Largest: ${record.largestFishInches}"` : ''}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          </>
        )}
        {!!anglerComparisons.length && (
          <>
            <Text style={{ fontSize: 20, fontWeight: '800', marginTop: 4, marginBottom: 2, color: '#f7fdff' }}>Across Anglers</Text>
            {anglerComparisons.map((insight, idx) => (
              <InsightCard key={`comparison-${idx}`} insight={insight} />
            ))}
          </>
        )}
        <Pressable onPress={() => navigation.navigate('Session')} style={{ backgroundColor: '#2a9d8f', borderRadius: 14, padding: 14, marginTop: 6 }}>
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Back to Session Setup</Text>
        </Pressable>
        <Pressable onPress={() => navigation.navigate('History')} style={{ backgroundColor: '#1d3557', borderRadius: 14, padding: 14 }}>
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>View History</Text>
        </Pressable>
        <Pressable onPress={() => navigation.navigate('Home')} style={{ backgroundColor: '#264653', borderRadius: 14, padding: 14 }}>
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Go Home</Text>
        </Pressable>
          </>
        )}
      </ScrollView>
    </ScreenBackground>
  );
};
