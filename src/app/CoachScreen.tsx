import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { KeyboardDismissView } from '@/components/KeyboardDismissView';
import { PremiumFeatureGate } from '@/components/PremiumFeatureGate';
import { useAppStore } from './store';
import { buildAggregates, bucketRates } from '@/engine/aggregationEngine';
import { buildAIContext } from '@/ai/aiContextBuilder';
import { runCoach } from '@/ai/coachEngine';
import { ScreenBackground } from '@/components/ScreenBackground';
import { getExperimentEntries } from '@/utils/experimentEntries';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { AppButton } from '@/components/ui/AppButton';
import { appTheme } from '@/design/theme';

type CoachCard = {
  title: string;
  body: string;
  accent: string;
};

const subheadingStyle = {
  fontSize: 18,
  fontWeight: '700' as const,
  color: appTheme.colors.text
};

const findLeader = (bucket: Record<string, number>) => {
  const entries = Object.entries(bucket).filter(([, value]) => Number.isFinite(value) && value > 0);
  if (!entries.length) return null;
  return entries.reduce((best, current) => (current[1] > best[1] ? current : best));
};

const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

export const CoachScreen = () => {
  const navigation = useNavigation<any>();
  const { sessions, experiments, insights, topFlyRecords, currentHasPremiumAccess } = useAppStore();
  const [question, setQuestion] = useState('What does my data suggest I try next?');
  const [response, setResponse] = useState<ReturnType<typeof runCoach> | null>(null);

  const aggregates = useMemo(() => buildAggregates(sessions, experiments), [sessions, experiments]);
  const context = useMemo(
    () => buildAIContext(sessions, aggregates, insights, experiments, sessions[0]),
    [sessions, aggregates, insights, experiments]
  );

  const coachCards = useMemo<CoachCard[]>(() => {
    const cards: CoachCard[] = [];
    const bestFly = topFlyRecords[0];
    const bestWaterType = findLeader(bucketRates(aggregates.byWaterType));
    const bestDepth = findLeader(bucketRates(aggregates.byDepthRange));
    const experimentsByFlyCount = experiments.reduce<Record<number, { casts: number; catches: number }>>((acc, experiment) => {
      const entries = getExperimentEntries(experiment);
      const flyCount = entries.length;
      acc[flyCount] = acc[flyCount] ?? { casts: 0, catches: 0 };
      acc[flyCount].casts += entries.reduce((sum, entry) => sum + entry.casts, 0);
      acc[flyCount].catches += entries.reduce((sum, entry) => sum + entry.catches, 0);
      return acc;
    }, {});

    const bestFlyCount = findLeader(
      Object.fromEntries(
        Object.entries(experimentsByFlyCount)
          .filter(([, stat]) => stat.casts > 0)
          .map(([count, stat]) => [count, stat.catches / stat.casts])
      )
    );

    if (bestFly) {
      const beadSummary = bestFly.beadSizeMm > 0 ? `${bestFly.beadSizeMm.toFixed(1)} mm ${bestFly.beadColor} bead` : 'unweighted';
      cards.push({
        title: 'Best Current Match',
        body: `${bestFly.name} (#${bestFly.hookSize}, ${beadSummary}) is your strongest saved signal right now at ${formatPercent(bestFly.rate)} over ${bestFly.casts} casts.`,
        accent: '#7dd3fc'
      });
    }

    if (bestWaterType && bestDepth) {
      cards.push({
        title: 'Try Next',
        body: `Your best overall context is ${bestWaterType[0]} water at ${bestDepth[0]}. If you're deciding where to start, that's the cleanest match from your journal so far.`,
        accent: '#86efac'
      });
    } else if (bestWaterType) {
      cards.push({
        title: 'Try Next',
        body: `${bestWaterType[0]} is currently your most productive water type. That's a good place to keep building repeatable confidence.`,
        accent: '#86efac'
      });
    }

    if (bestFlyCount) {
      const countLabel = Number(bestFlyCount[0]) === 1 ? 'single-fly' : `${bestFlyCount[0]}-fly`;
      cards.push({
        title: 'Rig Guidance',
        body: `Your ${countLabel} setups are currently converting best at ${formatPercent(bestFlyCount[1])}. That's a good rig size to lean on until the data says otherwise.`,
        accent: '#fcd34d'
      });
    }

    const warningInsight = insights.find((insight) => insight.type === 'warning');
    if (warningInsight) {
      cards.push({
        title: 'Area Of Opportunity',
        body: warningInsight.message,
        accent: '#fca5a5'
      });
    }

    const anomaly = context.anomalies[0];
    if (anomaly) {
      cards.push({
        title: 'Thin Data',
        body: anomaly,
        accent: '#c4b5fd'
      });
    }

    if (!cards.length) {
      cards.push({
        title: 'Coach Intel',
        body: 'You have the journal structure in place. Log a few more experiments and the coach will start turning your history into recommendations.',
        accent: '#7dd3fc'
      });
    }

    return cards.slice(0, 5);
  }, [aggregates.byDepthRange, aggregates.byWaterType, context.anomalies, experiments, insights, topFlyRecords]);

  if (!currentHasPremiumAccess) {
    return (
      <ScreenBackground>
        <KeyboardDismissView>
          <ScrollView
            contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 28 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            <PremiumFeatureGate
              title="Premium AI Coach"
              description="The AI coach is part of premium access so you can turn your fishing journal into tailored recommendations and pattern-based guidance."
            />
          </ScrollView>
        </KeyboardDismissView>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground>
      <KeyboardDismissView>
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 28 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <ScreenHeader
            title="AI Coach"
            subtitle="Use your journal to spot what is working, where your data is thin, and what to try next on the water."
            eyebrow="Premium Guidance"
          />

          <SectionCard title="Coach Intel" subtitle="Recommendation-first guidance pulled from your sessions, experiments, and top-fly history.">
            <View style={{ gap: 4 }}>
              <Text style={{ color: 'rgba(226, 240, 248, 0.86)', lineHeight: 19 }}>
                Keep the strongest signals close at hand before you ask a deeper question.
              </Text>
            </View>

            {coachCards.map((card) => (
              <View
                key={card.title}
                style={{
                  borderRadius: 16,
                  padding: 14,
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.1)',
                  gap: 6
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: card.accent }} />
                  <Text style={{ color: '#f5fbff', fontSize: 16, fontWeight: '700' }}>{card.title}</Text>
                </View>
                <Text style={{ color: 'rgba(230, 243, 248, 0.92)', lineHeight: 20 }}>{card.body}</Text>
              </View>
            ))}

            <View style={{ gap: 10 }}>
              <AppButton label="Open Insights" onPress={() => navigation.navigate('Insights')} />
              <AppButton label="Review History" onPress={() => navigation.navigate('History')} variant="ghost" />
            </View>
          </SectionCard>

          <SectionCard title="Ask About My Data" subtitle="Ask a specific question when you want the coach to explain what it sees in your journal.">
            <View style={{ gap: 4 }}>
              <Text style={{ color: 'rgba(226, 240, 248, 0.86)', lineHeight: 19 }}>
                Keep prompts focused so the answer feels useful in the field, not generic.
              </Text>
            </View>

            <TextInput
              value={question}
              onChangeText={setQuestion}
              multiline
              style={{
                minHeight: 96,
                borderWidth: 1,
                borderColor: appTheme.colors.borderStrong,
                padding: 12,
                borderRadius: appTheme.radius.md,
                backgroundColor: appTheme.colors.inputBg,
                color: '#10212d',
                textAlignVertical: 'top'
              }}
              placeholder="Ask about your river, fly size, bead color, or what pattern to test next."
              placeholderTextColor="rgba(16, 33, 45, 0.46)"
            />

            <AppButton label="Ask AI Coach" onPress={() => setResponse(runCoach(question, context))} variant="tertiary" />

            {response && (
              <View
                style={{
                  gap: 10,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.14)',
                  borderRadius: 14,
                  padding: 14,
                  backgroundColor: 'rgba(247, 252, 255, 0.96)'
                }}
              >
                <View style={{ gap: 4 }}>
                  <Text style={{ fontWeight: '700', color: '#10212d' }}>Summary</Text>
                  <Text style={{ color: '#173241', lineHeight: 20 }}>{response.summary}</Text>
                </View>

                <View style={{ gap: 4 }}>
                  <Text style={{ fontWeight: '700', color: '#10212d' }}>Evidence</Text>
                  {response.evidence.map((evidence, index) => (
                    <Text key={`${evidence}-${index}`} style={{ color: '#173241', lineHeight: 19 }}>
                      - {evidence}
                    </Text>
                  ))}
                </View>

                <Text style={{ color: '#173241', fontWeight: '700' }}>Confidence: {response.confidence}</Text>

                <View style={{ gap: 4 }}>
                  <Text style={{ fontWeight: '700', color: '#10212d' }}>Next Best Action</Text>
                  <Text style={{ color: '#173241', lineHeight: 20 }}>{response.nextBestAction}</Text>
                </View>
              </View>
            )}
          </SectionCard>
        </ScrollView>
      </KeyboardDismissView>
    </ScreenBackground>
  );
};
