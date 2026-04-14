import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { CastCounter } from '@/components/CastCounter';
import { CatchCounter } from '@/components/CatchCounter';
import { FlySelector } from '@/components/FlySelector';
import { KeyboardDismissView } from '@/components/KeyboardDismissView';
import { useAppStore } from './store';
import { FlySetup } from '@/types/fly';
import { validateExperimentPair } from '@/engine/rules';
import { deriveExperimentStatus } from '@/engine/experimentStatus';
import { ScreenBackground } from '@/components/ScreenBackground';
import { ExperimentFlyEntry } from '@/types/experiment';
import { alignExperimentEntries, createEmptyExperimentEntries, getLegacyExperimentFields } from '@/utils/experimentEntries';

const FLY_COUNT_OPTIONS = [1, 2, 3] as const;

export const ExperimentScreen = ({ route, navigation }: any) => {
  const { addExperiment, addSavedFly, savedFlies, users, activeUserId } = useAppStore();
  const activeUser = users.find((user) => user.id === activeUserId);
  const sessionId: number = route.params.sessionId;
  const [hypothesis, setHypothesis] = useState('');
  const [flyCount, setFlyCount] = useState<1 | 2 | 3>(2);
  const [baselineIndex, setBaselineIndex] = useState(0);
  const [flyEntries, setFlyEntries] = useState<ExperimentFlyEntry[]>(() => createEmptyExperimentEntries(2, 0));
  const [castStep, setCastStep] = useState<5 | 10>(5);
  const [isSaving, setIsSaving] = useState(false);
  const [showSavedExperimentActions, setShowSavedExperimentActions] = useState(false);

  useEffect(() => {
    setFlyEntries((current) => alignExperimentEntries(current, flyCount, baselineIndex));
  }, [baselineIndex, flyCount]);

  const visibleEntries = useMemo(() => flyEntries.slice(0, flyCount), [flyCount, flyEntries]);

  const updateEntry = (index: number, nextEntry: ExperimentFlyEntry) => {
    setFlyEntries((current) => current.map((entry, entryIndex) => (entryIndex === index ? nextEntry : entry)));
  };

  const saveFlyToLibrary = async (fly: FlySetup) => {
    const normalizedName = fly.name.trim();

    if (!normalizedName) {
      Alert.alert('Fly name needed', 'Give the fly a name before saving it to the library.');
      return;
    }

    if (savedFlies.some((savedFly) => savedFly.name.trim().toLowerCase() === normalizedName.toLowerCase())) {
      Alert.alert('Fly already saved', 'That fly name already exists in your library.');
      return;
    }

    await addSavedFly({ ...fly, name: normalizedName });
    Alert.alert('Fly saved', `${normalizedName} is now available for future experiments.`);
  };

  const resetForNextExperiment = () => {
    setHypothesis('');
    setFlyCount(2);
    setBaselineIndex(0);
    setFlyEntries(createEmptyExperimentEntries(2, 0));
    setShowSavedExperimentActions(false);
  };

  const modifyAndContinue = () => {
    setFlyEntries((current) =>
      current.map((entry) => ({
        ...entry,
        casts: 0,
        catches: 0
      }))
    );
    setShowSavedExperimentActions(false);
  };

  const save = async () => {
    if (isSaving) return;

    if (visibleEntries.length > 1) {
      const baselineEntry = visibleEntries[baselineIndex];
      const comparisonNote = visibleEntries
        .filter((_, index) => index !== baselineIndex)
        .map((entry) => ({ entry, check: validateExperimentPair(baselineEntry.fly, entry.fly) }))
        .find(({ check }) => !!check.warning);

      if (comparisonNote?.check.warning) {
        console.warn(`Design note for ${comparisonNote.entry.label}: ${comparisonNote.check.warning}`);
      }
    }

    if (visibleEntries.some((entry) => entry.casts <= 0)) {
      Alert.alert('Missing cast data', 'Log casts for every selected fly before saving.');
      return;
    }

    if (visibleEntries.some((entry) => entry.catches > entry.casts)) {
      Alert.alert('Invalid catch count', 'Catches cannot be greater than casts.');
      return;
    }

    setIsSaving(true);

    try {
      const status = deriveExperimentStatus(visibleEntries);
      const legacy = getLegacyExperimentFields(visibleEntries);

      await addExperiment({
        sessionId,
        hypothesis: hypothesis || 'No hypothesis provided',
        flyEntries: visibleEntries,
        ...legacy,
        winner: status.winner,
        outcome: status.outcome,
        confidenceScore: status.confidenceScore
      });
      setShowSavedExperimentActions(true);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScreenBackground>
      <KeyboardDismissView>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 28, fontWeight: '800', color: '#f7fdff' }}>Experiment</Text>
          <Text style={{ color: '#d7f3ff', lineHeight: 20 }}>
            Set your baseline, choose the flies in play, and record cast and catch data cleanly.
          </Text>
          <Text style={{ color: '#dbf5ff', fontWeight: '700' }}>Angler: {activeUser?.name ?? 'Loading...'}</Text>
        </View>
        <TextInput value={hypothesis} onChangeText={setHypothesis} placeholder="Hypothesis" placeholderTextColor="#5a6c78" style={{ borderWidth: 1, borderColor: 'rgba(202,240,248,0.18)', padding: 12, borderRadius: 12, backgroundColor: 'rgba(245,252,255,0.96)', color: '#102a43' }} />

        <View style={{ gap: 8, backgroundColor: 'rgba(6, 27, 44, 0.70)', padding: 14, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(202,240,248,0.16)' }}>
          <Text style={{ color: '#d7f3ff', fontWeight: '700', fontSize: 16 }}>Flies in this experiment</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {FLY_COUNT_OPTIONS.map((option) => (
              <Pressable
                key={option}
                onPress={() => setFlyCount(option)}
                style={{
                  flex: 1,
                  backgroundColor: flyCount === option ? '#2a9d8f' : 'rgba(255,255,255,0.14)',
                  padding: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: flyCount === option ? 'rgba(255,255,255,0.24)' : 'rgba(202,240,248,0.12)'
                }}
              >
                <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>{option}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {flyCount > 1 && (
          <View style={{ gap: 8, backgroundColor: 'rgba(6, 27, 44, 0.70)', padding: 14, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(202,240,248,0.16)' }}>
            <Text style={{ color: '#d7f3ff', fontWeight: '700', fontSize: 16 }}>Choose Baseline</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {visibleEntries.map((entry, index) => (
                <Pressable
                  key={`baseline-${entry.slotId}`}
                  onPress={() => setBaselineIndex(index)}
                  style={{
                    flex: 1,
                    backgroundColor: baselineIndex === index ? '#2a9d8f' : 'rgba(255,255,255,0.14)',
                    padding: 12,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: baselineIndex === index ? 'rgba(255,255,255,0.24)' : 'rgba(202,240,248,0.12)'
                  }}
                >
                  <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>
                    {entry.fly.name.trim() || `Fly ${index + 1}`}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            onPress={() => setCastStep(5)}
            style={{ backgroundColor: castStep === 5 ? '#1d3557' : 'rgba(255,255,255,0.14)', padding: 12, borderRadius: 12, flex: 1, borderWidth: 1, borderColor: 'rgba(202,240,248,0.12)' }}
          >
            <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Cast interval: 5</Text>
          </Pressable>
          <Pressable
            onPress={() => setCastStep(10)}
            style={{ backgroundColor: castStep === 10 ? '#1d3557' : 'rgba(255,255,255,0.14)', padding: 12, borderRadius: 12, flex: 1, borderWidth: 1, borderColor: 'rgba(202,240,248,0.12)' }}
          >
            <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Cast interval: 10</Text>
          </Pressable>
        </View>

        {visibleEntries.map((entry, index) => (
          <View key={entry.slotId} style={{ gap: 8 }}>
            <FlySelector
              title={entry.label}
              value={entry.fly}
              savedFlies={savedFlies}
              onChange={(fly) => updateEntry(index, { ...entry, fly })}
              onSave={() => saveFlyToLibrary(entry.fly)}
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <CastCounter
                label={`${entry.label} casts`}
                value={entry.casts}
                step={castStep}
                onIncrement={() => updateEntry(index, { ...entry, casts: entry.casts + castStep })}
              />
              <CatchCounter
                label={`${entry.label} catches`}
                value={entry.catches}
                onIncrement={() => updateEntry(index, { ...entry, catches: entry.catches + 1 })}
              />
            </View>
          </View>
        ))}

        <Pressable onPress={save} disabled={isSaving} style={{ backgroundColor: isSaving ? '#6c757d' : '#264653', padding: 14, borderRadius: 14 }}>
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>{isSaving ? 'Saving...' : 'Save Experiment'}</Text>
        </Pressable>

        {showSavedExperimentActions && (
          <View style={{ gap: 8, borderWidth: 1, borderColor: 'rgba(202,240,248,0.18)', borderRadius: 18, padding: 14, backgroundColor: 'rgba(245,252,255,0.96)' }}>
            <Text style={{ fontWeight: '800', fontSize: 18, color: '#102a43' }}>Experiment saved</Text>
            <Text style={{ color: '#334e68' }}>What do you want to do next?</Text>
            <Pressable onPress={modifyAndContinue} style={{ backgroundColor: '#2a9d8f', padding: 12, borderRadius: 12 }}>
              <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Modify and continue</Text>
            </Pressable>
            <Pressable onPress={resetForNextExperiment} style={{ backgroundColor: '#264653', padding: 12, borderRadius: 12 }}>
              <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Start fresh</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setShowSavedExperimentActions(false);
                navigation.navigate('SessionDetail', { sessionId });
              }}
              style={{ backgroundColor: '#1d3557', padding: 12, borderRadius: 12 }}
            >
              <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>View this session</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setShowSavedExperimentActions(false);
                navigation.navigate('Insights');
              }}
              style={{ backgroundColor: '#6c757d', padding: 12, borderRadius: 12 }}
            >
              <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Go to insights</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
      </KeyboardDismissView>
    </ScreenBackground>
  );
};
