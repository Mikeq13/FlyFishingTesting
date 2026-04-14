import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { PremiumFeatureGate } from '@/components/PremiumFeatureGate';
import { useAppStore } from './store';
import { buildAggregates } from '@/engine/aggregationEngine';
import { buildAIContext } from '@/ai/aiContextBuilder';
import { runCoach } from '@/ai/coachEngine';
import { ScreenBackground } from '@/components/ScreenBackground';

export const CoachScreen = () => {
  const { sessions, experiments, insights, currentHasPremiumAccess } = useAppStore();
  const [question, setQuestion] = useState('What am I doing wrong in pools?');
  const [response, setResponse] = useState<ReturnType<typeof runCoach> | null>(null);

  const context = useMemo(
    () => buildAIContext(sessions, buildAggregates(sessions, experiments), insights, experiments, sessions[0]),
    [sessions, experiments, insights]
  );

  if (!currentHasPremiumAccess) {
    return (
      <ScreenBackground>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }} keyboardShouldPersistTaps="handled">
          <PremiumFeatureGate
            title="Premium AI Coach"
            description="The AI coach is part of premium access so you can ask questions against your saved fishing history and experiment data."
          />
        </ScrollView>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }} keyboardShouldPersistTaps="handled">
      <Text style={{ fontSize: 20, fontWeight: '700', color: 'white' }}>AI Coach</Text>
      <TextInput value={question} onChangeText={setQuestion} style={{ borderWidth: 1, padding: 10, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.95)' }} />
      <Pressable onPress={() => setResponse(runCoach(question, context))} style={{ backgroundColor: '#264653', padding: 12, borderRadius: 8 }}>
        <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Ask AI Coach</Text>
      </Pressable>

      {response && (
        <View style={{ gap: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', borderRadius: 8, padding: 12, backgroundColor: 'rgba(255,255,255,0.92)' }}>
          <Text style={{ fontWeight: '700' }}>Summary</Text>
          <Text>{response.summary}</Text>
          <Text style={{ fontWeight: '700' }}>Evidence</Text>
          {response.evidence.map((e, i) => <Text key={i}>• {e}</Text>)}
          <Text style={{ fontWeight: '700' }}>Confidence: {response.confidence}</Text>
          <Text style={{ fontWeight: '700' }}>Next best action</Text>
          <Text>{response.nextBestAction}</Text>
        </View>
      )}
      </ScrollView>
    </ScreenBackground>
  );
};
