import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { OptionChips } from './OptionChips';
import { AddedTippetSection, LeaderFormula, RigPreset, RigSetup, TippetSize } from '@/types/rig';
import { applyLeaderFormulaToRig, createRigPresetPayload } from '@/utils/rigSetup';
import { LeaderFormulaEditor } from './LeaderFormulaEditor';
import { RigPresetEditor } from './RigPresetEditor';
import { SectionCard } from '@/components/ui/SectionCard';
import { AppButton } from '@/components/ui/AppButton';
import { appTheme } from '@/design/theme';

const TIPPET_SIZES: TippetSize[] = ['5x', '6x', '7x', '8x'];

interface RigSetupPanelProps {
  title: string;
  rigSetup: RigSetup;
  flyCount: number;
  onFlyCountChange?: (nextCount: 1 | 2 | 3) => void;
  savedLeaderFormulas: LeaderFormula[];
  savedRigPresets: RigPreset[];
  onChange: (next: RigSetup) => void;
  onCreateLeaderFormula: (payload: { name: string; sections: LeaderFormula['sections'] }) => Promise<LeaderFormula>;
  onCreateRigPreset: (payload: Omit<RigPreset, 'id' | 'userId' | 'createdAt'>) => Promise<RigPreset>;
  onApplyRigPreset: (preset: RigPreset) => void;
  onDeleteLeaderFormula?: (formulaId: number) => Promise<void>;
  onDeleteRigPreset?: (presetId: number) => Promise<void>;
}

export const RigSetupPanel = ({
  title,
  rigSetup,
  flyCount,
  onFlyCountChange,
  savedLeaderFormulas,
  savedRigPresets,
  onChange,
  onCreateLeaderFormula,
  onCreateRigPreset,
  onApplyRigPreset,
  onDeleteLeaderFormula,
  onDeleteRigPreset
}: RigSetupPanelProps) => {
  const [showFormulaList, setShowFormulaList] = useState(false);
  const [showFormulaEditor, setShowFormulaEditor] = useState(false);
  const [showPresetList, setShowPresetList] = useState(false);
  const [showPresetEditor, setShowPresetEditor] = useState(false);
  const sortedFormulas = useMemo(() => [...savedLeaderFormulas].sort((left, right) => left.name.localeCompare(right.name)), [savedLeaderFormulas]);
  const sortedPresets = useMemo(() => [...savedRigPresets].sort((left, right) => left.name.localeCompare(right.name)), [savedRigPresets]);

  return (
    <SectionCard title={title} subtitle="Keep leader formulas, rig presets, fly count, and tippet sections in one place.">

      {!!sortedFormulas.length ? (
        <>
          <AppButton label={showFormulaList ? 'Hide Saved Leader Formulas' : 'Choose Saved Leader Formula'} onPress={() => setShowFormulaList((current) => !current)} variant="secondary" />
          {showFormulaList ? (
            <ScrollView style={{ maxHeight: 180, borderWidth: 1, borderColor: appTheme.colors.borderStrong, borderRadius: appTheme.radius.md, backgroundColor: appTheme.colors.surfaceLight }}>
              {sortedFormulas.map((formula) => (
                <View
                  key={formula.id}
                  style={{ paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#d8e2eb', gap: 8 }}
                >
                  <Pressable
                    onPress={() => {
                      onChange(applyLeaderFormulaToRig(rigSetup, formula));
                      setShowFormulaList(false);
                    }}
                  >
                    <Text style={{ color: appTheme.colors.textDark, fontWeight: '700' }}>{formula.name}</Text>
                    <Text style={{ color: appTheme.colors.textDarkSoft, fontSize: 12 }}>
                      {formula.sections.map((section) => `${section.lengthFeet} ft ${section.materialLabel}`).join(' | ')}
                    </Text>
                  </Pressable>
                  {onDeleteLeaderFormula ? (
                    <AppButton
                      label="Delete Formula"
                      onPress={() => {
                        onDeleteLeaderFormula(formula.id).catch(console.error);
                        if (rigSetup.leaderFormulaId === formula.id) {
                          onChange(applyLeaderFormulaToRig(rigSetup, null));
                        }
                      }}
                      variant="danger"
                    />
                  ) : null}
                </View>
              ))}
            </ScrollView>
          ) : null}
        </>
      ) : null}

      <AppButton label={showPresetEditor ? 'Hide Rig Preset Saver' : 'Save Current as Rig Preset'} onPress={() => setShowPresetEditor((current) => !current)} variant="ghost" />

      {showPresetEditor ? (
        <RigPresetEditor
          onSave={async (name) => {
            await onCreateRigPreset(createRigPresetPayload(rigSetup, name));
            setShowPresetEditor(false);
          }}
        />
      ) : null}

      {!!sortedPresets.length ? (
        <>
          <AppButton label={showPresetList ? 'Hide Rig Presets' : 'Apply Saved Rig Preset'} onPress={() => setShowPresetList((current) => !current)} variant="secondary" />
          {showPresetList ? (
            <ScrollView style={{ maxHeight: 180, borderWidth: 1, borderColor: appTheme.colors.borderStrong, borderRadius: appTheme.radius.md, backgroundColor: appTheme.colors.surfaceLight }}>
              {sortedPresets.map((preset) => (
                <View
                  key={preset.id}
                  style={{ paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#d8e2eb', gap: 8 }}
                >
                  <Pressable
                    onPress={() => {
                      onApplyRigPreset(preset);
                      setShowPresetList(false);
                    }}
                  >
                    <Text style={{ color: appTheme.colors.textDark, fontWeight: '700' }}>{preset.name}</Text>
                    <Text style={{ color: appTheme.colors.textDarkSoft, fontSize: 12 }}>
                      {preset.flyCount} fly{preset.flyCount === 1 ? '' : 's'} | {preset.positions.join(' | ')}
                    </Text>
                  </Pressable>
                  {onDeleteRigPreset ? (
                    <AppButton
                      label="Delete Rig Preset"
                      onPress={() => {
                        onDeleteRigPreset(preset.id).catch(console.error);
                      }}
                      variant="danger"
                    />
                  ) : null}
                </View>
              ))}
            </ScrollView>
          ) : null}
        </>
      ) : null}

      <AppButton label={showFormulaEditor ? 'Hide Leader Formula Builder' : 'Quick Add Leader Formula'} onPress={() => setShowFormulaEditor((current) => !current)} variant="tertiary" />

      {showFormulaEditor ? (
        <LeaderFormulaEditor
          onSave={async (payload) => {
            const saved = await onCreateLeaderFormula(payload);
            onChange(applyLeaderFormulaToRig(rigSetup, saved));
            setShowFormulaEditor(false);
          }}
        />
      ) : null}

      {onFlyCountChange ? (
        <OptionChips
          label="Fly Count"
          options={['1', '2', '3'] as const}
          value={String(flyCount || 1)}
          onChange={(value) => onFlyCountChange(Number(value) as 1 | 2 | 3)}
        />
      ) : null}

      <View style={{ gap: 8 }}>
        {rigSetup.addedTippetSections.map((section, index) => (
          <View key={`${section.label}-${index}`} style={{ gap: 8, borderRadius: appTheme.radius.md, padding: 10, backgroundColor: appTheme.colors.surfaceMuted }}>
            <Text style={{ color: '#f7fdff', fontWeight: '700' }}>{section.label}</Text>
            <OptionChips
              label="Tippet Size"
              options={TIPPET_SIZES}
              value={section.size}
              onChange={(value) =>
                onChange({
                  ...rigSetup,
                  addedTippetSections: rigSetup.addedTippetSections.map((entry, entryIndex) =>
                    entryIndex === index ? { ...entry, size: value as TippetSize } : entry
                  )
                })
              }
            />
            <TextInput
              value={section.lengthFeet ? String(section.lengthFeet) : ''}
              onChangeText={(value) =>
                onChange({
                  ...rigSetup,
                  addedTippetSections: rigSetup.addedTippetSections.map((entry, entryIndex): AddedTippetSection =>
                    entryIndex === index ? { ...entry, lengthFeet: value ? Number(value) : undefined } : entry
                  )
                })
              }
              placeholder="Added tippet length (feet)"
              keyboardType="decimal-pad"
              placeholderTextColor="#5a6c78"
              style={{ borderWidth: 1, borderColor: appTheme.colors.borderStrong, padding: 12, borderRadius: appTheme.radius.md, backgroundColor: appTheme.colors.inputBg, color: appTheme.colors.textDark }}
            />
          </View>
        ))}
      </View>

      {rigSetup.leaderFormulaName ? (
        <View style={{ gap: 4, borderRadius: appTheme.radius.md, padding: 10, backgroundColor: appTheme.colors.surfaceMuted }}>
          <Text style={{ color: '#f7fdff', fontWeight: '700' }}>Leader Formula: {rigSetup.leaderFormulaName}</Text>
          <Text style={{ color: '#d7f3ff' }}>
            {rigSetup.leaderFormulaSectionsSnapshot.map((section) => `${section.lengthFeet} ft ${section.materialLabel}`).join(' | ')}
          </Text>
        </View>
      ) : null}
    </SectionCard>
  );
};
