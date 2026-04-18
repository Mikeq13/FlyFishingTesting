import React, { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { FlySetup, SavedFly } from '@/types/fly';
import { BEAD_COLORS, BEAD_SIZES_MM, BODY_TYPES, BUG_FAMILY_LABEL, BUG_STAGE_LABEL, COLLAR_TYPES, FLY_INTENTS, HOOK_SIZES, INSECT_STAGES_BY_TYPE, INSECT_TYPES, TAIL_TYPES } from '@/constants/options';
import { SectionCard } from '@/components/ui/SectionCard';
import { AppButton } from '@/components/ui/AppButton';
import { useTheme } from '@/design/theme';

interface FlySelectorProps {
  title: string;
  value: FlySetup;
  savedFlies: SavedFly[];
  onChange: (v: FlySetup) => void;
  onSave: () => void;
  onConfirm?: () => void;
  confirmLabel?: string;
}

interface ChipGroupProps<T extends string | number> {
  label: string;
  options: readonly T[];
  selected: T;
  onSelect: (value: T) => void;
  tone?: 'dark' | 'light';
}

const ChipGroup = <T extends string | number>({ label, options, selected, onSelect, tone = 'light' }: ChipGroupProps<T>) => {
  const { theme } = useTheme();
  const isLightTone = tone === 'light';

  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontWeight: '700', color: isLightTone ? theme.colors.textDarkSoft : theme.colors.textMuted }}>{label}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map((option) => (
          <Pressable
            key={String(option)}
            onPress={() => onSelect(option)}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: theme.radius.pill,
              borderWidth: 1,
              borderColor: selected === option ? theme.colors.chipSelectedBorder : theme.colors.chipBorder,
              backgroundColor: selected === option ? theme.colors.chipSelectedBg : theme.colors.chipBg
            }}
          >
            <Text style={{ color: selected === option ? theme.colors.chipSelectedText : isLightTone ? theme.colors.textDark : theme.colors.text }}>
              {String(option)}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
};

export const FlySelector = ({ title, value, savedFlies, onChange, onSave, onConfirm, confirmLabel = 'Use This Fly' }: FlySelectorProps) => {
  const { theme } = useTheme();
  const [showSavedFlyList, setShowSavedFlyList] = useState(false);
  const sortedSavedFlies = useMemo(() => [...savedFlies].sort((a, b) => a.name.localeCompare(b.name)), [savedFlies]);
  const availableStages = INSECT_STAGES_BY_TYPE[value.bugFamily];
  const hasNamedFly = !!value.name.trim();

  return (
    <SectionCard title={title} subtitle="Choose a saved fly or build one quickly without leaving the current flow." tone="light">

      {!!sortedSavedFlies.length && (
        <View style={{ gap: 6 }}>
          <AppButton label={showSavedFlyList ? 'Hide Existing Flies' : 'Existing Fly'} onPress={() => setShowSavedFlyList((current) => !current)} variant="secondary" />
          {showSavedFlyList && (
            <View style={{ borderWidth: 1, borderColor: theme.colors.borderStrong, borderRadius: theme.radius.md, backgroundColor: theme.colors.surfaceLight }}>
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
                    onConfirm?.();
                  }}
                  style={{ paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight }}
                >
                  <Text style={{ fontWeight: '600', color: theme.colors.textDark }}>{fly.name}</Text>
                  <Text style={{ color: theme.colors.textDarkSoft, fontSize: 12 }}>
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
        placeholderTextColor={theme.colors.inputPlaceholder}
        style={{ borderWidth: 1, borderColor: theme.colors.borderStrong, padding: 12, borderRadius: theme.radius.md, backgroundColor: theme.colors.inputBg, color: theme.colors.textDark }}
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

      {onConfirm ? <AppButton label={confirmLabel} onPress={onConfirm} disabled={!hasNamedFly} surfaceTone="light" /> : null}
      <AppButton label="Save To Fly Library" onPress={onSave} surfaceTone="light" />
    </SectionCard>
  );
};
