import React from 'react';
import { OptionChips } from '@/components/OptionChips';
import { RigFlyManager } from '@/components/RigFlyManager';
import { RigSetupPanel } from '@/components/RigSetupPanel';
import { PracticeLengthUnit } from '@/types/session';
import { RigSetup, LeaderFormula, RigPreset } from '@/types/rig';
import { FlySetup, SavedFly } from '@/types/fly';

interface PracticeSetupSectionProps {
  rigSetup: RigSetup;
  savedFlies: SavedFly[];
  savedLeaderFormulas: LeaderFormula[];
  savedRigPresets: RigPreset[];
  practiceMeasurementEnabled: boolean;
  practiceLengthUnit: PracticeLengthUnit;
  onRigSetupChange: (next: RigSetup) => void;
  onFlyCountChange: (nextCount: 1 | 2 | 3) => void;
  onCreateFly: (fly: FlySetup) => Promise<void>;
  onCreateLeaderFormula: (payload: { name: string; sections: LeaderFormula['sections'] }) => Promise<LeaderFormula>;
  onCreateRigPreset: (payload: Omit<RigPreset, 'id' | 'userId' | 'createdAt'>) => Promise<RigPreset>;
  onApplyRigPreset: (preset: RigPreset) => void;
  onDeleteLeaderFormula: (formulaId: number) => Promise<void>;
  onDeleteRigPreset: (presetId: number) => Promise<void>;
  onPracticeMeasurementEnabledChange: (value: boolean) => void;
  onPracticeLengthUnitChange: (value: PracticeLengthUnit) => void;
}

export const PracticeSetupSection = ({
  rigSetup,
  savedFlies,
  savedLeaderFormulas,
  savedRigPresets,
  practiceMeasurementEnabled,
  practiceLengthUnit,
  onRigSetupChange,
  onFlyCountChange,
  onCreateFly,
  onCreateLeaderFormula,
  onCreateRigPreset,
  onApplyRigPreset,
  onDeleteLeaderFormula,
  onDeleteRigPreset,
  onPracticeMeasurementEnabledChange,
  onPracticeLengthUnitChange
}: PracticeSetupSectionProps) => (
  <>
    <RigSetupPanel
      title="Starting Rig Setup"
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
    <OptionChips label="Measure Fish In Practice?" options={['Yes', 'No'] as const} value={practiceMeasurementEnabled ? 'Yes' : 'No'} onChange={(value) => onPracticeMeasurementEnabledChange(value === 'Yes')} />
    {practiceMeasurementEnabled ? (
      <OptionChips label="Practice Length Unit" options={['in', 'cm', 'mm'] as const} value={practiceLengthUnit} onChange={(value) => onPracticeLengthUnitChange(value as PracticeLengthUnit)} />
    ) : null}
  </>
);
