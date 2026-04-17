import React from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { OptionChips } from '@/components/OptionChips';
import { DEPTH_RANGES, MONTHS, WATER_TYPES } from '@/constants/options';
import { SectionCard } from '@/components/ui/SectionCard';
import { AppButton } from '@/components/ui/AppButton';
import { appTheme } from '@/design/theme';

const inputStyle = {
  borderWidth: 1,
  borderColor: appTheme.colors.borderStrong,
  padding: 12,
  borderRadius: appTheme.radius.md,
  backgroundColor: appTheme.colors.inputBg,
  color: appTheme.colors.textDark
} as const;

interface InsightsFilterPanelProps {
  riverOptions: string[];
  riverFilter: string;
  showRiverChoices: boolean;
  onToggleRiverChoices: () => void;
  onSelectRiver: (river: string) => void;
  onClearRiver: () => void;
  hypothesisOptions: string[];
  hypothesisFilter: string;
  showHypothesisChoices: boolean;
  onToggleHypothesisChoices: () => void;
  onSelectHypothesis: (value: string) => void;
  onClearHypothesis: () => void;
  monthFilter: string;
  onMonthChange: (value: string) => void;
  onClearMonth: () => void;
  waterFilter: string;
  onWaterChange: (value: string) => void;
  depthFilter: string;
  onDepthChange: (value: string) => void;
  flyFilterMode: 'pattern' | 'exact';
  onFlyFilterModeChange: (value: 'pattern' | 'exact') => void;
  flyOptions: string[];
  exactFlyOptions: string[];
  flyFilter: string;
  showFlyChoices: boolean;
  onToggleFlyChoices: () => void;
  onSelectFly: (value: string) => void;
  onClearFly: () => void;
  speciesOptions: string[];
  speciesFilter: string;
  onSpeciesChange: (value: string) => void;
  minimumSizeFilter: string;
  onMinimumSizeChange: (value: string) => void;
  filteredExperimentCount: number;
  filteredSessionCount: number;
}

export const InsightsFilterPanel = ({
  riverOptions,
  riverFilter,
  showRiverChoices,
  onToggleRiverChoices,
  onSelectRiver,
  onClearRiver,
  hypothesisOptions,
  hypothesisFilter,
  showHypothesisChoices,
  onToggleHypothesisChoices,
  onSelectHypothesis,
  onClearHypothesis,
  monthFilter,
  onMonthChange,
  onClearMonth,
  waterFilter,
  onWaterChange,
  depthFilter,
  onDepthChange,
  flyFilterMode,
  onFlyFilterModeChange,
  flyOptions,
  exactFlyOptions,
  flyFilter,
  showFlyChoices,
  onToggleFlyChoices,
  onSelectFly,
  onClearFly,
  speciesOptions,
  speciesFilter,
  onSpeciesChange,
  minimumSizeFilter,
  onMinimumSizeChange,
  filteredExperimentCount,
  filteredSessionCount
}: InsightsFilterPanelProps) => (
  <SectionCard title="Filters" subtitle="Narrow the data without burying the most useful selectors.">
    {!!riverOptions.length && (
      <>
        <AppButton label={showRiverChoices ? 'Hide Rivers' : 'Choose River'} onPress={onToggleRiverChoices} variant="secondary" />
        {showRiverChoices && (
          <ScrollView style={{ maxHeight: 180, borderWidth: 1, borderColor: appTheme.colors.borderStrong, borderRadius: appTheme.radius.md, backgroundColor: appTheme.colors.surfaceLight }}>
            <Pressable onPress={onClearRiver} style={{ paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#d8e2eb' }}>
              <Text style={{ color: appTheme.colors.textDark, fontWeight: '700' }}>All rivers</Text>
            </Pressable>
            {riverOptions.map((river) => (
              <Pressable
                key={river}
                onPress={() => onSelectRiver(river)}
                style={{ paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#d8e2eb' }}
              >
                <Text style={{ color: appTheme.colors.textDark, fontWeight: '600' }}>{river}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </>
    )}

    {hypothesisOptions.length > 1 && (
      <View style={{ gap: 6 }}>
        <AppButton label={showHypothesisChoices ? 'Hide Experiment Questions' : 'Choose Experiment Question'} onPress={onToggleHypothesisChoices} variant="secondary" />
        {showHypothesisChoices && (
          <ScrollView style={{ maxHeight: 220, borderWidth: 1, borderColor: appTheme.colors.borderStrong, borderRadius: appTheme.radius.md, backgroundColor: appTheme.colors.surfaceLight }}>
            <Pressable
              onPress={onClearHypothesis}
              style={{ paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#d8e2eb' }}
            >
              <Text style={{ color: appTheme.colors.textDark, fontWeight: '700' }}>All experiment questions</Text>
            </Pressable>
            {hypothesisOptions
              .filter((option) => option !== 'All')
              .map((option) => (
                <Pressable
                  key={option}
                  onPress={() => onSelectHypothesis(option)}
                  style={{ paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#d8e2eb' }}
                >
                  <Text style={{ color: appTheme.colors.textDark, fontWeight: '600' }}>{option}</Text>
                </Pressable>
              ))}
          </ScrollView>
        )}
        <Text style={{ color: '#d7f3ff' }}>
          Selected experiment question: {hypothesisFilter || 'All experiment questions'}
        </Text>
      </View>
    )}

    <OptionChips label="Month" options={MONTHS} value={monthFilter || null} onChange={onMonthChange} />
    <AppButton label="Clear Month Filter" onPress={onClearMonth} variant="ghost" />
    <OptionChips
      label="Water Type"
      options={['All', ...WATER_TYPES] as string[]}
      value={waterFilter || 'All'}
      onChange={(value) => onWaterChange(value === 'All' ? '' : value)}
    />
    <OptionChips
      label="Depth Range"
      options={['All', ...DEPTH_RANGES] as string[]}
      value={depthFilter || 'All'}
      onChange={(value) => onDepthChange(value === 'All' ? '' : value)}
    />
    <OptionChips
      label="Fly View"
      options={['Pattern', 'Detailed Fly']}
      value={flyFilterMode === 'exact' ? 'Detailed Fly' : 'Pattern'}
      onChange={(value) => onFlyFilterModeChange(value === 'Detailed Fly' ? 'exact' : 'pattern')}
    />
    {(flyFilterMode === 'exact' ? exactFlyOptions.length : flyOptions.length) > 1 && (
      <View style={{ gap: 6 }}>
        <AppButton
          label={
            showFlyChoices
              ? `Hide ${flyFilterMode === 'exact' ? 'Detailed Flies' : 'Fly Patterns'}`
              : `Choose ${flyFilterMode === 'exact' ? 'Detailed Fly' : 'Fly Pattern'}`
          }
          onPress={onToggleFlyChoices}
          variant="secondary"
        />
        {showFlyChoices && (
          <ScrollView style={{ maxHeight: 220, borderWidth: 1, borderColor: appTheme.colors.borderStrong, borderRadius: appTheme.radius.md, backgroundColor: appTheme.colors.surfaceLight }}>
            <Pressable
              onPress={onClearFly}
              style={{ paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#d8e2eb' }}
            >
              <Text style={{ color: appTheme.colors.textDark, fontWeight: '700' }}>
                {flyFilterMode === 'exact' ? 'All detailed flies' : 'All fly patterns'}
              </Text>
            </Pressable>
            {(flyFilterMode === 'exact' ? exactFlyOptions : flyOptions)
              .filter((option) => option !== 'All')
              .map((option) => (
                <Pressable
                  key={option}
                  onPress={() => onSelectFly(option)}
                  style={{ paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#d8e2eb' }}
                >
                  <Text style={{ color: appTheme.colors.textDark, fontWeight: '600' }}>{option}</Text>
                </Pressable>
              ))}
          </ScrollView>
        )}
        <Text style={{ color: '#d7f3ff' }}>
          {flyFilterMode === 'exact'
            ? `Selected detailed fly: ${flyFilter || 'All detailed flies'}`
            : `Selected pattern: ${flyFilter || 'All fly patterns'}`}
        </Text>
      </View>
    )}

    {!!speciesOptions.length && (
      <OptionChips
        label="Species"
        options={speciesOptions}
        value={speciesFilter || 'All'}
        onChange={(value) => onSpeciesChange(value === 'All' ? '' : value)}
      />
    )}
    <TextInput
      value={minimumSizeFilter}
      onChangeText={onMinimumSizeChange}
      placeholder="Minimum fish size (inches)"
      placeholderTextColor="#5a6c78"
      keyboardType="numeric"
      style={inputStyle}
    />
    <Text style={{ color: '#d7f3ff' }}>
      Reviewing {filteredExperimentCount} experiment{filteredExperimentCount === 1 ? '' : 's'} across {filteredSessionCount} session{filteredSessionCount === 1 ? '' : 's'}.
    </Text>
  </SectionCard>
);
