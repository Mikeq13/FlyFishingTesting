import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { CastCounter } from '@/components/CastCounter';
import { CatchCounter } from '@/components/CatchCounter';
import { FlySelector } from '@/components/FlySelector';
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
  const [flyEntries, setFlyEntries] = useState<ExperimentFlyEntry[]>(() => createEmptyExperimentEntries(2));
  const [castStep, setCastStep] = useState<5 | 10>(5);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setFlyEntries((current) => alignExperimentEntries(current, flyCount));
  }, [flyCount]);

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
    setFlyEntries(createEmptyExperimentEntries(2));
  };

  const save = async () => {
    if (isSaving) return;

    if (visibleEntries.length === 2) {
      const check = validateExperimentPair(visibleEntries[0].fly, visibleEntries[1].fly);
      if (!check.valid && check.warning) {
        Alert.alert('Design warning', check.warning);
        return;
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

      Alert.alert('Experiment saved', 'What do you want to do next?', [
        { text: 'Continue experimenting', onPress: resetForNextExperiment },
        { text: 'View this session', onPress: () => navigation.navigate('SessionDetail', { sessionId }) },
        { text: 'Go to insights', onPress: () => navigation.navigate('Insights') }
      ]);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: 'white' }}>Experiment</Text>
        <Text style={{ color: '#dbf5ff', fontWeight: '700' }}>Angler: {activeUser?.name ?? 'Loading...'}</Text>
        <TextInput value={hypothesis} onChangeText={setHypothesis} placeholder="Hypothesis" style={{ borderWidth: 1, padding: 10, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.95)' }} />

        <View style={{ gap: 8 }}>
          <Text style={{ color: 'white', fontWeight: '700' }}>Flies in this experiment</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {FLY_COUNT_OPTIONS.map((option) => (
              <Pressable
                key={option}
                onPress={() => setFlyCount(option)}
                style={{
                  flex: 1,
                  backgroundColor: flyCount === option ? '#2a9d8f' : '#6c757d',
                  padding: 10,
                  borderRadius: 8
                }}
              >
                <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>{option}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            onPress={() => setCastStep(5)}
            style={{ backgroundColor: castStep === 5 ? '#1d3557' : '#6c757d', padding: 10, borderRadius: 8, flex: 1 }}
          >
            <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Cast interval: 5</Text>
          </Pressable>
          <Pressable
            onPress={() => setCastStep(10)}
            style={{ backgroundColor: castStep === 10 ? '#1d3557' : '#6c757d', padding: 10, borderRadius: 8, flex: 1 }}
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

        <Pressable onPress={save} disabled={isSaving} style={{ backgroundColor: isSaving ? '#6c757d' : '#264653', padding: 12, borderRadius: 8 }}>
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>{isSaving ? 'Saving...' : 'Save Experiment'}</Text>
        </Pressable>
      </ScrollView>
    </ScreenBackground>
  );
};
