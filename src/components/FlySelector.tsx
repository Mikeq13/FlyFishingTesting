import React, { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { FlySetup, SavedFly } from '@/types/fly';
import { BEAD_COLORS, BEAD_SIZES_MM, BODY_TYPES, BUG_FAMILY_LABEL, BUG_STAGE_LABEL, COLLAR_TYPES, FLY_INTENTS, HOOK_SIZES, INSECT_STAGES_BY_TYPE, INSECT_TYPES, TAIL_TYPES } from '@/constants/options';
import { SectionCard } from '@/components/ui/SectionCard';
import { AppButton } from '@/components/ui/AppButton';
import { appTheme } from '@/design/theme';

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
    <Text style={{ fontWeight: '700', color: appTheme.colors.textMuted }}>{label}</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((option) => (
        <Pressable
          key={String(option)}
          onPress={() => onSelect(option)}
          style={{
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: appTheme.radius.pill,
            borderWidth: 1,
            borderColor: selected === option ? appTheme.colors.chipSelectedBorder : appTheme.colors.chipBorder,
            backgroundColor: selected === option ? appTheme.colors.chipSelectedBg : appTheme.colors.chipBg
          }}
        >
          <Text style={{ color: appTheme.colors.text }}>{String(option)}</Text>
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
    <SectionCard title={title} subtitle="Choose a saved fly or build one quickly without leaving the current flow.">

      {!!sortedSavedFlies.length && (
        <View style={{ gap: 6 }}>
          <AppButton label={showSavedFlyList ? 'Hide Saved Flies' : 'Choose Saved Fly'} onPress={() => setShowSavedFlyList((current) => !current)} variant="secondary" />
          {showSavedFlyList && (
            <View style={{ borderWidth: 1, borderColor: appTheme.colors.borderStrong, borderRadius: appTheme.radius.md, backgroundColor: appTheme.colors.surfaceLight }}>
              {sortedSavedFlies.map((fly) => (
                <Pressable
                  key={fly.id}
                  onPress={() => {
                    onChange({
                      name: fly.name,
                      intent: fly.intent,
                      hookSize: fly.hookSize ?? 16,
                      beadSizeMm: fly.beadSizeMm,
                      beadColor: fly.beadColor ?? 'black',
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
                  <Text style={{ fontWeight: '600', color: appTheme.colors.textDark }}>{fly.name}</Text>
                  <Text style={{ color: appTheme.colors.textDarkSoft, fontSize: 12 }}>
                    {fly.bugFamily} | {fly.bugStage} | #{fly.hookSize} | {fly.beadColor}
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
        style={{ borderWidth: 1, borderColor: appTheme.colors.borderStrong, padding: 12, borderRadius: appTheme.radius.md, backgroundColor: appTheme.colors.inputBg, color: appTheme.colors.textDark }}
      />
      <ChipGroup label="Fly Type" options={FLY_INTENTS} selected={value.intent} onSelect={(intent) => onChange({ ...value, intent })} />
      <ChipGroup label="Hook Size" options={HOOK_SIZES} selected={value.hookSize ?? 16} onSelect={(hookSize) => onChange({ ...value, hookSize })} />
      <ChipGroup label="Bead Size" options={BEAD_SIZES_MM} selected={value.beadSizeMm} onSelect={(beadSizeMm) => onChange({ ...value, beadSizeMm })} />
      <ChipGroup label="Bead Color" options={BEAD_COLORS} selected={value.beadColor} onSelect={(beadColor) => onChange({ ...value, beadColor })} />
      <ChipGroup label="Body Type" options={BODY_TYPES} selected={value.bodyType} onSelect={(bodyType) => onChange({ ...value, bodyType })} />
      <ChipGroup label={BUG_FAMILY_LABEL} options={INSECT_TYPES} selected={value.bugFamily} onSelect={(bugFamily) => onChange({ ...value, bugFamily, bugStage: INSECT_STAGES_BY_TYPE[bugFamily][0] })} />
      <ChipGroup label={BUG_STAGE_LABEL} options={availableStages} selected={availableStages.includes(value.bugStage) ? value.bugStage : availableStages[0]} onSelect={(bugStage) => onChange({ ...value, bugStage })} />
      <ChipGroup label="Tail" options={TAIL_TYPES} selected={value.tail} onSelect={(tail) => onChange({ ...value, tail })} />
      <ChipGroup label="Collar" options={COLLAR_TYPES} selected={value.collar} onSelect={(collar) => onChange({ ...value, collar })} />

      <AppButton label="Save To Fly Library" onPress={onSave} />
    </SectionCard>
  );
};
