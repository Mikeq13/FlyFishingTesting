import React, { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { FlySetup, SavedFly } from '@/types/fly';
import { BEAD_SIZES_MM, BODY_TYPES, BUG_FAMILY_LABEL, BUG_STAGE_LABEL, COLLAR_TYPES, FLY_INTENTS, HOOK_SIZES, INSECT_STAGES_BY_TYPE, INSECT_TYPES, TAIL_TYPES } from '@/constants/options';

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
    <Text style={{ fontWeight: '700', color: '#d7f3ff' }}>{label}</Text>
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
            borderColor: selected === option ? '#2a9d8f' : 'rgba(202,240,248,0.18)',
            backgroundColor: selected === option ? '#2a9d8f' : 'rgba(255,255,255,0.10)'
          }}
        >
          <Text style={{ color: selected === option ? '#f7fdff' : '#d7f3ff' }}>{String(option)}</Text>
        </Pressable>
      ))}
    </View>
  </View>
);

export const FlySelector = ({ title, value, savedFlies, onChange, onSave }: FlySelectorProps) => {
  const [showSavedFlyList, setShowSavedFlyList] = useState(false);
  const sortedSavedFlies = useMemo(() => [...savedFlies].sort((a, b) => a.name.localeCompare(b.name)), [savedFlies]);
  const availableStages = INSECT_STAGES_BY_TYPE[value.bugFamily];

  return (
    <View style={{ gap: 10, borderWidth: 1, borderColor: 'rgba(202,240,248,0.16)', borderRadius: 18, padding: 14, backgroundColor: 'rgba(6, 27, 44, 0.70)' }}>
      <Text style={{ fontWeight: '800', fontSize: 18, color: '#f7fdff' }}>{title}</Text>

      {!!sortedSavedFlies.length && (
        <View style={{ gap: 6 }}>
          <Pressable onPress={() => setShowSavedFlyList((current) => !current)} style={{ backgroundColor: '#1d3557', padding: 12, borderRadius: 12 }}>
            <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>
              {showSavedFlyList ? 'Hide Saved Flies' : 'Choose Saved Fly'}
            </Text>
          </Pressable>
          {showSavedFlyList && (
            <View style={{ borderWidth: 1, borderColor: 'rgba(202,240,248,0.18)', borderRadius: 12, backgroundColor: 'rgba(245,252,255,0.96)' }}>
              {sortedSavedFlies.map((fly) => (
                <Pressable
                  key={fly.id}
                  onPress={() => {
                    onChange({
                      name: fly.name,
                      intent: fly.intent,
                      hookSize: fly.hookSize ?? 16,
                      beadSizeMm: fly.beadSizeMm,
                      bodyType: fly.bodyType,
                      bugFamily: fly.bugFamily ?? 'mayfly',
                      bugStage: fly.bugStage ?? 'nymph',
                      tail: fly.tail ?? 'natural',
                      collar: fly.collar
                    });
                    setShowSavedFlyList(false);
                  }}
                  style={{ paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#d8e2eb' }}
                >
                  <Text style={{ fontWeight: '600', color: '#0b3d3a' }}>{fly.name}</Text>
                  <Text style={{ color: '#4b5563', fontSize: 12 }}>
                    {fly.bugFamily} | {fly.bugStage} | #{fly.hookSize}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      )}

      <TextInput
        value={value.name}
        placeholder="Fly name"
        onChangeText={(name) => onChange({ ...value, name })}
        placeholderTextColor="#5a6c78"
        style={{ borderWidth: 1, borderColor: 'rgba(202,240,248,0.18)', padding: 12, borderRadius: 12, backgroundColor: 'rgba(245,252,255,0.96)', color: '#102a43' }}
      />
      <ChipGroup label="Fly Type" options={FLY_INTENTS} selected={value.intent} onSelect={(intent) => onChange({ ...value, intent })} />
      <ChipGroup label="Hook Size" options={HOOK_SIZES} selected={value.hookSize ?? 16} onSelect={(hookSize) => onChange({ ...value, hookSize })} />
      <ChipGroup label="Bead Size" options={BEAD_SIZES_MM} selected={value.beadSizeMm} onSelect={(beadSizeMm) => onChange({ ...value, beadSizeMm })} />
      <ChipGroup label="Body Type" options={BODY_TYPES} selected={value.bodyType} onSelect={(bodyType) => onChange({ ...value, bodyType })} />
      <ChipGroup label={BUG_FAMILY_LABEL} options={INSECT_TYPES} selected={value.bugFamily} onSelect={(bugFamily) => onChange({ ...value, bugFamily, bugStage: INSECT_STAGES_BY_TYPE[bugFamily][0] })} />
      <ChipGroup label={BUG_STAGE_LABEL} options={availableStages} selected={availableStages.includes(value.bugStage) ? value.bugStage : availableStages[0]} onSelect={(bugStage) => onChange({ ...value, bugStage })} />
      <ChipGroup label="Tail" options={TAIL_TYPES} selected={value.tail} onSelect={(tail) => onChange({ ...value, tail })} />
      <ChipGroup label="Collar" options={COLLAR_TYPES} selected={value.collar} onSelect={(collar) => onChange({ ...value, collar })} />

      <Pressable onPress={onSave} style={{ backgroundColor: '#2a9d8f', padding: 12, borderRadius: 12 }}>
        <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Save To Fly Library</Text>
      </Pressable>
    </View>
  );
};
