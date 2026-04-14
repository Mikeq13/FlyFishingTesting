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
import { Pressable, Text, TextInput, View } from 'react-native';
import { FlySetup } from '@/types/fly';
import { BEAD_SIZES_MM, BODY_TYPES, COLLAR_TYPES, FLY_INTENTS } from '@/constants/options';

const ChipGroup = <T extends string | number>({
  label, options, selected, onSelect
}: {
  label: string;
  options: readonly T[];
  selected: T;
  onSelect: (value: T) => void;
}) => (
  <View style={{ gap: 6 }}>
    <Text style={{ fontWeight: '600' }}>{label}</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((o) => (
        <Pressable
          key={String(o)}
          onPress={() => onSelect(o)}
          style={{
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: selected === o ? '#2a9d8f' : '#aaa'
          }}
        >
          <Text>{String(o)}</Text>
        </Pressable>
      ))}
    </View>
  </View>
);

export const FlySelector = ({
  title,
  value,
  onChange
}: {
  title: string;
  value: FlySetup;
  onChange: (v: FlySetup) => void;
}) => (
  <View style={{ gap: 10, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12 }}>
    <Text style={{ fontWeight: '700' }}>{title}</Text>

    <TextInput
      value={value.name}
      placeholder="Fly name"
      onChangeText={(name) => onChange({ ...value, name })}
      style={{ borderWidth: 1, padding: 8, borderRadius: 6 }}
    />

    <ChipGroup label="Intent" options={FLY_INTENTS} selected={value.intent} onSelect={(intent) => onChange({ ...value, intent })} />
    <ChipGroup label="Bead size (mm)" options={BEAD_SIZES_MM} selected={value.beadSizeMm} onSelect={(beadSizeMm) => onChange({ ...value, beadSizeMm })} />
    <ChipGroup label="Body type" options={BODY_TYPES} selected={value.bodyType} onSelect={(bodyType) => onChange({ ...value, bodyType })} />
    <ChipGroup label="Collar" options={COLLAR_TYPES} selected={value.collar} onSelect={(collar) => onChange({ ...value, collar })} />
  </View>
);
