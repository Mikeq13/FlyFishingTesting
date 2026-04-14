import React from 'react';
import { Text, TextInput, View } from 'react-native';
import { FlySetup } from '@/types/fly';

export const FlySelector = ({ title, value, onChange }: { title: string; value: FlySetup; onChange: (v: FlySetup) => void }) => (
  <View style={{ gap: 8, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12 }}>
    <Text style={{ fontWeight: '700' }}>{title}</Text>
    <TextInput value={value.name} placeholder="Fly name" onChangeText={(name) => onChange({ ...value, name })} style={{ borderWidth: 1, padding: 8, borderRadius: 6 }} />
    <TextInput value={value.intent} placeholder="intent: imitative|attractor" onChangeText={(intent) => onChange({ ...value, intent: intent as FlySetup['intent'] })} style={{ borderWidth: 1, padding: 8, borderRadius: 6 }} />
    <TextInput keyboardType="numeric" value={String(value.beadSizeMm)} placeholder="bead size mm" onChangeText={(t) => onChange({ ...value, beadSizeMm: Number(t || 0) })} style={{ borderWidth: 1, padding: 8, borderRadius: 6 }} />
    <TextInput value={value.bodyType} placeholder="body type" onChangeText={(bodyType) => onChange({ ...value, bodyType: bodyType as FlySetup['bodyType'] })} style={{ borderWidth: 1, padding: 8, borderRadius: 6 }} />
    <TextInput value={value.collar} placeholder="collar" onChangeText={(collar) => onChange({ ...value, collar: collar as FlySetup['collar'] })} style={{ borderWidth: 1, padding: 8, borderRadius: 6 }} />
  </View>
);
