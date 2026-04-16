import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { OptionChips } from './OptionChips';
import { AddedTippetSection, LeaderFormula, RigPreset, RigSetup, TippetSize } from '@/types/rig';
import { applyLeaderFormulaToRig, createRigPresetPayload } from '@/utils/rigSetup';
import { LeaderFormulaEditor } from './LeaderFormulaEditor';
import { RigPresetEditor } from './RigPresetEditor';

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
    <View style={{ gap: 10, borderWidth: 1, borderColor: 'rgba(202,240,248,0.16)', borderRadius: 18, padding: 14, backgroundColor: 'rgba(6, 27, 44, 0.70)' }}>
      <Text style={{ fontWeight: '800', fontSize: 18, color: '#f7fdff' }}>{title}</Text>

      {!!sortedFormulas.length ? (
        <>
          <Pressable onPress={() => setShowFormulaList((current) => !current)} style={{ backgroundColor: '#1d3557', padding: 12, borderRadius: 12 }}>
            <Text style={{ color: '#f7fdff', textAlign: 'center', fontWeight: '700' }}>
              {showFormulaList ? 'Hide Saved Leader Formulas' : 'Choose Saved Leader Formula'}
            </Text>
          </Pressable>
          {showFormulaList ? (
            <ScrollView style={{ maxHeight: 180, borderWidth: 1, borderColor: 'rgba(202,240,248,0.18)', borderRadius: 12, backgroundColor: 'rgba(245,252,255,0.96)' }}>
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
                    <Text style={{ color: '#0b3d3a', fontWeight: '700' }}>{formula.name}</Text>
                    <Text style={{ color: '#4b5563', fontSize: 12 }}>
                      {formula.sections.map((section) => `${section.lengthFeet} ft ${section.materialLabel}`).join(' | ')}
                    </Text>
                  </Pressable>
                  {onDeleteLeaderFormula ? (
                    <Pressable
                      onPress={() => {
                        onDeleteLeaderFormula(formula.id).catch(console.error);
                        if (rigSetup.leaderFormulaId === formula.id) {
                          onChange(applyLeaderFormulaToRig(rigSetup, null));
                        }
                      }}
                      style={{ backgroundColor: 'rgba(91,11,11,0.92)', padding: 10, borderRadius: 10 }}
                    >
                      <Text style={{ color: '#f7fdff', textAlign: 'center', fontWeight: '700' }}>Delete Formula</Text>
                    </Pressable>
                  ) : null}
                </View>
              ))}
            </ScrollView>
          ) : null}
        </>
      ) : null}

      <Pressable onPress={() => setShowPresetEditor((current) => !current)} style={{ backgroundColor: '#2f3e46', padding: 12, borderRadius: 12 }}>
        <Text style={{ color: '#f7fdff', textAlign: 'center', fontWeight: '700' }}>
          {showPresetEditor ? 'Hide Rig Preset Saver' : 'Save Current as Rig Preset'}
        </Text>
      </Pressable>

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
          <Pressable onPress={() => setShowPresetList((current) => !current)} style={{ backgroundColor: '#355070', padding: 12, borderRadius: 12 }}>
            <Text style={{ color: '#f7fdff', textAlign: 'center', fontWeight: '700' }}>
              {showPresetList ? 'Hide Rig Presets' : 'Apply Saved Rig Preset'}
            </Text>
          </Pressable>
          {showPresetList ? (
            <ScrollView style={{ maxHeight: 180, borderWidth: 1, borderColor: 'rgba(202,240,248,0.18)', borderRadius: 12, backgroundColor: 'rgba(245,252,255,0.96)' }}>
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
                    <Text style={{ color: '#0b3d3a', fontWeight: '700' }}>{preset.name}</Text>
                    <Text style={{ color: '#4b5563', fontSize: 12 }}>
                      {preset.flyCount} fly{preset.flyCount === 1 ? '' : 's'} | {preset.positions.join(' | ')}
                    </Text>
                  </Pressable>
                  {onDeleteRigPreset ? (
                    <Pressable
                      onPress={() => {
                        onDeleteRigPreset(preset.id).catch(console.error);
                      }}
                      style={{ backgroundColor: 'rgba(91,11,11,0.92)', padding: 10, borderRadius: 10 }}
                    >
                      <Text style={{ color: '#f7fdff', textAlign: 'center', fontWeight: '700' }}>Delete Rig Preset</Text>
                    </Pressable>
                  ) : null}
                </View>
              ))}
            </ScrollView>
          ) : null}
        </>
      ) : null}

      <Pressable onPress={() => setShowFormulaEditor((current) => !current)} style={{ backgroundColor: '#264653', padding: 12, borderRadius: 12 }}>
        <Text style={{ color: '#f7fdff', textAlign: 'center', fontWeight: '700' }}>
          {showFormulaEditor ? 'Hide Leader Formula Builder' : 'Quick Add Leader Formula'}
        </Text>
      </Pressable>

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
          <View key={`${section.label}-${index}`} style={{ gap: 8, borderRadius: 12, padding: 10, backgroundColor: 'rgba(255,255,255,0.08)' }}>
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
              style={{ borderWidth: 1, borderColor: 'rgba(202,240,248,0.18)', padding: 12, borderRadius: 12, backgroundColor: 'rgba(245,252,255,0.96)', color: '#102a43' }}
            />
          </View>
        ))}
      </View>

      {rigSetup.leaderFormulaName ? (
        <View style={{ gap: 4, borderRadius: 12, padding: 10, backgroundColor: 'rgba(255,255,255,0.08)' }}>
          <Text style={{ color: '#f7fdff', fontWeight: '700' }}>Leader Formula: {rigSetup.leaderFormulaName}</Text>
          <Text style={{ color: '#d7f3ff' }}>
            {rigSetup.leaderFormulaSectionsSnapshot.map((section) => `${section.lengthFeet} ft ${section.materialLabel}`).join(' | ')}
          </Text>
        </View>
      ) : null}
    </View>
  );
};
