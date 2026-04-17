import React from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { DepthSelector } from '@/components/DepthSelector';
import { OptionChips } from '@/components/OptionChips';
import { CompetitionLengthUnit, SessionMode, WaterType } from '@/types/session';
import { Competition, CompetitionSessionRole } from '@/types/group';
import { DEPTH_RANGES, WATER_TYPES } from '@/constants/options';

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
  depthRange: (typeof DEPTH_RANGES)[number];
  onDepthRangeChange: (value: (typeof DEPTH_RANGES)[number]) => void;
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
}: SessionEnvironmentSectionProps) => (
  <View style={{ gap: 8, backgroundColor: 'rgba(6, 27, 44, 0.70)', padding: 14, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(202,240,248,0.16)' }}>
    {mode !== 'competition' ? (
      <>
        <Text style={{ color: '#d7f3ff', fontWeight: '700', fontSize: 16 }}>River</Text>
        {!!savedRivers.length && (
          <>
            <Pressable onPress={onToggleSavedRiverList} style={{ backgroundColor: '#1d3557', padding: 12, borderRadius: 12 }}>
              <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>
                {showSavedRiverList ? 'Hide Saved Rivers' : 'Choose Saved River'}
              </Text>
            </Pressable>
            {showSavedRiverList ? (
              <ScrollView style={{ maxHeight: 180, borderWidth: 1, borderColor: 'rgba(202,240,248,0.18)', borderRadius: 12, backgroundColor: 'rgba(245,252,255,0.96)' }}>
                {savedRivers.map((river) => (
                  <Pressable
                    key={river.id}
                    onPress={() => onSelectSavedRiver(river.name)}
                    style={{ paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#d8e2eb' }}
                  >
                    <Text style={{ color: '#0b3d3a', fontWeight: '600' }}>{river.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}
          </>
        )}
        <TextInput value={riverName} onChangeText={onRiverNameChange} placeholder="River name" placeholderTextColor="#5a6c78" style={{ borderWidth: 1, borderColor: 'rgba(202,240,248,0.18)', padding: 12, borderRadius: 12, backgroundColor: 'rgba(245,252,255,0.96)', color: '#102a43' }} />
        <OptionChips label="Water Type" options={WATER_TYPES} value={waterType} onChange={(value) => onWaterTypeChange(value as WaterType)} />
        <Text style={{ color: '#d7f3ff', fontWeight: '700' }}>Water Depth</Text>
        <DepthSelector value={depthRange} onChange={onDepthRangeChange} />
      </>
    ) : (
      <>
        <Text style={{ color: '#d7f3ff', fontWeight: '700', fontSize: 16 }}>Competition Context</Text>
        <Text style={{ color: '#bde6f6', lineHeight: 20 }}>
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
          <Text style={{ color: '#bde6f6' }}>Join or create a competition in Access & Billing before starting a comp session.</Text>
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
          <Text style={{ color: '#bde6f6' }}>No saved assignment yet. Enter your group, beat, and role in Access & Billing first.</Text>
        )}
        <View style={{ gap: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 12 }}>
          <Text style={{ color: '#d7f3ff', fontWeight: '700' }}>Assigned Group</Text>
          <Text style={{ color: '#f7fdff' }}>{competitionAssignedGroupLabel || 'Not selected'}</Text>
          <Text style={{ color: '#d7f3ff', fontWeight: '700' }}>Beat / Section</Text>
          <Text style={{ color: '#f7fdff' }}>{competitionBeat || 'Not selected'}</Text>
          <Text style={{ color: '#d7f3ff', fontWeight: '700' }}>Session</Text>
          <Text style={{ color: '#f7fdff' }}>{competitionSessionLabel || 'Not selected'}</Text>
          <Text style={{ color: '#d7f3ff', fontWeight: '700' }}>Your Role</Text>
          <Text style={{ color: '#f7fdff', textTransform: 'capitalize' }}>{competitionRole}</Text>
        </View>
        <OptionChips label="Measure Fish This Session?" options={['Yes', 'No'] as const} value={competitionRequiresMeasurement ? 'Yes' : 'No'} onChange={(value) => onCompetitionRequiresMeasurementChange(value === 'Yes')} />
        {competitionRequiresMeasurement ? (
          <>
            <OptionChips label="Competition Length Unit" options={['mm', 'cm'] as const} value={competitionLengthUnit} onChange={(value) => onCompetitionLengthUnitChange(value as CompetitionLengthUnit)} />
            <Text style={{ color: '#bde6f6', lineHeight: 20 }}>
              Length unit stays locked for this session and auto-populates each time you log a fish.
              {competitionLengthUnit === 'cm' ? ' Minimum measurable fish size is 20 cm.' : ' If your comp uses the standard minimum, fish under 200 mm should not count.'}
            </Text>
          </>
        ) : null}
      </>
    )}
  </View>
);
