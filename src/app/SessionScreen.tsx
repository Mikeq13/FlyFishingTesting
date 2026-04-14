import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { DepthSelector } from '@/components/DepthSelector';
import { KeyboardDismissView } from '@/components/KeyboardDismissView';
import { OptionChips } from '@/components/OptionChips';
import { DEPTH_RANGES, WATER_TYPES } from '@/constants/options';
import { useAppStore } from './store';
import { WaterType } from '@/types/session';
import { ScreenBackground } from '@/components/ScreenBackground';

export const SessionScreen = ({ navigation }: any) => {
  const { addSession, addSavedRiver, savedRivers, users, activeUserId } = useAppStore();
  const activeUser = users.find((user) => user.id === activeUserId);
  const [waterType, setWaterType] = useState<WaterType>('run');
  const [depthRange, setDepthRange] = useState<typeof DEPTH_RANGES[number]>('1-3 ft');
  const [riverName, setRiverName] = useState('');
  const [notes, setNotes] = useState('');
  const [showSavedRiverList, setShowSavedRiverList] = useState(false);
  const sortedSavedRivers = useMemo(() => [...savedRivers].sort((a, b) => a.name.localeCompare(b.name)), [savedRivers]);

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
      notes
    });
    navigation.navigate('Experiment', { sessionId: id });
  };

  return (
    <ScreenBackground>
      <KeyboardDismissView>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 28, fontWeight: '800', color: '#f7fdff' }}>Session Setup</Text>
          <Text style={{ color: '#d7f3ff', lineHeight: 20 }}>Capture the water you are fishing before you start comparing flies.</Text>
          <Text style={{ color: '#dbf5ff', fontWeight: '700' }}>Angler: {activeUser?.name ?? 'Loading...'}</Text>
        </View>
        <Text style={{ color: '#d7f3ff', fontWeight: '700' }}>Water Type</Text>
        <OptionChips label="Water Type" options={WATER_TYPES} value={waterType} onChange={setWaterType} />
        <Text style={{ color: '#d7f3ff', fontWeight: '700' }}>Depth Range</Text>
        <DepthSelector value={depthRange} onChange={setDepthRange} />
        <View style={{ gap: 8, backgroundColor: 'rgba(6, 27, 44, 0.70)', padding: 14, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(202,240,248,0.16)' }}>
        <Text style={{ color: '#d7f3ff', fontWeight: '700', fontSize: 16 }}>River</Text>
        {!!sortedSavedRivers.length && (
          <>
            <Pressable onPress={() => setShowSavedRiverList((current) => !current)} style={{ backgroundColor: '#1d3557', padding: 12, borderRadius: 12 }}>
              <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>
                {showSavedRiverList ? 'Hide Saved Rivers' : 'Choose Saved River'}
              </Text>
            </Pressable>
            {showSavedRiverList && (
              <ScrollView style={{ maxHeight: 180, borderWidth: 1, borderColor: 'rgba(202,240,248,0.18)', borderRadius: 12, backgroundColor: 'rgba(245,252,255,0.96)' }}>
                {sortedSavedRivers.map((river) => (
                  <Pressable
                    key={river.id}
                    onPress={() => {
                      setRiverName(river.name);
                      setShowSavedRiverList(false);
                    }}
                    style={{ paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#d8e2eb' }}
                  >
                    <Text style={{ color: '#0b3d3a', fontWeight: '600' }}>{river.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </>
        )}
        <TextInput value={riverName} onChangeText={setRiverName} placeholder="River name" placeholderTextColor="#5a6c78" style={{ borderWidth: 1, borderColor: 'rgba(202,240,248,0.18)', padding: 12, borderRadius: 12, backgroundColor: 'rgba(245,252,255,0.96)', color: '#102a43' }} />
        <TextInput value={notes} onChangeText={setNotes} placeholder="Session notes" placeholderTextColor="#5a6c78" multiline style={{ borderWidth: 1, borderColor: 'rgba(202,240,248,0.18)', padding: 12, borderRadius: 12, backgroundColor: 'rgba(245,252,255,0.96)', color: '#102a43', minHeight: 96, textAlignVertical: 'top' }} />
        </View>
        <Pressable onPress={onStart} style={{ backgroundColor: '#2a9d8f', padding: 14, borderRadius: 14 }}>
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Start Experiment</Text>
        </Pressable>
      </ScrollView>
      </KeyboardDismissView>
    </ScreenBackground>
  );
};
