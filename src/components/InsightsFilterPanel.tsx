import React from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { OptionChips } from '@/components/OptionChips';
import { DEPTH_RANGES, MONTHS, TECHNIQUES, WATER_TYPES } from '@/constants/options';
import { SectionCard } from '@/components/ui/SectionCard';
import { AppButton } from '@/components/ui/AppButton';
import { SelectableListPanel } from '@/components/ui/SelectableListPanel';
import { useTheme } from '@/design/theme';

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
  techniqueFilter: string;
  onTechniqueChange: (value: string) => void;
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
  techniqueFilter,
  onTechniqueChange,
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
}: InsightsFilterPanelProps) => {
  const { theme } = useTheme();

  const inputStyle = {
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    padding: 12,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.inputBg,
    color: theme.colors.textDark
  } as const;

  return (
  <SectionCard title="Filters" subtitle="Narrow the data without burying the most useful selectors.">
    {!!riverOptions.length && (
      <>
        <AppButton label={showRiverChoices ? 'Hide Rivers' : 'Choose River'} onPress={onToggleRiverChoices} variant="secondary" />
        {showRiverChoices ? (
          <SelectableListPanel
            items={[
              { key: '__all_rivers__', label: 'All rivers', onPress: onClearRiver },
              ...riverOptions.map((river) => ({ key: river, label: river, onPress: () => onSelectRiver(river) }))
            ]}
          />
        ) : null}
      </>
    )}

    {hypothesisOptions.length > 1 && (
      <View style={{ gap: 6 }}>
        <AppButton label={showHypothesisChoices ? 'Hide Experiment Questions' : 'Choose Experiment Question'} onPress={onToggleHypothesisChoices} variant="secondary" />
        {showHypothesisChoices ? (
          <SelectableListPanel
            maxHeight={220}
            items={[
              { key: '__all_hypotheses__', label: 'All experiment questions', onPress: onClearHypothesis },
              ...hypothesisOptions
                .filter((option) => option !== 'All')
                .map((option) => ({ key: option, label: option, onPress: () => onSelectHypothesis(option) }))
            ]}
          />
        ) : null}
        <Text style={{ color: theme.colors.textSoft }}>
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
      label="Technique"
      options={['All', ...TECHNIQUES] as string[]}
      value={techniqueFilter || 'All'}
      onChange={(value) => onTechniqueChange(value === 'All' ? '' : value)}
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
        {showFlyChoices ? (
          <SelectableListPanel
            maxHeight={220}
            items={[
              {
                key: '__all_flies__',
                label: flyFilterMode === 'exact' ? 'All detailed flies' : 'All fly patterns',
                onPress: onClearFly
              },
              ...(flyFilterMode === 'exact' ? exactFlyOptions : flyOptions)
                .filter((option) => option !== 'All')
                .map((option) => ({ key: option, label: option, onPress: () => onSelectFly(option) }))
            ]}
          />
        ) : null}
        <Text style={{ color: theme.colors.textSoft }}>
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
      placeholderTextColor={theme.colors.inputPlaceholder}
      keyboardType="numeric"
      style={inputStyle}
    />
    <Text style={{ color: theme.colors.textSoft }}>
      Reviewing {filteredExperimentCount} experiment{filteredExperimentCount === 1 ? '' : 's'} across {filteredSessionCount} session{filteredSessionCount === 1 ? '' : 's'}.
    </Text>
  </SectionCard>
  );
};
