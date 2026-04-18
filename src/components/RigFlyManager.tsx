import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { FlySetup, SavedFly } from '@/types/fly';
import { FlySelector } from './FlySelector';
import { RigFlyAssignment, RigSetup } from '@/types/rig';
import { clearRigAssignmentFly, createEmptyFly, getRigPositionsForCount, replaceRigAssignmentFly, replaceRigAssignmentPosition, syncRigAssignments } from '@/utils/rigSetup';
import { OptionChips } from './OptionChips';
import { SectionCard } from '@/components/ui/SectionCard';
import { AppButton } from '@/components/ui/AppButton';
import { useTheme } from '@/design/theme';
import { ModalSurface } from '@/components/ui/ModalSurface';

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
  tone?: 'dark' | 'light';
  editorOnly?: boolean;
  foregroundQuickAdd?: boolean;
}

export const RigFlyManager = ({
  title,
  rigSetup,
  savedFlies,
  onChange,
  onCreateFly,
  tone = 'dark',
  editorOnly = false,
  foregroundQuickAdd = false
}: RigFlyManagerProps) => {
  const { theme } = useTheme();
  const [showSavedFlyList, setShowSavedFlyList] = useState(editorOnly);
  const [showAddFly, setShowAddFly] = useState(false);
  const [showFlyManager, setShowFlyManager] = useState(() => editorOnly || !rigSetup.assignments.some((assignment) => assignment.fly.name.trim()));
  const [draftFly, setDraftFly] = useState<FlySetup>(createEmptyFly());
  const [targetAssignmentIndex, setTargetAssignmentIndex] = useState<number | null>(null);
  const sortedSavedFlies = useMemo(() => [...savedFlies].sort((a, b) => a.name.localeCompare(b.name)), [savedFlies]);
  const selectedAssignments = rigSetup.assignments;
  const allowedPositions = getRigPositionsForCount(selectedAssignments.length || 1);
  const previousSignature = useRef(`${selectedAssignments.length}:${selectedAssignments.map((assignment) => assignment.fly.name).join('|')}`);
  const isLightTone = tone === 'light';

  useEffect(() => {
    const currentSignature = `${selectedAssignments.length}:${selectedAssignments.map((assignment) => assignment.fly.name).join('|')}`;
    if (previousSignature.current !== currentSignature) {
      const firstEmptyIndex = selectedAssignments.findIndex((assignment) => !assignment.fly.name.trim());
      if (firstEmptyIndex >= 0) {
        setTargetAssignmentIndex(firstEmptyIndex);
        setShowSavedFlyList(true);
        setShowFlyManager(true);
      } else if (!editorOnly && selectedAssignments.every((assignment) => assignment.fly.name.trim())) {
        setShowFlyManager(false);
      }
      previousSignature.current = currentSignature;
    }
  }, [editorOnly, selectedAssignments]);

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

  const openQuickAddForIndex = (index: number) => {
    setTargetAssignmentIndex(index);
    setShowAddFly(true);
    setShowSavedFlyList(false);
    setDraftFly(createEmptyFly());
  };

  const renderAssignmentCard = (assignment: RigFlyAssignment, index: number) => (
    <View
      key={`assignment-${assignment.position}-${assignment.fly.name || 'empty'}-${index}`}
      style={{
        gap: 8,
        borderRadius: theme.radius.md,
        padding: 10,
        backgroundColor: isLightTone ? theme.colors.nestedSurface : theme.colors.surfaceMuted,
        borderWidth: isLightTone ? 1 : 0,
        borderColor: isLightTone ? theme.colors.nestedSurfaceBorder : 'transparent'
      }}
    >
      <Text style={{ color: isLightTone ? theme.colors.textDark : theme.colors.text, fontWeight: '700' }}>
        {assignment.position}
      </Text>
      <Text style={{ color: isLightTone ? theme.colors.textDarkSoft : theme.colors.textSoft }}>
        {assignment.fly.name.trim()
          ? `${assignment.fly.name} #${assignment.fly.hookSize} | ${assignment.fly.beadColor} | ${assignment.fly.beadSizeMm}`
          : 'No fly selected yet'}
      </Text>
      <OptionChips
        label="Fly Position"
        options={allowedPositions}
        value={assignment.position}
        tone={isLightTone ? 'light' : 'dark'}
        onChange={(value) =>
          onChange(
            syncRigAssignments(
              rigSetup,
              replaceRigAssignmentPosition(selectedAssignments, index, value as RigFlyAssignment['position'])
            )
          )
        }
      />
      <View style={{ gap: 8 }}>
        <AppButton
          label={assignment.fly.name.trim() ? 'Choose Existing Fly' : 'Choose Existing Fly'}
          onPress={() => openChooserForIndex(index)}
          variant="tertiary"
          surfaceTone={isLightTone ? 'light' : 'dark'}
        />
        <AppButton
          label={assignment.fly.name.trim() ? 'Quick Add Replacement' : 'Quick Add Fly'}
          onPress={() => openQuickAddForIndex(index)}
          variant="secondary"
          surfaceTone={isLightTone ? 'light' : 'dark'}
        />
        {assignment.fly.name.trim() ? (
          <AppButton label="Clear Fly" onPress={() => onChange(clearRigAssignmentFly(rigSetup, index))} variant="danger" surfaceTone={isLightTone ? 'light' : 'dark'} />
        ) : null}
      </View>
      {targetAssignmentIndex === index ? (
        <Text style={{ color: isLightTone ? theme.colors.textDarkSoft : theme.colors.textSoft }}>
          {showAddFly ? 'Build a fly for this slot in the foreground editor.' : 'Choose a saved fly for this slot below.'}
        </Text>
      ) : null}
    </View>
  );

  return (
    <SectionCard title={title} subtitle="Manage saved flies, quick-add a new one, and keep role assignments easy to scan." tone={tone}>
      {!editorOnly && !showFlyManager && selectedAssignments.length ? (
        <View style={{ gap: 8 }}>
          {selectedAssignments.map((assignment, index) => (
            <View key={`summary-${assignment.position}-${assignment.fly.name || 'empty'}-${index}`} style={{ gap: 6, borderRadius: theme.radius.md, padding: 10, backgroundColor: isLightTone ? theme.colors.nestedSurface : theme.colors.surfaceMuted, borderWidth: isLightTone ? 1 : 0, borderColor: isLightTone ? theme.colors.nestedSurfaceBorder : 'transparent' }}>
              <Text style={{ color: isLightTone ? theme.colors.textDark : theme.colors.text, fontWeight: '700' }}>{assignment.position}</Text>
              <Text style={{ color: isLightTone ? theme.colors.textDarkSoft : theme.colors.textSoft }}>
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
                surfaceTone={isLightTone ? 'light' : 'dark'}
              />
            </View>
          ))}
        </View>
      ) : null}

      {showFlyManager ? (
        <>
      <Text style={{ color: isLightTone ? theme.colors.textDark : theme.colors.textMuted, fontWeight: '700' }}>
        Current Flies
      </Text>
      {!selectedAssignments.length ? (
        <Text style={{ color: isLightTone ? theme.colors.textDarkSoft : theme.colors.textSoft }}>No flies selected for this rig yet.</Text>
      ) : (
        selectedAssignments.map((assignment, index) => renderAssignmentCard(assignment, index))
      )}
      {!!sortedSavedFlies.length && targetAssignmentIndex !== null ? (
        <>
          {!editorOnly ? (
            <AppButton
              label={showSavedFlyList ? 'Hide Existing Flies' : 'Existing Fly'}
              onPress={() => {
                setShowSavedFlyList((current) => !current);
                if (!showSavedFlyList) setShowAddFly(false);
              }}
              variant="secondary"
              surfaceTone={isLightTone ? 'light' : 'dark'}
            />
          ) : null}
          {showSavedFlyList ? (
            <ScrollView style={{ maxHeight: 180, borderWidth: 1, borderColor: theme.colors.borderStrong, borderRadius: theme.radius.md, backgroundColor: theme.colors.surfaceLight }}>
              {sortedSavedFlies.map((savedFly) => {
                const selected = selectedAssignments.some((assignment) => sameFly(assignment.fly, savedFly));
                return (
                  <Pressable
                    key={savedFly.id}
                    onPress={() => assignFlyAtIndex(targetAssignmentIndex, { ...savedFly })}
                    style={{ paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight, backgroundColor: selected ? theme.colors.chipSelectedBg : 'transparent' }}
                  >
                    <Text style={{ color: theme.colors.textDark, fontWeight: '700' }}>{savedFly.name}</Text>
                    <Text style={{ color: theme.colors.textDarkSoft, fontSize: 12 }}>
                      #{savedFly.hookSize} | {savedFly.beadColor} | {savedFly.beadSizeMm}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}
        </>
      ) : null}

      {targetAssignmentIndex !== null && showAddFly && !foregroundQuickAdd ? (
        <FlySelector
          title={`Fly For ${selectedAssignments[targetAssignmentIndex]?.position ?? 'Slot'}`}
          value={draftFly}
          savedFlies={[]}
          onChange={setDraftFly}
          onSave={async () => {
            try {
              await onCreateFly(draftFly);
              assignFlyAtIndex(targetAssignmentIndex, draftFly);
              setShowAddFly(false);
              setDraftFly(createEmptyFly());
              if (!editorOnly) {
                setShowFlyManager(false);
              }
            } catch (error) {
              Alert.alert('Unable to save fly', error instanceof Error ? error.message : 'Please try again.');
            }
          }}
          onConfirm={() => {
            if (targetAssignmentIndex !== null) {
              assignFlyAtIndex(targetAssignmentIndex, draftFly);
              setShowAddFly(false);
              setDraftFly(createEmptyFly());
            }
          }}
          confirmLabel="Use This Fly"
        />
      ) : null}

      {!editorOnly && selectedAssignments.some((assignment) => assignment.fly.name.trim()) ? (
        <AppButton label="Hide Fly Details" onPress={() => setShowFlyManager(false)} variant="ghost" surfaceTone={isLightTone ? 'light' : 'dark'} />
      ) : null}
        </>
      ) : null}
      <Modal visible={targetAssignmentIndex !== null && showAddFly && foregroundQuickAdd} transparent animationType="fade" onRequestClose={() => setShowAddFly(false)}>
        <ModalSurface
          title={`Quick Add Fly For ${targetAssignmentIndex !== null ? selectedAssignments[targetAssignmentIndex]?.position ?? 'Slot' : 'Slot'}`}
          subtitle="Build the fly in the foreground, then return to the same setup flow."
        >
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
                if (!editorOnly) {
                  setShowFlyManager(false);
                }
              } catch (error) {
                Alert.alert('Unable to save fly', error instanceof Error ? error.message : 'Please try again.');
              }
            }}
            onConfirm={() => {
              if (targetAssignmentIndex !== null) {
                assignFlyAtIndex(targetAssignmentIndex, draftFly);
                setShowAddFly(false);
                setDraftFly(createEmptyFly());
              }
            }}
            confirmLabel="Use This Fly"
          />
          <AppButton label="Cancel" onPress={() => setShowAddFly(false)} variant="ghost" surfaceTone="light" />
        </ModalSurface>
      </Modal>
    </SectionCard>
  );
};
