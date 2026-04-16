import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { FlySetup, SavedFly } from '@/types/fly';
import { FlySelector } from './FlySelector';
import { RigFlyAssignment, RigSetup } from '@/types/rig';
import { clearRigAssignmentFly, createEmptyFly, getRigPositionsForCount, replaceRigAssignmentFly, replaceRigAssignmentPosition, syncRigAssignments } from '@/utils/rigSetup';
import { OptionChips } from './OptionChips';

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
    <View style={{ gap: 10, borderWidth: 1, borderColor: 'rgba(202,240,248,0.16)', borderRadius: 18, padding: 14, backgroundColor: 'rgba(6, 27, 44, 0.70)' }}>
      <Text style={{ fontWeight: '800', fontSize: 18, color: '#f7fdff' }}>{title}</Text>
      {!!sortedSavedFlies.length ? (
        <>
          <Pressable onPress={() => setShowSavedFlyList((current) => !current)} style={{ backgroundColor: '#1d3557', padding: 12, borderRadius: 12 }}>
            <Text style={{ color: '#f7fdff', textAlign: 'center', fontWeight: '700' }}>
              {showSavedFlyList ? 'Hide Saved Flies' : 'Choose Saved Flies'}
            </Text>
          </Pressable>
          {showSavedFlyList ? (
            <ScrollView style={{ maxHeight: 180, borderWidth: 1, borderColor: 'rgba(202,240,248,0.18)', borderRadius: 12, backgroundColor: 'rgba(245,252,255,0.96)' }}>
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
                    <Text style={{ color: '#0b3d3a', fontWeight: '700' }}>{savedFly.name}</Text>
                    <Text style={{ color: '#4b5563', fontSize: 12 }}>
                      #{savedFly.hookSize} | {savedFly.beadColor} | {savedFly.beadSizeMm}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}
        </>
      ) : null}

      <Pressable onPress={() => setShowAddFly((current) => !current)} style={{ backgroundColor: '#264653', padding: 12, borderRadius: 12 }}>
        <Text style={{ color: '#f7fdff', textAlign: 'center', fontWeight: '700' }}>
          {showAddFly ? 'Hide Fly Builder' : 'Quick Add Fly'}
        </Text>
      </Pressable>

      {showAddFly ? (
        <FlySelector
          title="New Fly"
          value={draftFly}
          savedFlies={[]}
          onChange={setDraftFly}
          onSave={async () => {
            await onCreateFly(draftFly);
            if (targetAssignmentIndex !== null) {
              assignFlyAtIndex(targetAssignmentIndex, draftFly);
            }
            setShowAddFly(false);
            setDraftFly(createEmptyFly());
          }}
        />
      ) : null}

      <Text style={{ color: '#d7f3ff', fontWeight: '700' }}>Current Flies</Text>
      {!selectedAssignments.length ? (
        <Text style={{ color: '#bde6f6' }}>No flies selected for this rig yet.</Text>
      ) : (
        selectedAssignments.map((assignment, index) => (
          <View key={`${assignment.fly.name}-${index}`} style={{ gap: 8, borderRadius: 12, padding: 10, backgroundColor: 'rgba(255,255,255,0.08)' }}>
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
            <Pressable
              onPress={() => openChooserForIndex(index)}
              style={{ backgroundColor: '#264653', padding: 10, borderRadius: 10 }}
            >
              <Text style={{ color: '#f7fdff', textAlign: 'center', fontWeight: '700' }}>
                {assignment.fly.name.trim() ? 'Replace Fly' : 'Choose Fly'}
              </Text>
            </Pressable>
            {assignment.fly.name.trim() ? (
              <Pressable
                onPress={() => onChange(clearRigAssignmentFly(rigSetup, index))}
                style={{ backgroundColor: 'rgba(91,11,11,0.92)', padding: 10, borderRadius: 10 }}
              >
                <Text style={{ color: '#f7fdff', textAlign: 'center', fontWeight: '700' }}>Clear Fly</Text>
              </Pressable>
            ) : null}
            {targetAssignmentIndex === index ? (
              <Text style={{ color: '#bde6f6' }}>Choose a saved fly or quick-add one for this role.</Text>
            ) : null}
          </View>
        ))
      )}
    </View>
  );
};
