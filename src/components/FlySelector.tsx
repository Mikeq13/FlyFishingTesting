import React from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { FlySetup, SavedFly } from '@/types/fly';
import { BEAD_SIZES_MM, BODY_TYPES, COLLAR_TYPES, FLY_INTENTS } from '@/constants/options';

interface FlySelectorProps {
  title: string;
  value: FlySetup;
  savedFlies: SavedFly[];
  onChange: (v: FlySetup) => void;
  onSave: () => void;
}

interface ChipGroupProps<T extends string | number> {
  label: string;
  options: readonly T[];
  selected: T;
  onSelect: (value: T) => void;
}

const ChipGroup = <T extends string | number>({ label, options, selected, onSelect }: ChipGroupProps<T>) => (
  <View style={{ gap: 6 }}>
    <Text style={{ fontWeight: '600' }}>{label}</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((option) => (
        <Pressable
          key={String(option)}
          onPress={() => onSelect(option)}
          style={{
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: selected === option ? '#2a9d8f' : '#aaa',
            backgroundColor: selected === option ? '#e8f7f4' : 'transparent'
          }}
        >
          <Text style={{ color: selected === option ? '#0b3d3a' : '#1f2933' }}>{String(option)}</Text>
        </Pressable>
      ))}
    </View>
  </View>
);

export const FlySelector = ({ title, value, savedFlies, onChange, onSave }: FlySelectorProps) => (
  <View style={{ gap: 10, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12 }}>
    <Text style={{ fontWeight: '700' }}>{title}</Text>
    <TextInput
      value={value.name}
      placeholder="Fly name"
      onChangeText={(name) => onChange({ ...value, name })}
      style={{ borderWidth: 1, padding: 8, borderRadius: 6 }}
    />
    <ChipGroup label="Intent" options={FLY_INTENTS} selected={value.intent} onSelect={(intent) => onChange({ ...value, intent })} />
    <ChipGroup label="Bead Size" options={BEAD_SIZES_MM} selected={value.beadSizeMm} onSelect={(beadSizeMm) => onChange({ ...value, beadSizeMm })} />
    <ChipGroup label="Body Type" options={BODY_TYPES} selected={value.bodyType} onSelect={(bodyType) => onChange({ ...value, bodyType })} />
    <ChipGroup label="Collar" options={COLLAR_TYPES} selected={value.collar} onSelect={(collar) => onChange({ ...value, collar })} />

    <Pressable onPress={onSave} style={{ backgroundColor: '#2a9d8f', padding: 10, borderRadius: 8 }}>
      <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Save To Fly Library</Text>
    </Pressable>

    {!!savedFlies.length && (
      <View style={{ gap: 6 }}>
        <Text style={{ fontWeight: '600' }}>Saved flies</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {[...savedFlies]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((fly) => (
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
