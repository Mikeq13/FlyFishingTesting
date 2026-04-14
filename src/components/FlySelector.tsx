import React from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { FlySetup, SavedFly } from '@/types/fly';

interface FlySelectorProps {
  title: string;
  value: FlySetup;
  savedFlies: SavedFly[];
  onChange: (v: FlySetup) => void;
  onSave: () => void;
}

export const FlySelector = ({ title, value, savedFlies, onChange, onSave }: FlySelectorProps) => (
  <View style={{ gap: 8, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12 }}>
    <Text style={{ fontWeight: '700' }}>{title}</Text>
    <TextInput value={value.name} placeholder="Fly name" onChangeText={(name) => onChange({ ...value, name })} style={{ borderWidth: 1, padding: 8, borderRadius: 6 }} />
    <TextInput value={value.intent} placeholder="intent: imitative|attractor" onChangeText={(intent) => onChange({ ...value, intent: intent as FlySetup['intent'] })} style={{ borderWidth: 1, padding: 8, borderRadius: 6 }} />
    <TextInput keyboardType="numeric" value={String(value.beadSizeMm)} placeholder="bead size mm" onChangeText={(t) => onChange({ ...value, beadSizeMm: Number(t || 0) })} style={{ borderWidth: 1, padding: 8, borderRadius: 6 }} />
    <TextInput value={value.bodyType} placeholder="body type" onChangeText={(bodyType) => onChange({ ...value, bodyType: bodyType as FlySetup['bodyType'] })} style={{ borderWidth: 1, padding: 8, borderRadius: 6 }} />
    <TextInput value={value.collar} placeholder="collar" onChangeText={(collar) => onChange({ ...value, collar: collar as FlySetup['collar'] })} style={{ borderWidth: 1, padding: 8, borderRadius: 6 }} />
    <Pressable onPress={onSave} style={{ backgroundColor: '#2a9d8f', padding: 10, borderRadius: 8 }}>
      <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Save To Fly Library</Text>
    </Pressable>

    {!!savedFlies.length && (
      <View style={{ gap: 6 }}>
        <Text style={{ fontWeight: '600' }}>Saved flies</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {savedFlies.map((fly) => (
            <Pressable
              key={fly.id}
              onPress={() => onChange({ name: fly.name, intent: fly.intent, beadSizeMm: fly.beadSizeMm, bodyType: fly.bodyType, collar: fly.collar })}
              style={{ paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999, backgroundColor: '#e8f7f4', borderWidth: 1, borderColor: '#2a9d8f' }}
            >
              <Text style={{ fontWeight: '600', color: '#0b3d3a' }}>{fly.name}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    )}
  </View>
);
