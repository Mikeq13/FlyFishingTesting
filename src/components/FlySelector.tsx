import React, { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { FlySetup, SavedFly } from '@/types/fly';
import { BEAD_COLORS, BEAD_SIZES_MM, BODY_TYPES, BUG_FAMILY_LABEL, BUG_STAGE_LABEL, COLLAR_TYPES, FLY_INTENTS, HOOK_SIZES, INSECT_STAGES_BY_TYPE, INSECT_TYPES, TAIL_TYPES } from '@/constants/options';
import { SectionCard } from '@/components/ui/SectionCard';
import { AppButton } from '@/components/ui/AppButton';
import { SurfaceTone, useTheme } from '@/design/theme';

interface FlySelectorProps {
  title: string;
  value: FlySetup;
  savedFlies: SavedFly[];
  onChange: (v: FlySetup) => void;
  onSave: () => void;
  onConfirm?: () => void;
  confirmLabel?: string;
  tone?: SurfaceTone;
  fieldMode?: 'full' | 'adjust';
}

interface ChipGroupProps<T extends string | number> {
  label: string;
  options: readonly T[];
  selected: T;
  onSelect: (value: T) => void;
  tone?: SurfaceTone;
}

const ChipGroup = <T extends string | number>({ label, options, selected, onSelect, tone = 'light' }: ChipGroupProps<T>) => {
  const { theme } = useTheme();
  const useThemeElevatedPalette = tone === 'light' && theme.id !== 'daylight_light';
  const labelColor = tone === 'light' ? (useThemeElevatedPalette ? theme.colors.textSoft : theme.colors.textDarkSoft) : tone === 'modal' ? theme.colors.modalTextSoft : theme.colors.textMuted;
  const textColor = tone === 'light' ? (useThemeElevatedPalette ? theme.colors.text : theme.colors.textDark) : tone === 'modal' ? theme.colors.modalText : theme.colors.text;

  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontWeight: '700', color: labelColor }}>{label}</Text>
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
            <Text style={{ color: selected === option ? theme.colors.chipSelectedText : textColor }}>
              {String(option)}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
};

export const FlySelector = ({
  title,
  value,
  savedFlies,
  onChange,
  onSave,
  onConfirm,
  confirmLabel = 'Use This Fly',
  tone = 'light',
  fieldMode = 'full'
}: FlySelectorProps) => {
  const { theme } = useTheme();
  const [showSavedFlyList, setShowSavedFlyList] = useState(false);
  const sortedSavedFlies = useMemo(() => [...savedFlies].sort((a, b) => a.name.localeCompare(b.name)), [savedFlies]);
  const availableStages = INSECT_STAGES_BY_TYPE[value.bugFamily];
  const hasNamedFly = !!value.name.trim();
  const isAdjustMode = fieldMode === 'adjust';
  const isModalTone = tone === 'modal';
  const useThemeElevatedPalette = tone === 'light' && theme.id !== 'daylight_light';
  const bodyTextColor = tone === 'light' ? (useThemeElevatedPalette ? theme.colors.text : theme.colors.textDark) : isModalTone ? theme.colors.modalText : theme.colors.text;
  const bodySoftColor = tone === 'light' ? (useThemeElevatedPalette ? theme.colors.textSoft : theme.colors.textDarkSoft) : isModalTone ? theme.colors.modalTextSoft : theme.colors.textSoft;
  const panelBackground = isModalTone ? theme.colors.modalSurfaceAlt : useThemeElevatedPalette ? theme.colors.surfaceAlt : theme.colors.surfaceLight;
  const panelBorder = isModalTone ? theme.colors.modalNestedBorder : theme.colors.borderStrong;

  return (
    <SectionCard title={title} subtitle="Choose a saved fly or build one quickly without leaving the current flow." tone={tone}>
      {!!sortedSavedFlies.length && (
        <View style={{ gap: 6 }}>
          <AppButton label={showSavedFlyList ? 'Hide Saved Flies' : 'Saved Flies'} onPress={() => setShowSavedFlyList((current) => !current)} variant="secondary" surfaceTone={tone} />
          {showSavedFlyList && (
            <View style={{ borderWidth: 1, borderColor: panelBorder, borderRadius: theme.radius.md, backgroundColor: panelBackground }}>
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
                  <Text style={{ fontWeight: '600', color: bodyTextColor }}>{fly.name}</Text>
                  <Text style={{ color: bodySoftColor, fontSize: 12 }}>
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
        style={{ borderWidth: 1, borderColor: panelBorder, padding: 12, borderRadius: theme.radius.md, backgroundColor: theme.colors.inputBg, color: theme.colors.inputText }}
      />
      {isAdjustMode ? (
        <View
          style={{
            gap: 8,
            borderRadius: theme.radius.md,
            padding: 12,
            borderWidth: 1,
            borderColor: panelBorder,
            backgroundColor: panelBackground
          }}
        >
          <Text style={{ color: bodyTextColor, fontWeight: '700' }}>Adjust the same fly without replacing the rest of its setup.</Text>
          <Text style={{ color: bodySoftColor, lineHeight: 20 }}>
            Keep the same fly pattern and tune the hook or bead/weight so the current experiment can continue cleanly.
          </Text>
        </View>
      ) : (
        <>
          <ChipGroup label="Fly Type" options={FLY_INTENTS} selected={value.intent} onSelect={(intent) => onChange({ ...value, intent })} tone={tone} />
          <ChipGroup label="Body Type" options={BODY_TYPES} selected={value.bodyType} onSelect={(bodyType) => onChange({ ...value, bodyType })} tone={tone} />
          <ChipGroup label={BUG_FAMILY_LABEL} options={INSECT_TYPES} selected={value.bugFamily} onSelect={(bugFamily) => onChange({ ...value, bugFamily, bugStage: INSECT_STAGES_BY_TYPE[bugFamily][0] })} tone={tone} />
          <ChipGroup label={BUG_STAGE_LABEL} options={availableStages} selected={availableStages.includes(value.bugStage) ? value.bugStage : availableStages[0]} onSelect={(bugStage) => onChange({ ...value, bugStage })} tone={tone} />
          <ChipGroup label="Tail" options={TAIL_TYPES} selected={value.tail} onSelect={(tail) => onChange({ ...value, tail })} tone={tone} />
          <ChipGroup label="Collar" options={COLLAR_TYPES} selected={value.collar} onSelect={(collar) => onChange({ ...value, collar })} tone={tone} />
        </>
      )}
      <ChipGroup label="Hook Size" options={HOOK_SIZES} selected={value.hookSize ?? 16} onSelect={(hookSize) => onChange({ ...value, hookSize })} tone={tone} />
      <ChipGroup label="Bead Size" options={BEAD_SIZES_MM} selected={value.beadSizeMm} onSelect={(beadSizeMm) => onChange({ ...value, beadSizeMm })} tone={tone} />
      <ChipGroup label="Bead Color" options={BEAD_COLORS} selected={value.beadColor} onSelect={(beadColor) => onChange({ ...value, beadColor })} tone={tone} />

      {onConfirm ? <AppButton label={confirmLabel} onPress={onConfirm} disabled={!hasNamedFly} surfaceTone={tone} /> : null}
      <AppButton label="Save To Fly Library" onPress={onSave} surfaceTone={tone} />
    </SectionCard>
  );
};
