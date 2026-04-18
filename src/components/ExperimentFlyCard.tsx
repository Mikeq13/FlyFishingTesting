import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { CastCounter } from '@/components/CastCounter';
import { CatchCounter } from '@/components/CatchCounter';
import { FlySelector } from '@/components/FlySelector';
import { AppButton } from '@/components/ui/AppButton';
import { SectionCard } from '@/components/ui/SectionCard';
import { useTheme } from '@/design/theme';
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
}: ExperimentFlyCardProps) => {
  const { theme } = useTheme();
  const hasSelectedFly = !!entry.fly.name.trim();
  const [showFlyEditor, setShowFlyEditor] = useState(!hasSelectedFly);

  useEffect(() => {
    if (!hasSelectedFly) {
      setShowFlyEditor(true);
    }
  }, [hasSelectedFly]);

  return (
  <SectionCard tone="dark">
    {showFlyEditor ? (
      <FlySelector
        title={entry.label}
        value={entry.fly}
        savedFlies={savedFlies}
        onChange={(fly) => onChangeFly({ ...entry, fly })}
        onConfirm={() => setShowFlyEditor(false)}
        onSave={onSaveFly}
      />
    ) : (
      <View
        style={{
          gap: 8,
          borderRadius: theme.radius.md,
          padding: 12,
          backgroundColor: theme.colors.surfaceMuted
        }}
      >
        <Text style={{ color: theme.colors.text, fontWeight: '800' }}>{entry.label}</Text>
        <Text style={{ color: theme.colors.textSoft }}>
          {entry.fly.name} #{entry.fly.hookSize} | {entry.fly.beadColor} | {entry.fly.beadSizeMm.toFixed(1)} mm
        </Text>
        <AppButton label="Change Fly" onPress={() => setShowFlyEditor(true)} variant="ghost" />
      </View>
    )}
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
      <Text style={{ color: theme.colors.textSoft, fontSize: 12 }}>
        Fish log:{' '}
        {entry.fishSizesInches.map((size, fishIndex) => `${size}" ${entry.fishSpecies[fishIndex] ?? 'Trout'}`).join(', ')}
      </Text>
    )}
  </SectionCard>
  );
};
