import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { OptionChips } from './OptionChips';
import { AddedTippetSection, LeaderFormula, RigPreset, RigSetup, TippetSize } from '@/types/rig';
import { applyLeaderFormulaToRig, createRigPresetPayload } from '@/utils/rigSetup';
import { LeaderFormulaEditor } from './LeaderFormulaEditor';
import { RigPresetEditor } from './RigPresetEditor';
import { SectionCard } from '@/components/ui/SectionCard';
import { AppButton } from '@/components/ui/AppButton';
import { useTheme } from '@/design/theme';
import { ModalSurface } from '@/components/ui/ModalSurface';

const TIPPET_SIZES: TippetSize[] = ['5x', '6x', '7x', '8x'];

interface RigSetupPanelProps {
  title: string;
  rigSetup: RigSetup;
  flyCount: number;
  onFlyCountChange?: (nextCount: 1 | 2 | 3) => void;
  editMode?: 'all' | 'leader' | 'rig';
  forceEditorOpen?: boolean;
  tone?: 'dark' | 'light';
  savedLeaderFormulas: LeaderFormula[];
  savedRigPresets: RigPreset[];
  onChange: (next: RigSetup) => void;
  onCreateLeaderFormula: (payload: { name: string; sections: LeaderFormula['sections'] }) => Promise<LeaderFormula>;
  onCreateRigPreset: (payload: Omit<RigPreset, 'id' | 'userId' | 'createdAt'>) => Promise<RigPreset>;
  onApplyRigPreset: (preset: RigPreset) => void;
  onDeleteLeaderFormula?: (formulaId: number) => Promise<void>;
  onDeleteRigPreset?: (presetId: number) => Promise<void>;
  foregroundQuickAdd?: boolean;
}

export const RigSetupPanel = ({
  title,
  rigSetup,
  flyCount,
  onFlyCountChange,
  editMode = 'all',
  forceEditorOpen = false,
  tone = 'dark',
  savedLeaderFormulas,
  savedRigPresets,
  onChange,
  onCreateLeaderFormula,
  onCreateRigPreset,
  onApplyRigPreset,
  onDeleteLeaderFormula,
  onDeleteRigPreset,
  foregroundQuickAdd = false
}: RigSetupPanelProps) => {
  const { theme } = useTheme();
  const isLightTone = tone === 'light';
  const [showFormulaList, setShowFormulaList] = useState(false);
  const [showFormulaEditor, setShowFormulaEditor] = useState(false);
  const [showPresetList, setShowPresetList] = useState(false);
  const [showPresetEditor, setShowPresetEditor] = useState(false);
  const [showSetupEditor, setShowSetupEditor] = useState(true);
  const [editTarget, setEditTarget] = useState<'all' | 'leader' | 'rig'>(editMode);
  const sortedFormulas = useMemo(() => [...savedLeaderFormulas].sort((left, right) => left.name.localeCompare(right.name)), [savedLeaderFormulas]);
  const sortedPresets = useMemo(() => [...savedRigPresets].sort((left, right) => left.name.localeCompare(right.name)), [savedRigPresets]);
  const hasConfiguredLeader = !!rigSetup.leaderFormulaName || rigSetup.leaderFormulaSectionsSnapshot.length > 0;
  const hasMeaningfulRigConfig = hasConfiguredLeader || rigSetup.assignments.length > 1 || rigSetup.addedTippetSections.some((section) => typeof section.lengthFeet === 'number' && section.lengthFeet > 0);
  const rigSummary = `${rigSetup.assignments.length} ${rigSetup.assignments.length === 1 ? 'fly' : 'flies'} | ${rigSetup.assignments.map((assignment) => assignment.position).join(' | ')}`;

  useEffect(() => {
    if (hasMeaningfulRigConfig) {
      setShowSetupEditor(false);
    }
  }, [hasMeaningfulRigConfig]);

  useEffect(() => {
    if (forceEditorOpen) {
      setShowSetupEditor(true);
      setEditTarget(editMode);
    }
  }, [editMode, forceEditorOpen]);

  const closeSetupEditor = () => {
    setShowSetupEditor(false);
    setEditTarget(editMode);
    setShowFormulaList(false);
    setShowFormulaEditor(false);
    setShowPresetList(false);
    setShowPresetEditor(false);
  };

  return (
    <SectionCard title={title} subtitle="Keep leaders from fly line to tippet ring and rigs from tippet ring to point fly in one place." tone={tone}>
      {!forceEditorOpen && !showSetupEditor ? (
        <View
          style={{
            gap: 8,
            borderRadius: theme.radius.md,
            padding: 12,
            backgroundColor: isLightTone ? theme.colors.nestedSurface : theme.colors.surfaceMuted,
            borderWidth: isLightTone ? 1 : 0,
            borderColor: isLightTone ? theme.colors.nestedSurfaceBorder : 'transparent'
          }}
        >
          <Text style={{ color: isLightTone ? theme.colors.textDark : theme.colors.text, fontWeight: '800' }}>
            Leader: {rigSetup.leaderFormulaName ?? (rigSetup.leaderFormulaSectionsSnapshot.length ? 'Custom leader' : 'Not chosen')}
          </Text>
          <Text style={{ color: isLightTone ? theme.colors.textDarkSoft : theme.colors.textMuted }}>Rig: {rigSummary}</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {editMode !== 'rig' ? (
              <AppButton
                label="Change Leader"
                onPress={() => {
                  setShowSetupEditor(true);
                  setEditTarget('leader');
                  setShowFormulaList(true);
                  setShowFormulaEditor(false);
                  setShowPresetList(false);
                  setShowPresetEditor(false);
                }}
                variant="ghost"
                surfaceTone={isLightTone ? 'light' : 'dark'}
              />
            ) : null}
            {editMode !== 'leader' ? (
              <AppButton
                label="Change Rig"
                onPress={() => {
                  setShowSetupEditor(true);
                  setEditTarget('rig');
                  setShowPresetList(true);
                  setShowPresetEditor(false);
                  setShowFormulaList(false);
                  setShowFormulaEditor(false);
                }}
                variant="ghost"
                surfaceTone={isLightTone ? 'light' : 'dark'}
              />
            ) : null}
          </View>
        </View>
      ) : null}

      {(forceEditorOpen || showSetupEditor) ? (
        <>
          {(editMode !== 'rig' && (editTarget === 'all' || editTarget === 'leader')) ? (
            <>
              {!!sortedFormulas.length ? (
                <>
                  <AppButton label={showFormulaList ? 'Hide Existing Leaders' : 'Existing Leader'} onPress={() => setShowFormulaList((current) => !current)} variant="secondary" surfaceTone={isLightTone ? 'light' : 'dark'} />
                  {showFormulaList ? (
                    <ScrollView style={{ maxHeight: 180, borderWidth: 1, borderColor: theme.colors.borderStrong, borderRadius: theme.radius.md, backgroundColor: theme.colors.surfaceLight }}>
                      {sortedFormulas.map((formula) => (
                        <View
                          key={formula.id}
                          style={{ paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight, gap: 8 }}
                        >
                          <Pressable
                            onPress={() => {
                              onChange(applyLeaderFormulaToRig(rigSetup, formula));
                              closeSetupEditor();
                            }}
                          >
                            <Text style={{ color: theme.colors.textDark, fontWeight: '700' }}>{formula.name}</Text>
                            <Text style={{ color: theme.colors.textDarkSoft, fontSize: 12 }}>
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
                              surfaceTone="light"
                            />
                          ) : null}
                        </View>
                      ))}
                    </ScrollView>
                  ) : null}
                </>
              ) : null}

              <AppButton label={showFormulaEditor ? 'Hide New Leader' : 'New Leader'} onPress={() => setShowFormulaEditor((current) => !current)} variant="tertiary" surfaceTone={isLightTone ? 'light' : 'dark'} />

              {showFormulaEditor && !foregroundQuickAdd ? (
                <LeaderFormulaEditor
                  onSave={async (payload) => {
                    try {
                      const saved = await onCreateLeaderFormula(payload);
                      onChange(applyLeaderFormulaToRig(rigSetup, saved));
                      closeSetupEditor();
                    } catch (error) {
                      Alert.alert('Unable to save leader', error instanceof Error ? error.message : 'Please try again.');
                    }
                  }}
                />
              ) : null}
            </>
          ) : null}

          {(editMode !== 'leader' && (editTarget === 'all' || editTarget === 'rig')) ? (
            <>
              <AppButton label={showPresetEditor ? 'Hide New Rig' : 'New Rig'} onPress={() => setShowPresetEditor((current) => !current)} variant="ghost" surfaceTone={isLightTone ? 'light' : 'dark'} />

              {showPresetEditor && !foregroundQuickAdd ? (
                <RigPresetEditor
                  onSave={async (name) => {
                    try {
                      await onCreateRigPreset(createRigPresetPayload(rigSetup, name));
                      setShowPresetEditor(false);
                    } catch (error) {
                      Alert.alert('Unable to save rig preset', error instanceof Error ? error.message : 'Please try again.');
                    }
                  }}
                />
              ) : null}

              {!!sortedPresets.length ? (
                <>
                  <AppButton label={showPresetList ? 'Hide Existing Rigs' : 'Existing Rig'} onPress={() => setShowPresetList((current) => !current)} variant="secondary" surfaceTone={isLightTone ? 'light' : 'dark'} />
                  {showPresetList ? (
                    <ScrollView style={{ maxHeight: 180, borderWidth: 1, borderColor: theme.colors.borderStrong, borderRadius: theme.radius.md, backgroundColor: theme.colors.surfaceLight }}>
                      {sortedPresets.map((preset) => (
                        <View
                          key={preset.id}
                          style={{ paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight, gap: 8 }}
                        >
                          <Pressable
                            onPress={() => {
                              onApplyRigPreset(preset);
                              closeSetupEditor();
                            }}
                          >
                            <Text style={{ color: theme.colors.textDark, fontWeight: '700' }}>{preset.name}</Text>
                            <Text style={{ color: theme.colors.textDarkSoft, fontSize: 12 }}>
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
                              surfaceTone="light"
                            />
                          ) : null}
                        </View>
                      ))}
                    </ScrollView>
                  ) : null}
                </>
              ) : null}

              {onFlyCountChange ? (
                <OptionChips
                  label="Fly Count"
                  options={['1', '2', '3'] as const}
                  value={String(flyCount || 1)}
                  onChange={(value) => onFlyCountChange(Number(value) as 1 | 2 | 3)}
                  tone={isLightTone ? 'light' : 'dark'}
                />
              ) : null}

              <View style={{ gap: 8 }}>
                {rigSetup.addedTippetSections.map((section, index) => (
                  <View key={`${section.label}-${index}`} style={{ gap: 8, borderRadius: theme.radius.md, padding: 10, backgroundColor: isLightTone ? theme.colors.nestedSurface : theme.colors.surfaceMuted, borderWidth: isLightTone ? 1 : 0, borderColor: isLightTone ? theme.colors.nestedSurfaceBorder : 'transparent' }}>
                    <Text style={{ color: isLightTone ? theme.colors.textDark : theme.colors.text, fontWeight: '700' }}>{section.label}</Text>
                    <OptionChips
                      label="Tippet Size"
                      options={TIPPET_SIZES}
                      value={section.size}
                      tone={isLightTone ? 'light' : 'dark'}
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
                      placeholderTextColor={theme.colors.inputPlaceholder}
                      style={{ borderWidth: 1, borderColor: theme.colors.borderStrong, padding: 12, borderRadius: theme.radius.md, backgroundColor: theme.colors.inputBg, color: theme.colors.textDark }}
                    />
                  </View>
                ))}
              </View>
            </>
          ) : null}

          {!forceEditorOpen ? <AppButton label="Hide Setup Details" onPress={closeSetupEditor} variant="ghost" surfaceTone={isLightTone ? 'light' : 'dark'} /> : null}
        </>
      ) : null}
      <Modal visible={showFormulaEditor && foregroundQuickAdd} transparent animationType="fade" onRequestClose={() => setShowFormulaEditor(false)}>
        <ModalSurface title="Quick Add Leader" subtitle="Save a new leader in the foreground, then return to this setup flow.">
          <LeaderFormulaEditor
            onSave={async (payload) => {
              try {
                const saved = await onCreateLeaderFormula(payload);
                onChange(applyLeaderFormulaToRig(rigSetup, saved));
                setShowFormulaEditor(false);
                closeSetupEditor();
              } catch (error) {
                Alert.alert('Unable to save leader', error instanceof Error ? error.message : 'Please try again.');
              }
            }}
          />
          <AppButton label="Cancel" onPress={() => setShowFormulaEditor(false)} variant="ghost" surfaceTone="light" />
        </ModalSurface>
      </Modal>
      <Modal visible={showPresetEditor && foregroundQuickAdd} transparent animationType="fade" onRequestClose={() => setShowPresetEditor(false)}>
        <ModalSurface title="Quick Add Rig" subtitle="Save a rig preset in the foreground, then return to this setup flow.">
          <RigPresetEditor
            onSave={async (name) => {
              try {
                await onCreateRigPreset(createRigPresetPayload(rigSetup, name));
                setShowPresetEditor(false);
              } catch (error) {
                Alert.alert('Unable to save rig preset', error instanceof Error ? error.message : 'Please try again.');
              }
            }}
          />
          <AppButton label="Cancel" onPress={() => setShowPresetEditor(false)} variant="ghost" surfaceTone="light" />
        </ModalSurface>
      </Modal>
    </SectionCard>
  );
};
