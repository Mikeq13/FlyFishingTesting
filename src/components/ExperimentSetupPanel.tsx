import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { OptionChips } from '@/components/OptionChips';
import { ExperimentControlFocus, ExperimentFlyEntry } from '@/types/experiment';
import { SectionCard } from '@/components/ui/SectionCard';
import { AppButton } from '@/components/ui/AppButton';
import { appTheme } from '@/design/theme';

const FLY_COUNT_OPTIONS = [1, 2, 3] as const;
const CONTROL_FOCUS_OPTIONS: ExperimentControlFocus[] = ['bead color', 'bead size', 'body type', 'collar', 'fly type', 'hook size', 'pattern', 'tail'];

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
}: ExperimentSetupPanelProps) => (
  <>
    <SectionCard title="Flies In This Experiment" subtitle="Keep the fly count choice obvious before you start logging casts and fish.">
      <View style={{ flexDirection: isCompactLayout ? 'column' : 'row', gap: 8 }}>
        {FLY_COUNT_OPTIONS.map((option) => (
          <Pressable
            key={option}
            onPress={() => onFlyCountChange(option)}
            style={{
              flex: 1,
              backgroundColor: flyCount === option ? appTheme.colors.primary : appTheme.colors.surfaceMuted,
              padding: 12,
              borderRadius: appTheme.radius.md,
              borderWidth: 1,
              borderColor: flyCount === option ? appTheme.colors.borderStrong : appTheme.colors.border
            }}
          >
            <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>{option}</Text>
          </Pressable>
        ))}
      </View>
    </SectionCard>

    <OptionChips label="Control Focus" options={CONTROL_FOCUS_OPTIONS} value={controlFocus} onChange={onControlFocusChange} />

    {flyCount > 1 && (
      <SectionCard title="Choose Baseline" subtitle="Set the anchor fly clearly before you compare the rest.">
        <View style={{ flexDirection: isCompactLayout ? 'column' : 'row', gap: 8 }}>
          {visibleEntries.map((entry, index) => (
            <Pressable
              key={`baseline-${entry.slotId}`}
              onPress={() => onBaselineIndexChange(index)}
              style={{
                flex: 1,
                backgroundColor: baselineIndex === index ? appTheme.colors.primary : appTheme.colors.surfaceMuted,
                padding: 12,
                borderRadius: appTheme.radius.md,
                borderWidth: 1,
                borderColor: baselineIndex === index ? appTheme.colors.borderStrong : appTheme.colors.border
              }}
            >
              <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>
                {entry.fly.name.trim() || `Fly ${index + 1}`}
              </Text>
            </Pressable>
          ))}
        </View>
      </SectionCard>
    )}

    <View style={{ flexDirection: isCompactLayout ? 'column' : 'row', gap: 8 }}>
      <View style={{ flex: 1 }}>
        <AppButton label="Cast interval: 5" onPress={() => onCastStepChange(5)} variant={castStep === 5 ? 'secondary' : 'ghost'} />
      </View>
      <View style={{ flex: 1 }}>
        <AppButton label="Cast interval: 10" onPress={() => onCastStepChange(10)} variant={castStep === 10 ? 'secondary' : 'ghost'} />
      </View>
    </View>
  </>
);
