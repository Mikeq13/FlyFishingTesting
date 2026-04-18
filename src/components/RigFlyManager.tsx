import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { FlySetup, SavedFly } from '@/types/fly';
import { FlySelector } from './FlySelector';
import { RigFlyAssignment, RigSetup } from '@/types/rig';
import { clearRigAssignmentFly, createEmptyFly, getRigPositionsForCount, replaceRigAssignmentFly, replaceRigAssignmentPosition, syncRigAssignments } from '@/utils/rigSetup';
import { OptionChips } from './OptionChips';
import { SectionCard } from '@/components/ui/SectionCard';
import { AppButton } from '@/components/ui/AppButton';
import { appTheme } from '@/design/theme';

const sameFly = (left: FlySetup, right: FlySetup) =>
  left.name === right.name &&
  left.intent === right.intent &&
  left.hookSize === right.hookSize &&
  left.beadSizeMm === right.beadSizeMm &&
  left.beadColor === right.beadColor &&
  left.bodyType === right.bodyType &&
  left.bugFamily === right.bugFamily &&
  left.bugStage === right.bugStage &&
  left.tail === right.tail &&
  left.collar === right.collar;

interface RigFlyManagerProps {
  title: string;
  rigSetup: RigSetup;
  savedFlies: SavedFly[];
  onChange: (nextRigSetup: RigSetup) => void;
  onCreateFly: (fly: FlySetup) => Promise<void>;
}

export const RigFlyManager = ({ title, rigSetup, savedFlies, onChange, onCreateFly }: RigFlyManagerProps) => {
  const [showSavedFlyList, setShowSavedFlyList] = useState(false);
  const [showAddFly, setShowAddFly] = useState(false);
  const [showFlyManager, setShowFlyManager] = useState(() => !rigSetup.assignments.some((assignment) => assignment.fly.name.trim()));
  const [draftFly, setDraftFly] = useState<FlySetup>(createEmptyFly());
  const [targetAssignmentIndex, setTargetAssignmentIndex] = useState<number | null>(null);
  const sortedSavedFlies = useMemo(() => [...savedFlies].sort((a, b) => a.name.localeCompare(b.name)), [savedFlies]);
  const selectedAssignments = rigSetup.assignments;
  const allowedPositions = getRigPositionsForCount(selectedAssignments.length || 1);
  const previousSignature = useRef(`${selectedAssignments.length}:${selectedAssignments.map((assignment) => assignment.fly.name).join('|')}`);

  useEffect(() => {
    const currentSignature = `${selectedAssignments.length}:${selectedAssignments.map((assignment) => assignment.fly.name).join('|')}`;
    if (previousSignature.current !== currentSignature) {
      const firstEmptyIndex = selectedAssignments.findIndex((assignment) => !assignment.fly.name.trim());
      if (firstEmptyIndex >= 0) {
        setTargetAssignmentIndex(firstEmptyIndex);
        setShowSavedFlyList(true);
        setShowFlyManager(true);
      } else if (selectedAssignments.every((assignment) => assignment.fly.name.trim())) {
        setShowFlyManager(false);
      }
      previousSignature.current = currentSignature;
    }
  }, [selectedAssignments]);

  const openChooserForIndex = (index: number) => {
    setTargetAssignmentIndex(index);
    setShowSavedFlyList(true);
    setShowAddFly(false);
  };

  const assignFlyAtIndex = (index: number, fly: FlySetup) => {
    onChange(replaceRigAssignmentFly(rigSetup, index, fly));
    setTargetAssignmentIndex(null);
    setShowSavedFlyList(false);
  };

  return (
    <SectionCard title={title} subtitle="Manage saved flies, quick-add a new one, and keep role assignments easy to scan.">
      {!showFlyManager && selectedAssignments.length ? (
        <View style={{ gap: 8 }}>
          {selectedAssignments.map((assignment, index) => (
            <View key={`summary-${assignment.position}-${assignment.fly.name || 'empty'}-${index}`} style={{ gap: 6, borderRadius: appTheme.radius.md, padding: 10, backgroundColor: appTheme.colors.surfaceMuted }}>
              <Text style={{ color: appTheme.colors.text, fontWeight: '700' }}>{assignment.position}</Text>
              <Text style={{ color: appTheme.colors.textSoft }}>
                {assignment.fly.name.trim()
                  ? `${assignment.fly.name} #${assignment.fly.hookSize} | ${assignment.fly.beadColor} | ${assignment.fly.beadSizeMm}`
                  : 'No fly selected yet'}
              </Text>
              <AppButton
                label="Change Fly"
                onPress={() => {
                  setShowFlyManager(true);
                  openChooserForIndex(index);
                }}
                variant="ghost"
              />
            </View>
          ))}
        </View>
      ) : null}

      {showFlyManager ? (
        <>
      {!!sortedSavedFlies.length ? (
        <>
          <AppButton label={showSavedFlyList ? 'Hide Existing Flies' : 'Existing Fly'} onPress={() => setShowSavedFlyList((current) => !current)} variant="secondary" />
          {showSavedFlyList ? (
            <ScrollView style={{ maxHeight: 180, borderWidth: 1, borderColor: appTheme.colors.borderStrong, borderRadius: appTheme.radius.md, backgroundColor: appTheme.colors.surfaceLight }}>
              {sortedSavedFlies.map((savedFly) => {
                const selected = selectedAssignments.some((assignment) => sameFly(assignment.fly, savedFly));
                return (
                  <Pressable
                    key={savedFly.id}
                    onPress={() => {
                      if (targetAssignmentIndex !== null) {
                        assignFlyAtIndex(targetAssignmentIndex, { ...savedFly });
                        return;
                      }
                      const firstEmptyIndex = selectedAssignments.findIndex((assignment) => !assignment.fly.name.trim());
                      if (firstEmptyIndex >= 0) {
                        assignFlyAtIndex(firstEmptyIndex, { ...savedFly });
                        return;
                      }
                      if (selected) {
                        return;
                      }
                    }}
                    style={{ paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#d8e2eb', backgroundColor: selected ? 'rgba(42,157,143,0.18)' : 'transparent' }}
                  >
                    <Text style={{ color: appTheme.colors.textDark, fontWeight: '700' }}>{savedFly.name}</Text>
                    <Text style={{ color: appTheme.colors.textDarkSoft, fontSize: 12 }}>
                      #{savedFly.hookSize} | {savedFly.beadColor} | {savedFly.beadSizeMm}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}
        </>
      ) : null}

      <AppButton label={showAddFly ? 'Hide Fly Builder' : 'Quick Add Fly'} onPress={() => setShowAddFly((current) => !current)} variant="tertiary" />

      {showAddFly ? (
        <FlySelector
          title="New Fly"
          value={draftFly}
          savedFlies={[]}
          onChange={setDraftFly}
          onSave={async () => {
            try {
              await onCreateFly(draftFly);
              if (targetAssignmentIndex !== null) {
                assignFlyAtIndex(targetAssignmentIndex, draftFly);
              }
              setShowAddFly(false);
              setDraftFly(createEmptyFly());
              setShowFlyManager(false);
            } catch (error) {
              Alert.alert('Unable to save fly', error instanceof Error ? error.message : 'Please try again.');
            }
          }}
        />
      ) : null}

      <Text style={{ color: '#d7f3ff', fontWeight: '700' }}>Current Flies</Text>
      {!selectedAssignments.length ? (
        <Text style={{ color: '#bde6f6' }}>No flies selected for this rig yet.</Text>
      ) : (
        selectedAssignments.map((assignment, index) => (
          <View key={`assignment-${assignment.position}-${assignment.fly.name || 'empty'}-${index}`} style={{ gap: 8, borderRadius: appTheme.radius.md, padding: 10, backgroundColor: appTheme.colors.surfaceMuted }}>
            <Text style={{ color: '#f7fdff', fontWeight: '700' }}>
              {assignment.position}
            </Text>
            <Text style={{ color: '#d7f3ff' }}>
              {assignment.fly.name.trim()
                ? `${assignment.fly.name} #${assignment.fly.hookSize} | ${assignment.fly.beadColor} | ${assignment.fly.beadSizeMm}`
                : 'No fly selected yet'}
            </Text>
            <OptionChips
              label="Fly Position"
              options={allowedPositions}
              value={assignment.position}
              onChange={(value) =>
                onChange(
                  syncRigAssignments(
                    rigSetup,
                    replaceRigAssignmentPosition(selectedAssignments, index, value as RigFlyAssignment['position'])
                  )
                )
              }
            />
            <AppButton
              label={assignment.fly.name.trim() ? 'Replace Fly' : 'Existing Fly'}
              onPress={() => openChooserForIndex(index)}
              variant="tertiary"
            />
            {assignment.fly.name.trim() ? (
              <AppButton label="Clear Fly" onPress={() => onChange(clearRigAssignmentFly(rigSetup, index))} variant="danger" />
            ) : null}
            {targetAssignmentIndex === index ? (
              <Text style={{ color: '#bde6f6' }}>Choose a saved fly or quick-add one for this role.</Text>
            ) : null}
          </View>
        ))
      )}
      {selectedAssignments.some((assignment) => assignment.fly.name.trim()) ? (
        <AppButton label="Hide Fly Details" onPress={() => setShowFlyManager(false)} variant="ghost" />
      ) : null}
        </>
      ) : null}
    </SectionCard>
  );
};
