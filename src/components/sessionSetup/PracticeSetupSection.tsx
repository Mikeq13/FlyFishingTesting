import React, { useMemo, useState } from 'react';
import { Modal, ScrollView, Text, View } from 'react-native';
import { OptionChips } from '@/components/OptionChips';
import { RigFlyManager } from '@/components/RigFlyManager';
import { RigSetupPanel } from '@/components/RigSetupPanel';
import { SectionCard } from '@/components/ui/SectionCard';
import { AppButton } from '@/components/ui/AppButton';
import { BottomSheetSurface } from '@/components/ui/BottomSheetSurface';
import { PracticeLengthUnit, Technique } from '@/types/session';
import { RigSetup, LeaderFormula, RigPreset } from '@/types/rig';
import { FlySetup, SavedFly } from '@/types/fly';
import { useTheme } from '@/design/theme';
import { TECHNIQUES } from '@/constants/options';

type SetupSheetKey = 'technique' | 'leader' | 'rigging' | 'flies' | null;

interface PracticeSetupSectionProps {
  title?: string;
  rigSetup: RigSetup;
  savedFlies: SavedFly[];
  savedLeaderFormulas: LeaderFormula[];
  savedRigPresets: RigPreset[];
  practiceMeasurementEnabled?: boolean;
  practiceLengthUnit?: PracticeLengthUnit;
  showMeasurementControls?: boolean;
  technique?: Technique;
  onRigSetupChange: (next: RigSetup) => void;
  onTechniqueChange: (next: Technique) => void;
  onFlyCountChange: (nextCount: 1 | 2 | 3) => void;
  onCreateFly: (fly: FlySetup) => Promise<void>;
  onCreateLeaderFormula: (payload: { name: string; sections: LeaderFormula['sections'] }) => Promise<LeaderFormula>;
  onCreateRigPreset: (payload: Omit<RigPreset, 'id' | 'userId' | 'createdAt'>) => Promise<RigPreset>;
  onApplyRigPreset: (preset: RigPreset) => void;
  onDeleteLeaderFormula: (formulaId: number) => Promise<void>;
  onDeleteRigPreset: (presetId: number) => Promise<void>;
  onPracticeMeasurementEnabledChange: (value: boolean) => void;
  onPracticeLengthUnitChange: (value: PracticeLengthUnit) => void;
  foregroundEditing?: boolean;
}

export const PracticeSetupSection = ({
  title = 'Starting Rig Setup',
  rigSetup,
  savedFlies,
  savedLeaderFormulas,
  savedRigPresets,
  practiceMeasurementEnabled = false,
  practiceLengthUnit = 'in',
  showMeasurementControls = true,
  technique,
  onRigSetupChange,
  onTechniqueChange,
  onFlyCountChange,
  onCreateFly,
  onCreateLeaderFormula,
  onCreateRigPreset,
  onApplyRigPreset,
  onDeleteLeaderFormula,
  onDeleteRigPreset,
  onPracticeMeasurementEnabledChange,
  onPracticeLengthUnitChange,
  foregroundEditing = false
}: PracticeSetupSectionProps) => {
  const { theme } = useTheme();
  const [activeSetupSheet, setActiveSetupSheet] = useState<SetupSheetKey>(null);

  const leaderSummary = useMemo(
    () => rigSetup.leaderFormulaName ?? (rigSetup.leaderFormulaSectionsSnapshot.length ? 'Custom leader' : 'Not chosen'),
    [rigSetup.leaderFormulaName, rigSetup.leaderFormulaSectionsSnapshot.length]
  );
  const rigSummary = useMemo(
    () => `${rigSetup.assignments.length} ${rigSetup.assignments.length === 1 ? 'fly' : 'flies'} | ${rigSetup.assignments.map((assignment) => assignment.position).join(' | ')}`,
    [rigSetup.assignments]
  );
  const flySummary = useMemo(
    () =>
      rigSetup.assignments
        .map((assignment) => `${assignment.position}: ${assignment.fly.name.trim() || 'No fly selected'}`)
        .join(' | '),
    [rigSetup.assignments]
  );

  const renderSummaryCard = ({
    heading,
    summary,
    buttonLabel,
    sheetKey
  }: {
    heading: string;
    summary: string;
    buttonLabel: string;
    sheetKey: Exclude<SetupSheetKey, null>;
  }) => (
    <View
      style={{
        gap: 8,
        borderRadius: theme.radius.md,
        padding: 12,
        backgroundColor: theme.colors.surfaceAlt,
        borderWidth: 1,
        borderColor: theme.colors.border
      }}
    >
      <Text style={{ color: theme.colors.text, fontWeight: '800' }}>{heading}</Text>
      <Text style={{ color: theme.colors.textSoft, lineHeight: 20 }}>{summary}</Text>
      <AppButton label={buttonLabel} onPress={() => setActiveSetupSheet(sheetKey)} variant="ghost" />
    </View>
  );

  if (!foregroundEditing) {
    return (
      <>
        <RigSetupPanel
          title={title}
          rigSetup={rigSetup}
          flyCount={rigSetup.assignments.length}
          onFlyCountChange={onFlyCountChange}
          savedLeaderFormulas={savedLeaderFormulas}
          savedRigPresets={savedRigPresets}
          onChange={onRigSetupChange}
          onCreateLeaderFormula={onCreateLeaderFormula}
          onCreateRigPreset={onCreateRigPreset}
          onApplyRigPreset={onApplyRigPreset}
          onDeleteLeaderFormula={onDeleteLeaderFormula}
          onDeleteRigPreset={onDeleteRigPreset}
        />
        <RigFlyManager title="Fly Assignments" rigSetup={rigSetup} savedFlies={savedFlies} onChange={onRigSetupChange} onCreateFly={onCreateFly} />
        {showMeasurementControls ? (
          <SectionCard title="Practice Catch Measurement" subtitle="Keep quick logging fast, and only turn on length entry when this practice session calls for it.">
            <OptionChips label="Measure Fish In Practice?" options={['Yes', 'No'] as const} value={practiceMeasurementEnabled ? 'Yes' : 'No'} onChange={(value) => onPracticeMeasurementEnabledChange(value === 'Yes')} />
            {practiceMeasurementEnabled ? (
              <OptionChips label="Practice Length Unit" options={['in', 'cm', 'mm'] as const} value={practiceLengthUnit} onChange={(value) => onPracticeLengthUnitChange(value as PracticeLengthUnit)} />
            ) : null}
          </SectionCard>
        ) : null}
      </>
    );
  }

  return (
    <>
      {renderSummaryCard({
        heading: 'Technique',
        summary: technique ?? 'Not chosen',
        buttonLabel: 'Change Technique',
        sheetKey: 'technique'
      })}
      {renderSummaryCard({
        heading: 'Leader',
        summary: leaderSummary,
        buttonLabel: 'Change Leader',
        sheetKey: 'leader'
      })}
      {renderSummaryCard({
        heading: 'Rigging',
        summary: rigSummary,
        buttonLabel: 'Change Rigging',
        sheetKey: 'rigging'
      })}
      {renderSummaryCard({
        heading: 'Flies',
        summary: flySummary,
        buttonLabel: 'Change Flies',
        sheetKey: 'flies'
      })}
      {showMeasurementControls ? (
        <SectionCard title="Practice Catch Measurement" subtitle="Keep quick logging fast, and only turn on length entry when this practice session calls for it.">
          <OptionChips label="Measure Fish In Practice?" options={['Yes', 'No'] as const} value={practiceMeasurementEnabled ? 'Yes' : 'No'} onChange={(value) => onPracticeMeasurementEnabledChange(value === 'Yes')} />
          {practiceMeasurementEnabled ? (
            <OptionChips label="Practice Length Unit" options={['in', 'cm', 'mm'] as const} value={practiceLengthUnit} onChange={(value) => onPracticeLengthUnitChange(value as PracticeLengthUnit)} />
          ) : null}
        </SectionCard>
      ) : null}
      <Modal visible={activeSetupSheet !== null} transparent animationType="fade" onRequestClose={() => setActiveSetupSheet(null)}>
        <BottomSheetSurface
          title={
            activeSetupSheet === 'leader'
              ? 'Change Leader'
              : activeSetupSheet === 'rigging'
                ? 'Change Rigging'
                : 'Change Flies'
          }
          subtitle={
            activeSetupSheet === 'leader'
              ? 'Swap leader setup in the foreground, then return right to session setup.'
              : activeSetupSheet === 'rigging'
                ? 'Adjust fly count, preset, and tippet details without reopening a long setup stack.'
                : 'Replace flies or fill empty slots in one focused editor.'
          }
          onClose={() => setActiveSetupSheet(null)}
        >
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 12 }}>
            {activeSetupSheet === 'technique' ? (
              <SectionCard title="Technique" subtitle="Keep approach changes fast and obvious before you adjust the rest of the setup." tone="light">
                <OptionChips
                  label="Technique"
                  options={TECHNIQUES}
                  value={technique ?? null}
                  onChange={(value) => onTechniqueChange(value as Technique)}
                  tone="light"
                />
              </SectionCard>
            ) : null}
            {activeSetupSheet === 'leader' ? (
              <RigSetupPanel
                title="Leader"
                rigSetup={rigSetup}
                flyCount={rigSetup.assignments.length}
                editMode="leader"
                forceEditorOpen
                tone="light"
                foregroundQuickAdd
                savedLeaderFormulas={savedLeaderFormulas}
                savedRigPresets={savedRigPresets}
                onChange={onRigSetupChange}
                onCreateLeaderFormula={onCreateLeaderFormula}
                onCreateRigPreset={onCreateRigPreset}
                onApplyRigPreset={onApplyRigPreset}
                onDeleteLeaderFormula={onDeleteLeaderFormula}
                onDeleteRigPreset={onDeleteRigPreset}
              />
            ) : null}
            {activeSetupSheet === 'rigging' ? (
              <RigSetupPanel
                title="Rigging"
                rigSetup={rigSetup}
                flyCount={rigSetup.assignments.length}
                onFlyCountChange={onFlyCountChange}
                editMode="rig"
                forceEditorOpen
                tone="light"
                foregroundQuickAdd
                savedLeaderFormulas={savedLeaderFormulas}
                savedRigPresets={savedRigPresets}
                onChange={onRigSetupChange}
                onCreateLeaderFormula={onCreateLeaderFormula}
                onCreateRigPreset={onCreateRigPreset}
                onApplyRigPreset={onApplyRigPreset}
                onDeleteLeaderFormula={onDeleteLeaderFormula}
                onDeleteRigPreset={onDeleteRigPreset}
              />
            ) : null}
            {activeSetupSheet === 'flies' ? (
              <RigFlyManager
                title="Fly Assignments"
                rigSetup={rigSetup}
                savedFlies={savedFlies}
                onChange={onRigSetupChange}
                onCreateFly={onCreateFly}
                tone="light"
                editorOnly
                foregroundQuickAdd
              />
            ) : null}
            <AppButton label="Done" onPress={() => setActiveSetupSheet(null)} />
          </ScrollView>
        </BottomSheetSurface>
      </Modal>
    </>
  );
};
