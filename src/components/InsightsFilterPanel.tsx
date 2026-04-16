import React from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { OptionChips } from '@/components/OptionChips';
import { DEPTH_RANGES, MONTHS, WATER_TYPES } from '@/constants/options';

const inputStyle = {
  borderWidth: 1,
  borderColor: 'rgba(202,240,248,0.18)',
  padding: 12,
  borderRadius: 12,
  backgroundColor: 'rgba(245,252,255,0.96)',
  color: '#102a43'
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
  <View style={{ gap: 8, backgroundColor: 'rgba(6, 27, 44, 0.70)', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: 'rgba(202,240,248,0.16)' }}>
    {!!riverOptions.length && (
      <>
        <Pressable onPress={onToggleRiverChoices} style={{ backgroundColor: '#1d3557', padding: 12, borderRadius: 12 }}>
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>
            {showRiverChoices ? 'Hide Rivers' : 'Choose River'}
          </Text>
        </Pressable>
        {showRiverChoices && (
          <ScrollView style={{ maxHeight: 180, borderWidth: 1, borderColor: 'rgba(202,240,248,0.18)', borderRadius: 12, backgroundColor: 'rgba(245,252,255,0.96)' }}>
            <Pressable onPress={onClearRiver} style={{ paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#d8e2eb' }}>
              <Text style={{ color: '#0b3d3a', fontWeight: '700' }}>All rivers</Text>
            </Pressable>
            {riverOptions.map((river) => (
              <Pressable
                key={river}
                onPress={() => onSelectRiver(river)}
                style={{ paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#d8e2eb' }}
              >
                <Text style={{ color: '#0b3d3a', fontWeight: '600' }}>{river}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </>
    )}

    {hypothesisOptions.length > 1 && (
      <View style={{ gap: 6 }}>
        <Pressable onPress={onToggleHypothesisChoices} style={{ backgroundColor: '#1d3557', padding: 12, borderRadius: 12 }}>
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>
            {showHypothesisChoices ? 'Hide Experiment Questions' : 'Choose Experiment Question'}
          </Text>
        </Pressable>
        {showHypothesisChoices && (
          <ScrollView style={{ maxHeight: 220, borderWidth: 1, borderColor: 'rgba(202,240,248,0.18)', borderRadius: 12, backgroundColor: 'rgba(245,252,255,0.96)' }}>
            <Pressable
              onPress={onClearHypothesis}
              style={{ paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#d8e2eb' }}
            >
              <Text style={{ color: '#0b3d3a', fontWeight: '700' }}>All experiment questions</Text>
            </Pressable>
            {hypothesisOptions
              .filter((option) => option !== 'All')
              .map((option) => (
                <Pressable
                  key={option}
                  onPress={() => onSelectHypothesis(option)}
                  style={{ paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#d8e2eb' }}
                >
                  <Text style={{ color: '#0b3d3a', fontWeight: '600' }}>{option}</Text>
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
    <Pressable onPress={onClearMonth} style={{ backgroundColor: 'rgba(255,255,255,0.12)', padding: 10, borderRadius: 12 }}>
      <Text style={{ color: '#f7fdff', textAlign: 'center', fontWeight: '700' }}>Clear Month Filter</Text>
    </Pressable>
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
        <Pressable onPress={onToggleFlyChoices} style={{ backgroundColor: '#1d3557', padding: 12, borderRadius: 12 }}>
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>
            {showFlyChoices
              ? `Hide ${flyFilterMode === 'exact' ? 'Detailed Flies' : 'Fly Patterns'}`
              : `Choose ${flyFilterMode === 'exact' ? 'Detailed Fly' : 'Fly Pattern'}`}
          </Text>
        </Pressable>
        {showFlyChoices && (
          <ScrollView style={{ maxHeight: 220, borderWidth: 1, borderColor: 'rgba(202,240,248,0.18)', borderRadius: 12, backgroundColor: 'rgba(245,252,255,0.96)' }}>
            <Pressable
              onPress={onClearFly}
              style={{ paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#d8e2eb' }}
            >
              <Text style={{ color: '#0b3d3a', fontWeight: '700' }}>
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
                  <Text style={{ color: '#0b3d3a', fontWeight: '600' }}>{option}</Text>
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
  </View>
);
