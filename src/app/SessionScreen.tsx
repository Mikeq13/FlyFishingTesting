import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput } from 'react-native';
import { DepthSelector } from '@/components/DepthSelector';
import { OptionChips } from '@/components/OptionChips';
import { DEPTH_RANGES, INSECT_STAGES_BY_TYPE, INSECT_TYPES, WATER_TYPES } from '@/constants/options';
import { useAppStore } from './store';
import { InsectStage, InsectType, WaterType } from '@/types/session';
import { ScreenBackground } from '@/components/ScreenBackground';

export const SessionScreen = ({ navigation }: any) => {
  const { addSession, addSavedRiver, savedRivers, users, activeUserId } = useAppStore();
  const activeUser = users.find((user) => user.id === activeUserId);
  const [waterType, setWaterType] = useState<WaterType>('run');
  const [depthRange, setDepthRange] = useState<typeof DEPTH_RANGES[number]>('1-3 ft');
  const [insectType, setInsectType] = useState<InsectType>('mayfly');
  const [insectStage, setInsectStage] = useState<InsectStage>('nymph');
  const [riverName, setRiverName] = useState('');
  const [notes, setNotes] = useState('');
  const availableStages = INSECT_STAGES_BY_TYPE[insectType];

  useEffect(() => {
    if (!availableStages.includes(insectStage)) {
      setInsectStage(availableStages[0]);
    }
  }, [availableStages, insectStage]);

  const saveRiver = async () => {
    const normalizedRiverName = riverName.trim();
    if (!normalizedRiverName) return;
    if (savedRivers.some((river) => river.name.trim().toLowerCase() === normalizedRiverName.toLowerCase())) return;
    await addSavedRiver(normalizedRiverName);
  };

  const onStart = async () => {
    const normalizedRiverName = riverName.trim();
    if (normalizedRiverName) {
      await saveRiver();
    }

    const id = await addSession({
      date: new Date().toISOString(),
      waterType,
      depthRange,
      riverName: normalizedRiverName || undefined,
      insectType,
      insectStage,
      insectConfidence: 'medium',
      notes
    });
    navigation.navigate('Experiment', { sessionId: id });
  };

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: 'white' }}>Active Session</Text>
        <Text style={{ color: '#dbf5ff', fontWeight: '700' }}>Angler: {activeUser?.name ?? 'Loading...'}</Text>
        <OptionChips label="Water Type" options={WATER_TYPES} value={waterType} onChange={setWaterType} />
        <Text style={{ color: 'white', fontWeight: '700' }}>Depth Range</Text>
        <DepthSelector value={depthRange} onChange={setDepthRange} />
        <Text style={{ color: 'white', fontWeight: '700' }}>River</Text>
        <TextInput value={riverName} onChangeText={setRiverName} placeholder="river name" style={{ borderWidth: 1, padding: 10, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.95)' }} />
        {!!savedRivers.length && <OptionChips label="Saved Rivers" options={savedRivers.map((river) => river.name)} value={riverName} onChange={setRiverName} />}
        <OptionChips label="Bug Family" options={INSECT_TYPES} value={insectType} onChange={setInsectType} />
        <OptionChips label="Bug Stage" options={availableStages} value={insectStage} onChange={setInsectStage} />
        <TextInput value={notes} onChangeText={setNotes} placeholder="notes" multiline style={{ borderWidth: 1, padding: 10, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.95)' }} />
        <Pressable onPress={onStart} style={{ backgroundColor: '#2a9d8f', padding: 12, borderRadius: 8 }}>
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Start Experiment</Text>
        </Pressable>
      </ScrollView>
    </ScreenBackground>
  );
};
