import React, { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput } from 'react-native';
import { DepthSelector } from '@/components/DepthSelector';
import { useAppStore } from './store';
import { Confidence, DepthRange, InsectStage, InsectType, WaterType } from '@/types/session';

export const SessionScreen = ({ navigation }: any) => {
  const { addSession } = useAppStore();
  const [waterType, setWaterType] = useState<WaterType>('run');
  const [depthRange, setDepthRange] = useState<DepthRange>('1-3 ft');
  const [insectType, setInsectType] = useState<InsectType>('mayfly');
  const [insectStage, setInsectStage] = useState<InsectStage>('emerger');
  const [insectConfidence, setInsectConfidence] = useState<Confidence>('medium');
  const [notes, setNotes] = useState('');

  const onStart = async () => {
    const id = await addSession({
      date: new Date().toISOString(),
      waterType,
      depthRange,
      insectType,
      insectStage,
      insectConfidence,
      notes
    });
    navigation.navigate('Experiment', { sessionId: id });
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: '700' }}>Active Session</Text>
      <TextInput value={waterType} onChangeText={(v) => setWaterType(v as WaterType)} placeholder="water type" style={{ borderWidth: 1, padding: 10, borderRadius: 8 }} />
      <DepthSelector value={depthRange} onChange={setDepthRange} />
      <TextInput value={insectType} onChangeText={(v) => setInsectType(v as InsectType)} placeholder="insect type" style={{ borderWidth: 1, padding: 10, borderRadius: 8 }} />
      <TextInput value={insectStage} onChangeText={(v) => setInsectStage(v as InsectStage)} placeholder="insect stage" style={{ borderWidth: 1, padding: 10, borderRadius: 8 }} />
      <TextInput value={insectConfidence} onChangeText={(v) => setInsectConfidence(v as Confidence)} placeholder="confidence" style={{ borderWidth: 1, padding: 10, borderRadius: 8 }} />
      <TextInput value={notes} onChangeText={setNotes} placeholder="notes" multiline style={{ borderWidth: 1, padding: 10, borderRadius: 8 }} />
      <Pressable onPress={onStart} style={{ backgroundColor: '#2a9d8f', padding: 12, borderRadius: 8 }}>
        <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Start Experiment</Text>
      </Pressable>
    </ScrollView>
  );
};
