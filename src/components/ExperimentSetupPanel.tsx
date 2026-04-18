import React from 'react';
import { View } from 'react-native';
import { OptionChips } from '@/components/OptionChips';
import { ExperimentControlFocus, ExperimentFlyEntry } from '@/types/experiment';
import { SectionCard } from '@/components/ui/SectionCard';
import { AppButton } from '@/components/ui/AppButton';
import { useTheme } from '@/design/theme';

const FLY_COUNT_OPTIONS = [1, 2, 3] as const;
const CONTROL_FOCUS_OPTIONS: ExperimentControlFocus[] = ['bead color', 'bead size', 'body type', 'collar', 'fly type', 'hook size', 'number of flies', 'pattern', 'tail'];

interface ExperimentSetupPanelProps {
  flyCount: 1 | 2 | 3;
  onFlyCountChange: (value: 1 | 2 | 3) => void;
  controlFocus: ExperimentControlFocus;
  onControlFocusChange: (value: ExperimentControlFocus) => void;
  visibleEntries: ExperimentFlyEntry[];
  baselineIndex: number;
  onBaselineIndexChange: (index: number) => void;
  castStep: 5 | 10;
  onCastStepChange: (value: 5 | 10) => void;
  isCompactLayout: boolean;
}

export const ExperimentSetupPanel = ({
  flyCount,
  onFlyCountChange,
  controlFocus,
  onControlFocusChange,
  visibleEntries,
  baselineIndex,
  onBaselineIndexChange,
  castStep,
  onCastStepChange,
  isCompactLayout
}: ExperimentSetupPanelProps) => {
  const { theme } = useTheme();
  const buttonSurfaceTone: 'dark' | 'light' = theme.id === 'daylight_light' ? 'light' : 'dark';

  return (
  <>
    <SectionCard title="Flies In This Experiment" subtitle="Keep the fly count choice obvious before you start logging casts and fish.">
      <View style={{ flexDirection: isCompactLayout ? 'column' : 'row', gap: 8 }}>
        {FLY_COUNT_OPTIONS.map((option) => (
          <View key={option} style={{ flex: 1 }}>
            <AppButton
              label={String(option)}
              onPress={() => onFlyCountChange(option)}
              variant={flyCount === option ? 'secondary' : 'ghost'}
              surfaceTone={buttonSurfaceTone}
            />
          </View>
        ))}
      </View>
    </SectionCard>

    <OptionChips label="Control Focus" options={CONTROL_FOCUS_OPTIONS} value={controlFocus} onChange={onControlFocusChange} />

    {flyCount > 1 && (
      <SectionCard title="Choose Baseline" subtitle="Set the anchor fly clearly before you compare the rest.">
        <View style={{ flexDirection: isCompactLayout ? 'column' : 'row', gap: 8 }}>
          {visibleEntries.map((entry, index) => (
            <View key={`baseline-${entry.slotId}`} style={{ flex: 1 }}>
              <AppButton
                label={entry.fly.name.trim() || `Fly ${index + 1}`}
                onPress={() => onBaselineIndexChange(index)}
                variant={baselineIndex === index ? 'secondary' : 'ghost'}
                surfaceTone={buttonSurfaceTone}
              />
            </View>
          ))}
        </View>
      </SectionCard>
    )}

    <View style={{ flexDirection: isCompactLayout ? 'column' : 'row', gap: 8 }}>
      <View style={{ flex: 1 }}>
        <AppButton label="Cast interval: 5" onPress={() => onCastStepChange(5)} variant={castStep === 5 ? 'secondary' : 'ghost'} surfaceTone={buttonSurfaceTone} />
      </View>
      <View style={{ flex: 1 }}>
        <AppButton label="Cast interval: 10" onPress={() => onCastStepChange(10)} variant={castStep === 10 ? 'secondary' : 'ghost'} surfaceTone={buttonSurfaceTone} />
      </View>
    </View>
  </>
  );
};
