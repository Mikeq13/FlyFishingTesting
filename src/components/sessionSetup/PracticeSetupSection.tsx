import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
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
  presentationMode?: 'setup' | 'change';
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
  foregroundEditing = false,
  presentationMode = 'change'
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

  const renderSetupRow = ({
    heading,
    summary,
    sheetKey
  }: {
    heading: string;
    summary: string;
    sheetKey: Exclude<SetupSheetKey, null>;
  }) => (
    <Pressable
      onPress={() => setActiveSetupSheet(sheetKey)}
      style={{
        gap: 6,
        borderRadius: theme.radius.md,
        padding: theme.spacing.md,
        backgroundColor: activeSetupSheet === sheetKey ? theme.colors.surfaceMuted : theme.colors.surfaceAlt,
        borderWidth: 1,
        borderColor: activeSetupSheet === sheetKey ? theme.colors.borderStrong : theme.colors.border
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ color: theme.colors.text, fontWeight: '800' }}>{heading}</Text>
          <Text style={{ color: theme.colors.textSoft, lineHeight: 19 }}>{summary}</Text>
        </View>
        <Text style={{ color: theme.colors.text, fontWeight: '800' }}>Edit</Text>
      </View>
    </Pressable>
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
      <SectionCard title="Journal Catch Measurement" subtitle="Keep quick logging fast, and only turn on length entry when this journal entry calls for it.">
            <OptionChips label="Measure Fish In Practice?" options={['No', 'Yes'] as const} value={practiceMeasurementEnabled ? 'Yes' : 'No'} onChange={(value) => onPracticeMeasurementEnabledChange(value === 'Yes')} />
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
      <SectionCard
        title={title}
        subtitle="Open only the setup piece you want to change, then return to the journal start flow."
      >
        {renderSetupRow({
          heading: 'Technique',
          summary: technique ?? 'Not chosen',
          sheetKey: 'technique'
        })}
        {renderSetupRow({
          heading: 'Leader',
          summary: leaderSummary,
          sheetKey: 'leader'
        })}
        {renderSetupRow({
          heading: 'Rigging',
          summary: rigSummary,
          sheetKey: 'rigging'
        })}
        {renderSetupRow({
          heading: 'Flies',
          summary: flySummary,
          sheetKey: 'flies'
        })}
      </SectionCard>
      {showMeasurementControls ? (
          <SectionCard title="Journal Catch Measurement" subtitle="Keep quick logging fast, and only turn on length entry when this journal entry calls for it.">
          <OptionChips label="Measure Fish In Practice?" options={['No', 'Yes'] as const} value={practiceMeasurementEnabled ? 'Yes' : 'No'} onChange={(value) => onPracticeMeasurementEnabledChange(value === 'Yes')} />
          {practiceMeasurementEnabled ? (
            <OptionChips label="Practice Length Unit" options={['in', 'cm', 'mm'] as const} value={practiceLengthUnit} onChange={(value) => onPracticeLengthUnitChange(value as PracticeLengthUnit)} />
          ) : null}
        </SectionCard>
      ) : null}
        <BottomSheetSurface
          visible={activeSetupSheet !== null}
          title={
            activeSetupSheet === 'technique'
              ? presentationMode === 'setup'
                ? 'Choose Technique'
                : 'Change Technique'
              : activeSetupSheet === 'leader'
                ? presentationMode === 'setup'
                  ? 'Select Leader'
                  : 'Change Leader'
                : activeSetupSheet === 'rigging'
                  ? presentationMode === 'setup'
                    ? 'Select Rig'
                    : 'Change Rigging'
                  : presentationMode === 'setup'
                    ? 'Select Flies'
                    : 'Change Flies'
          }
          subtitle={
            activeSetupSheet === 'technique'
              ? presentationMode === 'setup'
                ? 'Choose the approach you want to start with today, then return right to session setup.'
                : 'Keep approach changes fast and obvious before you adjust the rest of the setup.'
              : activeSetupSheet === 'leader'
                ? presentationMode === 'setup'
                  ? 'Select the leader you want to start with today, or build a fresh one without leaving setup.'
                  : 'Swap leader setup in the foreground, then return right to session setup.'
                : activeSetupSheet === 'rigging'
                  ? presentationMode === 'setup'
                    ? 'Choose a saved rig or build a new one for today’s starting setup.'
                    : 'Adjust fly count, preset, and tippet details without reopening a long setup stack.'
                  : presentationMode === 'setup'
                    ? 'Choose saved flies or build the flies you want to start the day with.'
                    : 'Replace flies or fill empty slots in one focused editor.'
          }
          onClose={() => setActiveSetupSheet(null)}
        >
          <View style={{ gap: 12 }}>
            {activeSetupSheet === 'technique' ? (
              <SectionCard title="Technique" subtitle="Keep approach changes fast and obvious before you adjust the rest of the setup." tone="modal">
                <OptionChips
                  label="Technique"
                  options={TECHNIQUES}
                  value={technique ?? null}
                  onChange={(value) => onTechniqueChange(value as Technique)}
                  tone="modal"
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
                tone="modal"
                foregroundQuickAdd
                presentationMode={presentationMode}
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
                tone="modal"
                foregroundQuickAdd
                presentationMode={presentationMode}
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
                tone="modal"
                editorOnly
                foregroundQuickAdd
              />
            ) : null}
            <AppButton label="Done" onPress={() => setActiveSetupSheet(null)} />
          </View>
        </BottomSheetSurface>
    </>
  );
};
