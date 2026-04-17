import React from 'react';
import { Text, View } from 'react-native';
import { CastCounter } from '@/components/CastCounter';
import { CatchCounter } from '@/components/CatchCounter';
import { FlySelector } from '@/components/FlySelector';
import { SectionCard } from '@/components/ui/SectionCard';
import { appTheme } from '@/design/theme';
import { SavedFly } from '@/types/fly';
import { ExperimentFlyEntry } from '@/types/experiment';

interface ExperimentFlyCardProps {
  entry: ExperimentFlyEntry;
  savedFlies: SavedFly[];
  castStep: 5 | 10;
  isCompactLayout: boolean;
  onChangeFly: (entry: ExperimentFlyEntry) => void;
  onSaveFly: () => void;
  onDecrementCasts: () => void;
  onIncrementCasts: () => void;
  onDecrementCatches: () => void;
  onIncrementCatches: () => void;
}

export const ExperimentFlyCard = ({
  entry,
  savedFlies,
  castStep,
  isCompactLayout,
  onChangeFly,
  onSaveFly,
  onDecrementCasts,
  onIncrementCasts,
  onDecrementCatches,
  onIncrementCatches
}: ExperimentFlyCardProps) => (
  <SectionCard tone="dark">
    <FlySelector
      title={entry.label}
      value={entry.fly}
      savedFlies={savedFlies}
      onChange={(fly) => onChangeFly({ ...entry, fly })}
      onSave={onSaveFly}
    />
    <View style={{ flexDirection: isCompactLayout ? 'column' : 'row', gap: 8 }}>
      <CastCounter
        label={`${entry.label} casts`}
        value={entry.casts}
        step={castStep}
        onDecrement={onDecrementCasts}
        onIncrement={onIncrementCasts}
      />
      <CatchCounter
        label={`${entry.label} catches`}
        value={entry.catches}
        onDecrement={onDecrementCatches}
        onIncrement={onIncrementCatches}
      />
    </View>
    {!!entry.fishSizesInches.length && (
      <Text style={{ color: appTheme.colors.textSoft, fontSize: 12 }}>
        Fish log:{' '}
        {entry.fishSizesInches.map((size, fishIndex) => `${size}" ${entry.fishSpecies[fishIndex] ?? 'Trout'}`).join(', ')}
      </Text>
    )}
  </SectionCard>
);
