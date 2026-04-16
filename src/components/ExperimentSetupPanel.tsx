import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { OptionChips } from '@/components/OptionChips';
import { ExperimentControlFocus, ExperimentFlyEntry } from '@/types/experiment';

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
    <View style={{ gap: 8, backgroundColor: 'rgba(6, 27, 44, 0.70)', padding: 14, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(202,240,248,0.16)' }}>
      <Text style={{ color: '#d7f3ff', fontWeight: '700', fontSize: 16 }}>Flies in this experiment</Text>
      <View style={{ flexDirection: isCompactLayout ? 'column' : 'row', gap: 8 }}>
        {FLY_COUNT_OPTIONS.map((option) => (
          <Pressable
            key={option}
            onPress={() => onFlyCountChange(option)}
            style={{
              flex: 1,
              backgroundColor: flyCount === option ? '#2a9d8f' : 'rgba(255,255,255,0.14)',
              padding: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: flyCount === option ? 'rgba(255,255,255,0.24)' : 'rgba(202,240,248,0.12)'
            }}
          >
            <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>{option}</Text>
          </Pressable>
        ))}
      </View>
    </View>

    <OptionChips label="Control Focus" options={CONTROL_FOCUS_OPTIONS} value={controlFocus} onChange={onControlFocusChange} />

    {flyCount > 1 && (
      <View style={{ gap: 8, backgroundColor: 'rgba(6, 27, 44, 0.70)', padding: 14, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(202,240,248,0.16)' }}>
        <Text style={{ color: '#d7f3ff', fontWeight: '700', fontSize: 16 }}>Choose Baseline</Text>
        <View style={{ flexDirection: isCompactLayout ? 'column' : 'row', gap: 8 }}>
          {visibleEntries.map((entry, index) => (
            <Pressable
              key={`baseline-${entry.slotId}`}
              onPress={() => onBaselineIndexChange(index)}
              style={{
                flex: 1,
                backgroundColor: baselineIndex === index ? '#2a9d8f' : 'rgba(255,255,255,0.14)',
                padding: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: baselineIndex === index ? 'rgba(255,255,255,0.24)' : 'rgba(202,240,248,0.12)'
              }}
            >
              <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>
                {entry.fly.name.trim() || `Fly ${index + 1}`}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    )}

    <View style={{ flexDirection: isCompactLayout ? 'column' : 'row', gap: 8 }}>
      <Pressable
        onPress={() => onCastStepChange(5)}
        style={{ backgroundColor: castStep === 5 ? '#1d3557' : 'rgba(255,255,255,0.14)', padding: 12, borderRadius: 12, flex: 1, borderWidth: 1, borderColor: 'rgba(202,240,248,0.12)' }}
      >
        <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Cast interval: 5</Text>
      </Pressable>
      <Pressable
        onPress={() => onCastStepChange(10)}
        style={{ backgroundColor: castStep === 10 ? '#1d3557' : 'rgba(255,255,255,0.14)', padding: 12, borderRadius: 12, flex: 1, borderWidth: 1, borderColor: 'rgba(202,240,248,0.12)' }}
      >
        <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Cast interval: 10</Text>
      </Pressable>
    </View>
  </>
);
