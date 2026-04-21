import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { FlySetup, SavedFly } from '@/types/fly';
import { FlySelector } from './FlySelector';
import { RigFlyAssignment, RigSetup } from '@/types/rig';
import { clearRigAssignmentFly, createEmptyFly, getRigPositionsForCount, replaceRigAssignmentFly, replaceRigAssignmentPosition, syncRigAssignments } from '@/utils/rigSetup';
import { OptionChips } from './OptionChips';
import { SectionCard } from '@/components/ui/SectionCard';
import { AppButton } from '@/components/ui/AppButton';
import { SurfaceTone, useTheme } from '@/design/theme';
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
  tone?: SurfaceTone;
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
  const [editorMode, setEditorMode] = useState<'new' | 'adjust' | null>(null);
  const [showFlyManager, setShowFlyManager] = useState(() => editorOnly || !rigSetup.assignments.some((assignment) => assignment.fly.name.trim()));
  const [draftFly, setDraftFly] = useState<FlySetup>(createEmptyFly());
  const [targetAssignmentIndex, setTargetAssignmentIndex] = useState<number | null>(null);
  const sortedSavedFlies = useMemo(() => [...savedFlies].sort((a, b) => a.name.localeCompare(b.name)), [savedFlies]);
  const selectedAssignments = rigSetup.assignments;
  const allowedPositions = getRigPositionsForCount(selectedAssignments.length || 1);
  const previousSignature = useRef(`${selectedAssignments.length}:${selectedAssignments.map((assignment) => assignment.fly.name).join('|')}`);
  const isLightTone = tone === 'light';
  const isModalTone = tone === 'modal';
  const primaryTextColor = isLightTone ? theme.colors.textDark : isModalTone ? theme.colors.modalText : theme.colors.text;
  const secondaryTextColor = isLightTone ? theme.colors.textDarkSoft : isModalTone ? theme.colors.modalTextSoft : theme.colors.textSoft;
  const listBackground = isModalTone ? theme.colors.modalSurfaceAlt : theme.colors.surfaceLight;
  const listBorder = isModalTone ? theme.colors.modalNestedBorder : theme.colors.borderStrong;
  const nestedBackground = isLightTone ? theme.colors.nestedSurface : isModalTone ? theme.colors.modalNestedSurface : theme.colors.surfaceMuted;
  const nestedBorder = isLightTone ? theme.colors.nestedSurfaceBorder : isModalTone ? theme.colors.modalNestedBorder : 'transparent';

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
    setEditorMode(null);
    if (foregroundQuickAdd) {
      setShowSavedFlyList(false);
      return;
    }
    setShowSavedFlyList(true);
  };

  const assignFlyAtIndex = (index: number, fly: FlySetup) => {
    onChange(replaceRigAssignmentFly(rigSetup, index, fly));
    setTargetAssignmentIndex(null);
    setShowSavedFlyList(false);
    setEditorMode(null);
    if (!editorOnly) {
      setShowFlyManager(true);
    }
  };

  const openFlyEditorForIndex = (index: number, mode: 'new' | 'adjust') => {
    setTargetAssignmentIndex(index);
    setEditorMode(mode);
    setShowSavedFlyList(false);
    setDraftFly(mode === 'adjust' ? { ...selectedAssignments[index].fly } : createEmptyFly());
  };

  const closeForegroundPicker = () => {
    setTargetAssignmentIndex(null);
    setShowSavedFlyList(false);
    setEditorMode(null);
  };

  const renderAssignmentCard = (assignment: RigFlyAssignment, index: number) => (
    <View
      key={`assignment-${assignment.position}-${assignment.fly.name || 'empty'}-${index}`}
      style={{
        gap: 8,
        borderRadius: theme.radius.md,
        padding: 10,
        backgroundColor: nestedBackground,
        borderWidth: isLightTone ? 1 : 0,
        borderColor: nestedBorder
      }}
    >
      <Text style={{ color: primaryTextColor, fontWeight: '700' }}>
        {assignment.position}
      </Text>
      <Text style={{ color: secondaryTextColor }}>
        {assignment.fly.name.trim()
          ? `${assignment.fly.name} #${assignment.fly.hookSize} | ${assignment.fly.beadColor} | ${assignment.fly.beadSizeMm}`
          : 'No fly selected yet'}
      </Text>
      <OptionChips
        label="Fly Position"
        options={allowedPositions}
        value={assignment.position}
        tone={tone}
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
          label="Saved Flies"
          onPress={() => openChooserForIndex(index)}
          variant="tertiary"
          surfaceTone={tone}
        />
        {assignment.fly.name.trim() ? (
          <AppButton
            label="Adjust Current Fly"
            onPress={() => openFlyEditorForIndex(index, 'adjust')}
            variant="secondary"
            surfaceTone={tone}
          />
        ) : null}
        <AppButton label="New Fly" onPress={() => openFlyEditorForIndex(index, 'new')} variant="secondary" surfaceTone={tone} />
        {assignment.fly.name.trim() ? (
          <AppButton label="Clear Fly" onPress={() => onChange(clearRigAssignmentFly(rigSetup, index))} variant="danger" surfaceTone={tone} />
        ) : null}
      </View>
      {targetAssignmentIndex === index ? (
        <Text style={{ color: secondaryTextColor }}>
          {editorMode === 'new'
            ? 'Build a new fly for this slot in the foreground editor.'
            : editorMode === 'adjust'
              ? 'Tune hook size or bead/weight for the current fly without replacing the rest of its setup.'
              : 'Choose a saved fly for this slot below.'}
        </Text>
      ) : null}
    </View>
  );

  return (
    <SectionCard title={title} subtitle="Manage saved flies, quick-add a new one, and keep role assignments easy to scan." tone={tone}>
      {!editorOnly && !showFlyManager && selectedAssignments.length ? (
        <View style={{ gap: 8 }}>
          {selectedAssignments.map((assignment, index) => (
            <View key={`summary-${assignment.position}-${assignment.fly.name || 'empty'}-${index}`} style={{ gap: 6, borderRadius: theme.radius.md, padding: 10, backgroundColor: nestedBackground, borderWidth: isLightTone ? 1 : 0, borderColor: nestedBorder }}>
              <Text style={{ color: primaryTextColor, fontWeight: '700' }}>{assignment.position}</Text>
              <Text style={{ color: secondaryTextColor }}>
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
                surfaceTone={tone}
              />
            </View>
          ))}
        </View>
      ) : null}

      {showFlyManager ? (
        <>
      <Text style={{ color: tone === 'dark' ? theme.colors.textMuted : secondaryTextColor, fontWeight: '700' }}>
        Current Flies
      </Text>
      {!selectedAssignments.length ? (
        <Text style={{ color: secondaryTextColor }}>No flies selected for this rig yet.</Text>
      ) : (
        selectedAssignments.map((assignment, index) => renderAssignmentCard(assignment, index))
      )}
      {!foregroundQuickAdd && !!sortedSavedFlies.length && targetAssignmentIndex !== null ? (
        <>
          {!editorOnly ? (
            <AppButton
              label={showSavedFlyList ? 'Hide Saved Flies' : 'Saved Flies'}
              onPress={() => {
                setShowSavedFlyList((current) => !current);
                if (!showSavedFlyList) setEditorMode(null);
              }}
              variant="secondary"
              surfaceTone={tone}
            />
          ) : null}
          {showSavedFlyList ? (
            <ScrollView style={{ maxHeight: 180, borderWidth: 1, borderColor: listBorder, borderRadius: theme.radius.md, backgroundColor: listBackground }}>
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

      {!foregroundQuickAdd && !sortedSavedFlies.length && targetAssignmentIndex !== null && editorMode === null ? (
        <View
          style={{
            gap: 6,
            borderRadius: theme.radius.md,
            padding: 12,
            backgroundColor: theme.colors.surfaceLight,
            borderWidth: 1,
            borderColor: theme.colors.borderStrong
          }}
        >
          <Text style={{ color: theme.colors.textDark, fontWeight: '700' }}>No saved flies for this angler yet</Text>
          <Text style={{ color: theme.colors.textDarkSoft }}>
            Build a fly for this slot in the foreground editor, then save it to the current angler&apos;s library when you want to reuse it later.
          </Text>
        </View>
      ) : null}

      {targetAssignmentIndex !== null && editorMode !== null && !foregroundQuickAdd ? (
        <FlySelector
          title={`${editorMode === 'adjust' ? 'Adjust Fly For' : 'New Fly For'} ${selectedAssignments[targetAssignmentIndex]?.position ?? 'Slot'}`}
          value={draftFly}
          savedFlies={[]}
          onChange={setDraftFly}
          onSave={async () => {
            try {
              await onCreateFly(draftFly);
              assignFlyAtIndex(targetAssignmentIndex, draftFly);
              setEditorMode(null);
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
              setEditorMode(null);
              setDraftFly(createEmptyFly());
            }
          }}
          confirmLabel={editorMode === 'adjust' ? 'Apply Adjustments' : 'Use This Fly'}
          tone={tone}
          fieldMode={editorMode === 'adjust' ? 'adjust' : 'full'}
        />
      ) : null}

      {!editorOnly && selectedAssignments.some((assignment) => assignment.fly.name.trim()) ? (
        <AppButton label="Hide Fly Details" onPress={() => setShowFlyManager(false)} variant="ghost" surfaceTone={tone} />
      ) : null}
        </>
      ) : null}
      <Modal visible={targetAssignmentIndex !== null && editorMode !== null && foregroundQuickAdd} transparent animationType="fade" onRequestClose={() => setEditorMode(null)}>
        <ModalSurface
          title={`${editorMode === 'adjust' ? 'Adjust Fly For' : 'New Fly For'} ${targetAssignmentIndex !== null ? selectedAssignments[targetAssignmentIndex]?.position ?? 'Slot' : 'Slot'}`}
          subtitle={
            editorMode === 'adjust'
              ? 'Tune the current fly in the foreground, then return to the same setup flow.'
              : 'Build the fly in the foreground, then return to the same setup flow.'
          }
        >
          <FlySelector
            title={editorMode === 'adjust' ? 'Adjust Current Fly' : 'New Fly'}
            value={draftFly}
            savedFlies={[]}
            onChange={setDraftFly}
            onSave={async () => {
              try {
                await onCreateFly(draftFly);
                if (targetAssignmentIndex !== null) {
                  assignFlyAtIndex(targetAssignmentIndex, draftFly);
                }
                setEditorMode(null);
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
                setEditorMode(null);
                setDraftFly(createEmptyFly());
              }
            }}
            confirmLabel={editorMode === 'adjust' ? 'Apply Adjustments' : 'Use This Fly'}
            tone="modal"
            fieldMode={editorMode === 'adjust' ? 'adjust' : 'full'}
          />
          <AppButton label="Cancel" onPress={() => setEditorMode(null)} variant="ghost" surfaceTone="modal" />
        </ModalSurface>
      </Modal>
      <Modal visible={targetAssignmentIndex !== null && editorMode === null && foregroundQuickAdd} transparent animationType="fade" onRequestClose={closeForegroundPicker}>
        <ModalSurface
          title={`Saved Flies For ${targetAssignmentIndex !== null ? selectedAssignments[targetAssignmentIndex]?.position ?? 'Slot' : 'Slot'}`}
          subtitle="Pick from the current angler's saved flies for this slot."
        >
          {sortedSavedFlies.length ? (
            <ScrollView
              style={{
                maxHeight: 260,
                borderWidth: 1,
                borderColor: theme.colors.modalNestedBorder,
                borderRadius: theme.radius.md,
                backgroundColor: theme.colors.modalSurfaceAlt
              }}
            >
              {sortedSavedFlies.map((savedFly, index) => {
                const selected = selectedAssignments.some((assignment) => sameFly(assignment.fly, savedFly));
                return (
                  <Pressable
                    key={savedFly.id}
                    onPress={() => {
                      if (targetAssignmentIndex !== null) {
                        assignFlyAtIndex(targetAssignmentIndex, { ...savedFly });
                      }
                    }}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 12,
                      borderBottomWidth: index === sortedSavedFlies.length - 1 ? 0 : 1,
                      borderBottomColor: theme.colors.borderLight,
                      backgroundColor: selected ? theme.colors.chipSelectedBg : 'transparent'
                    }}
                  >
                    <Text style={{ color: primaryTextColor, fontWeight: '700' }}>{savedFly.name}</Text>
                    <Text style={{ color: secondaryTextColor, fontSize: 12 }}>
                      {savedFly.bugFamily} | {savedFly.bugStage} | #{savedFly.hookSize} | {savedFly.beadColor}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : (
            <View
              style={{
                gap: 8,
                borderRadius: theme.radius.md,
                padding: 12,
                backgroundColor: theme.colors.modalSurfaceAlt,
                borderWidth: 1,
                borderColor: theme.colors.modalNestedBorder
              }}
            >
              <Text style={{ color: theme.colors.modalText, fontWeight: '700' }}>No saved flies for this angler yet</Text>
              <Text style={{ color: theme.colors.modalTextSoft }}>
                This picker only shows the current angler&apos;s personal fly library.
              </Text>
            </View>
          )}
          <AppButton label="Cancel" onPress={closeForegroundPicker} variant="ghost" surfaceTone="modal" />
        </ModalSurface>
      </Modal>
    </SectionCard>
  );
};
