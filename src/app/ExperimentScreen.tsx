import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { CastCounter } from '@/components/CastCounter';
import { CatchCounter } from '@/components/CatchCounter';
import { FlySelector } from '@/components/FlySelector';
import { useAppStore } from './store';
import { FlySetup } from '@/types/fly';
import { validateExperimentPair } from '@/engine/rules';
import { catchRate } from '@/utils/calculations';
import { ScreenBackground } from '@/components/ScreenBackground';

const emptyFly: FlySetup = { name: '', intent: 'imitative', beadSizeMm: 0, bodyType: 'thread', collar: 'none' };

export const ExperimentScreen = ({ route, navigation }: any) => {
  const { addExperiment } = useAppStore();
  const sessionId: number = route.params.sessionId;
  const [hypothesis, setHypothesis] = useState('');
  const [controlFly, setControlFly] = useState<FlySetup>(emptyFly);
  const [variantFly, setVariantFly] = useState<FlySetup>({ ...emptyFly, intent: 'attractor' });
  const [controlCasts, setControlCasts] = useState(0);
  const [controlCatches, setControlCatches] = useState(0);
  const [variantCasts, setVariantCasts] = useState(0);
  const [variantCatches, setVariantCatches] = useState(0);
  const [castStep, setCastStep] = useState<5 | 10>(5);
  const [isSaving, setIsSaving] = useState(false);

  const resetForNextExperiment = () => {
    setHypothesis('');
    setControlCasts(0);
    setControlCatches(0);
    setVariantCasts(0);
    setVariantCatches(0);
  };

  const save = async () => {
    if (isSaving) return;

    const check = validateExperimentPair(controlFly, variantFly);
    if (!check.valid && check.warning) {
      Alert.alert('Design warning', check.warning);
      return;
    }

    if (controlCasts <= 0 || variantCasts <= 0) {
      Alert.alert('Missing cast data', 'Log casts for both control and variant before saving.');
      return;
    }

    if (controlCatches > controlCasts || variantCatches > variantCasts) {
      Alert.alert('Invalid catch count', 'Catches cannot be greater than casts.');
      return;
    }

    setIsSaving(true);

    try {
      const cRate = catchRate(controlCatches, controlCasts);
      const vRate = catchRate(variantCatches, variantCasts);
      const winner = cRate === vRate ? 'tie' : cRate > vRate ? 'control' : 'variant';

      await addExperiment({
        sessionId,
        hypothesis: hypothesis || 'No hypothesis provided',
        controlFly,
        variantFly,
        controlCasts,
        controlCatches,
        variantCasts,
        variantCatches,
        winner,
        confidenceScore: Math.min(1, (controlCasts + variantCasts) / 100)
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
        <TextInput value={hypothesis} onChangeText={setHypothesis} placeholder="Hypothesis" style={{ borderWidth: 1, padding: 10, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.95)' }} />

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

        <FlySelector title="Control" value={controlFly} onChange={setControlFly} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <CastCounter label="Control casts" value={controlCasts} step={castStep} onIncrement={() => setControlCasts((v) => v + castStep)} />
          <CatchCounter label="Control catches" value={controlCatches} onIncrement={() => setControlCatches((v) => v + 1)} />
        </View>
        <FlySelector title="Variant" value={variantFly} onChange={setVariantFly} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <CastCounter label="Variant casts" value={variantCasts} step={castStep} onIncrement={() => setVariantCasts((v) => v + castStep)} />
          <CatchCounter label="Variant catches" value={variantCatches} onIncrement={() => setVariantCatches((v) => v + 1)} />
        </View>
        <Pressable onPress={save} disabled={isSaving} style={{ backgroundColor: isSaving ? '#6c757d' : '#264653', padding: 12, borderRadius: 8 }}>
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>{isSaving ? 'Saving…' : 'Save Experiment'}</Text>
        </Pressable>
      </ScrollView>
    </ScreenBackground>
  );
};
