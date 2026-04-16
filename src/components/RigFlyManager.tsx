import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { FlySetup, SavedFly } from '@/types/fly';
import { FlySelector } from './FlySelector';
import { createEmptyFly } from '@/utils/rigSetup';

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
  selectedFlies: FlySetup[];
  savedFlies: SavedFly[];
  onChange: (nextFlies: FlySetup[]) => void;
  onCreateFly: (fly: FlySetup) => Promise<void>;
}

export const RigFlyManager = ({ title, selectedFlies, savedFlies, onChange, onCreateFly }: RigFlyManagerProps) => {
  const [showSavedFlyList, setShowSavedFlyList] = useState(false);
  const [showAddFly, setShowAddFly] = useState(false);
  const [draftFly, setDraftFly] = useState<FlySetup>(createEmptyFly());
  const sortedSavedFlies = useMemo(() => [...savedFlies].sort((a, b) => a.name.localeCompare(b.name)), [savedFlies]);

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
                const selected = selectedFlies.some((fly) => sameFly(fly, savedFly));
                return (
                  <Pressable
                    key={savedFly.id}
                    onPress={() =>
                      onChange(
                        selected
                          ? selectedFlies.filter((fly) => !sameFly(fly, savedFly))
                          : [...selectedFlies, { ...savedFly }]
                      )
                    }
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
            setShowAddFly(false);
            setDraftFly(createEmptyFly());
          }}
        />
      ) : null}

      <Text style={{ color: '#d7f3ff', fontWeight: '700' }}>Current Flies</Text>
      {!selectedFlies.length ? (
        <Text style={{ color: '#bde6f6' }}>No flies selected for this rig yet.</Text>
      ) : (
        selectedFlies.map((fly, index) => (
          <View key={`${fly.name}-${index}`} style={{ gap: 6, borderRadius: 12, padding: 10, backgroundColor: 'rgba(255,255,255,0.08)' }}>
            <Text style={{ color: '#f7fdff', fontWeight: '700' }}>
              {index === selectedFlies.length - 1 ? `${fly.name} (Point Fly)` : fly.name}
            </Text>
            <Text style={{ color: '#d7f3ff' }}>
              #{fly.hookSize} | {fly.beadColor} | {fly.beadSizeMm}
            </Text>
            <Pressable
              onPress={() => onChange(selectedFlies.filter((_, flyIndex) => flyIndex !== index))}
              style={{ backgroundColor: 'rgba(91,11,11,0.92)', padding: 10, borderRadius: 10 }}
            >
              <Text style={{ color: '#f7fdff', textAlign: 'center', fontWeight: '700' }}>Remove Fly</Text>
            </Pressable>
          </View>
        ))
      )}
    </View>
  );
};
