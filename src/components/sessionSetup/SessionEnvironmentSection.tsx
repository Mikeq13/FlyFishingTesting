import React from 'react';
import { Text, TextInput, View } from 'react-native';
import { DepthSelector } from '@/components/DepthSelector';
import { OptionChips } from '@/components/OptionChips';
import { AppButton } from '@/components/ui/AppButton';
import { FormField, getFormInputStyle } from '@/components/ui/FormField';
import { InlineSummaryRow } from '@/components/ui/InlineSummaryRow';
import { SelectableListPanel } from '@/components/ui/SelectableListPanel';
import { useTheme } from '@/design/theme';
import { CompetitionLengthUnit, DepthRange, SessionMode, WaterType } from '@/types/session';
import { Competition, CompetitionSessionRole } from '@/types/group';
import { DEPTH_RANGES, WATER_TYPES } from '@/constants/options';
import { FishingStyle } from '@/utils/fishingStyle';

interface SessionEnvironmentSectionProps {
  mode: SessionMode;
  riverName: string;
  onRiverNameChange: (value: string) => void;
  savedRivers: { id: number; name: string }[];
  showSavedRiverList: boolean;
  onToggleSavedRiverList: () => void;
  onSelectSavedRiver: (name: string) => void;
  waterType: WaterType;
  onWaterTypeChange: (value: WaterType) => void;
  depthRange: DepthRange;
  onDepthRangeChange: (value: DepthRange) => void;
  fishingStyle?: FishingStyle;
  waterTypeOptions?: readonly WaterType[];
  depthRangeOptions?: readonly DepthRange[];
  joinedCompetitions: Competition[];
  selectedCompetitionId: number | null;
  onCompetitionSelect: (competitionId: number | null) => void;
  competitionAssignmentOptions: Array<{ id: number; label: string }>;
  selectedCompetitionAssignmentId: number | null;
  onCompetitionAssignmentSelect: (assignmentId: number | null) => void;
  competitionAssignedGroupLabel: string;
  competitionBeat: string;
  competitionSessionLabel: string;
  competitionRole: CompetitionSessionRole;
  competitionRequiresMeasurement: boolean;
  onCompetitionRequiresMeasurementChange: (value: boolean) => void;
  competitionLengthUnit: CompetitionLengthUnit;
  onCompetitionLengthUnitChange: (value: CompetitionLengthUnit) => void;
}

export const SessionEnvironmentSection = ({
  mode,
  riverName,
  onRiverNameChange,
  savedRivers,
  showSavedRiverList,
  onToggleSavedRiverList,
  onSelectSavedRiver,
  waterType,
  onWaterTypeChange,
  depthRange,
  onDepthRangeChange,
  fishingStyle = 'fly',
  waterTypeOptions = WATER_TYPES,
  depthRangeOptions = DEPTH_RANGES,
  joinedCompetitions,
  selectedCompetitionId,
  onCompetitionSelect,
  competitionAssignmentOptions,
  selectedCompetitionAssignmentId,
  onCompetitionAssignmentSelect,
  competitionAssignedGroupLabel,
  competitionBeat,
  competitionSessionLabel,
  competitionRole,
  competitionRequiresMeasurement,
  onCompetitionRequiresMeasurementChange,
  competitionLengthUnit,
  onCompetitionLengthUnitChange
}: SessionEnvironmentSectionProps) => {
  const { theme } = useTheme();
  const formInputStyle = getFormInputStyle(theme);
  const isBoatStyle = fishingStyle === 'boat_trolling';
  const showDepthControl = fishingStyle !== 'spin_bait';

  return (
  <View style={{ gap: 12, backgroundColor: theme.colors.surfaceAlt, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: theme.colors.border }}>
    {mode !== 'competition' ? (
      <>
        <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 16 }}>Fishing Location</Text>
        {isBoatStyle ? (
          <Text style={{ color: theme.colors.textSoft, lineHeight: 20 }}>
            Boat and trolling journals default to lake water so depth, speed, and location notes match how you fish from the boat.
          </Text>
        ) : null}
        {!!savedRivers.length && (
          <View style={{ gap: 8 }}>
            <AppButton label={showSavedRiverList ? 'Hide Saved Locations' : 'Choose Saved Location'} onPress={onToggleSavedRiverList} variant="secondary" />
            {showSavedRiverList ? (
              <SelectableListPanel
                items={savedRivers.map((river) => ({
                  key: river.id,
                  label: river.name,
                  onPress: () => onSelectSavedRiver(river.name)
                }))}
              />
            ) : null}
          </View>
        )}
        <FormField label="Fishing Location">
              <TextInput value={riverName} onChangeText={onRiverNameChange} placeholder={isBoatStyle ? 'Example: Strawberry Reservoir, east shore' : 'River, lake, pond, reservoir, canal, or access point'} placeholderTextColor={theme.colors.inputPlaceholder} style={formInputStyle} />
        </FormField>
        <OptionChips label="Water Type" options={waterTypeOptions} value={waterType} onChange={(value) => onWaterTypeChange(value as WaterType)} disabled={isBoatStyle} />
        {showDepthControl ? (
          <FormField label="Water Depth">
            <DepthSelector value={depthRange} onChange={onDepthRangeChange} options={depthRangeOptions} />
          </FormField>
        ) : null}
      </>
    ) : (
      <>
        <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 16 }}>Competition Context</Text>
        <Text style={{ color: theme.colors.textSoft, lineHeight: 20 }}>
          Competition sessions are beat-based. Track the beat you drew, the session number, and whether fish will be measured or counted only.
        </Text>
        {!!joinedCompetitions.length ? (
          <OptionChips
            label="Competition"
            options={joinedCompetitions.map((competition) => competition.name)}
            value={joinedCompetitions.find((competition) => competition.id === selectedCompetitionId)?.name ?? joinedCompetitions[0]?.name}
            onChange={(value) => {
              const selected = joinedCompetitions.find((competition) => competition.name === value);
              onCompetitionSelect(selected?.id ?? null);
            }}
          />
        ) : (
          <Text style={{ color: theme.colors.textSoft }}>Join or create a competition in Settings before starting a comp session.</Text>
        )}
        {!!competitionAssignmentOptions.length ? (
          <OptionChips
            label="Saved Assignment"
            options={competitionAssignmentOptions.map((assignment) => assignment.label)}
            value={competitionAssignmentOptions.find((assignment) => assignment.id === selectedCompetitionAssignmentId)?.label ?? competitionAssignmentOptions[0]?.label}
            onChange={(value) => {
              const selected = competitionAssignmentOptions.find((assignment) => assignment.label === value);
              onCompetitionAssignmentSelect(selected?.id ?? null);
            }}
          />
        ) : (
          <Text style={{ color: theme.colors.textSoft }}>No saved assignment yet. Enter your group, beat, and role in Settings first.</Text>
        )}
        <View style={{ gap: 8, backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radius.md, padding: 12 }}>
          <InlineSummaryRow label="Assigned Group" value={competitionAssignedGroupLabel || 'Not selected'} valueMuted={!competitionAssignedGroupLabel} />
          <InlineSummaryRow label="Beat / Section" value={competitionBeat || 'Not selected'} valueMuted={!competitionBeat} />
          <InlineSummaryRow label="Session" value={competitionSessionLabel || 'Not selected'} valueMuted={!competitionSessionLabel} />
          <InlineSummaryRow label="Your Role" value={competitionRole} />
        </View>
        <OptionChips label="Measure Fish This Session?" options={['Yes', 'No'] as const} value={competitionRequiresMeasurement ? 'Yes' : 'No'} onChange={(value) => onCompetitionRequiresMeasurementChange(value === 'Yes')} />
        {competitionRequiresMeasurement ? (
          <>
            <OptionChips label="Competition Length Unit" options={['mm', 'cm'] as const} value={competitionLengthUnit} onChange={(value) => onCompetitionLengthUnitChange(value as CompetitionLengthUnit)} />
            <Text style={{ color: theme.colors.textSoft, lineHeight: 20 }}>
              Length unit stays locked for this session and auto-populates each time you log a fish.
              {competitionLengthUnit === 'cm' ? ' Minimum measurable fish size is 20 cm.' : ' If your comp uses the standard minimum, fish under 200 mm should not count.'}
            </Text>
          </>
        ) : null}
      </>
    )}
  </View>
  );
};
