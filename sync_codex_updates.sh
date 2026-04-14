#!/usr/bin/env bash
set -euo pipefail

mkdir -p src/app src/components

cat > src/components/ScreenBackground.tsx <<'TS'
import React from 'react';
import { ImageBackground, SafeAreaView, StyleSheet, View } from 'react-native';

const bgUri = 'https://images.unsplash.com/photo-1475257026007-0753dbf4239f?auto=format&fit=crop&w=1600&q=80';

export const ScreenBackground = ({ children }: { children: React.ReactNode }) => (
  <ImageBackground source={{ uri: bgUri }} resizeMode="cover" style={styles.bg}>
    <View style={styles.overlay}>
      <SafeAreaView style={styles.container}>{children}</SafeAreaView>
    </View>
  </ImageBackground>
);

const styles = StyleSheet.create({
  bg: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(7, 28, 35, 0.72)' },
  container: { flex: 1 }
});
TS

cat > src/app/HomeScreen.tsx <<'TS'
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { ScreenBackground } from '@/components/ScreenBackground';

export const HomeScreen = ({ navigation }: any) => (
  <ScreenBackground>
    <View style={{ flex: 1, justifyContent: 'center', padding: 20, gap: 12 }}>
      <Text style={{ fontSize: 30, fontWeight: '800', color: 'white' }}>Fishing Lab</Text>
      <Text style={{ color: '#dbf5ff', marginBottom: 8 }}>A field notebook that learns how you fish.</Text>
      {[
        ['Start Session', 'Session'],
        ['View History', 'History'],
        ['View Insights', 'Insights'],
        ['Ask AI Coach', 'Coach']
      ].map(([label, route]) => (
        <Pressable key={route} onPress={() => navigation.navigate(route)} style={{ backgroundColor: 'rgba(38,84,124,0.92)', padding: 14, borderRadius: 10 }}>
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>{label}</Text>
        </Pressable>
      ))}
    </View>
  </ScreenBackground>
);
TS

cat > src/app/SessionScreen.tsx <<'TS'
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput } from 'react-native';
import { DepthSelector } from '@/components/DepthSelector';
import { useAppStore } from './store';
import { Confidence, DepthRange, InsectStage, InsectType, WaterType } from '@/types/session';
import { ScreenBackground } from '@/components/ScreenBackground';

export const SessionScreen = ({ navigation }: any) => {
  const { addSession } = useAppStore();
  const [waterType, setWaterType] = useState<WaterType>('run');
  const [depthRange, setDepthRange] = useState<DepthRange>('1-3 ft');
  const [insectType, setInsectType] = useState<InsectType>('mayfly');
  const [insectStage, setInsectStage] = useState<InsectStage>('emerger');
  const [insectConfidence, setInsectConfidence] = useState<Confidence>('medium');
  const [notes, setNotes] = useState('');

  const onStart = async () => {
    const id = await addSession({
      date: new Date().toISOString(),
      waterType,
      depthRange,
      insectType,
      insectStage,
      insectConfidence,
      notes
    });
    navigation.navigate('Experiment', { sessionId: id });
  };

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: 'white' }}>Active Session</Text>
        <TextInput value={waterType} onChangeText={(v) => setWaterType(v as WaterType)} placeholder="water type" style={{ borderWidth: 1, padding: 10, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.95)' }} />
        <DepthSelector value={depthRange} onChange={setDepthRange} />
        <TextInput value={insectType} onChangeText={(v) => setInsectType(v as InsectType)} placeholder="insect type" style={{ borderWidth: 1, padding: 10, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.95)' }} />
        <TextInput value={insectStage} onChangeText={(v) => setInsectStage(v as InsectStage)} placeholder="insect stage" style={{ borderWidth: 1, padding: 10, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.95)' }} />
        <TextInput value={insectConfidence} onChangeText={(v) => setInsectConfidence(v as Confidence)} placeholder="confidence" style={{ borderWidth: 1, padding: 10, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.95)' }} />
        <TextInput value={notes} onChangeText={setNotes} placeholder="notes" multiline style={{ borderWidth: 1, padding: 10, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.95)' }} />
        <Pressable onPress={onStart} style={{ backgroundColor: '#2a9d8f', padding: 12, borderRadius: 8 }}>
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Start Experiment</Text>
        </Pressable>
      </ScrollView>
    </ScreenBackground>
  );
};
TS
cat > src/app/SessionScreen.tsx <<'TS'
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput } from 'react-native';
import { DepthSelector } from '@/components/DepthSelector';
import { useAppStore } from './store';
import { Confidence, DepthRange, InsectStage, InsectType, WaterType } from '@/types/session';
import { ScreenBackground } from '@/components/ScreenBackground';

export const SessionScreen = ({ navigation }: any) => {
  const { addSession } = useAppStore();
  const [waterType, setWaterType] = useState<WaterType>('run');
  const [depthRange, setDepthRange] = useState<DepthRange>('1-3 ft');
  const [insectType, setInsectType] = useState<InsectType>('mayfly');
  const [insectStage, setInsectStage] = useState<InsectStage>('emerger');
  const [insectConfidence, setInsectConfidence] = useState<Confidence>('medium');
  const [notes, setNotes] = useState('');

  const onStart = async () => {
    const id = await addSession({
      date: new Date().toISOString(),
      waterType,
      depthRange,
      insectType,
      insectStage,
      insectConfidence,
      notes
    });
    navigation.navigate('Experiment', { sessionId: id });
  };

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: 'white' }}>Active Session</Text>
        <TextInput value={waterType} onChangeText={(v) => setWaterType(v as WaterType)} placeholder="water type" style={{ borderWidth: 1, padding: 10, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.95)' }} />
        <DepthSelector value={depthRange} onChange={setDepthRange} />
        <TextInput value={insectType} onChangeText={(v) => setInsectType(v as InsectType)} placeholder="insect type" style={{ borderWidth: 1, padding: 10, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.95)' }} />
        <TextInput value={insectStage} onChangeText={(v) => setInsectStage(v as InsectStage)} placeholder="insect stage" style={{ borderWidth: 1, padding: 10, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.95)' }} />
        <TextInput value={insectConfidence} onChangeText={(v) => setInsectConfidence(v as Confidence)} placeholder="confidence" style={{ borderWidth: 1, padding: 10, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.95)' }} />
        <TextInput value={notes} onChangeText={setNotes} placeholder="notes" multiline style={{ borderWidth: 1, padding: 10, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.95)' }} />
        <Pressable onPress={onStart} style={{ backgroundColor: '#2a9d8f', padding: 12, borderRadius: 8 }}>
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Start Experiment</Text>
        </Pressable>
      </ScrollView>
    </ScreenBackground>
  );
};
TS

cat > src/app/ExperimentScreen.tsx <<'TS'
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

  const save = async () => {
    const check = validateExperimentPair(controlFly, variantFly);
    if (!check.valid && check.warning) {
      Alert.alert('Design warning', check.warning);
      return;
    }

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

    navigation.navigate('SessionDetail', { sessionId });
  };

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: 'white' }}>Experiment</Text>
        <TextInput value={hypothesis} onChangeText={setHypothesis} placeholder="Hypothesis" style={{ borderWidth: 1, padding: 10, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.95)' }} />
        <FlySelector title="Control" value={controlFly} onChange={setControlFly} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <CastCounter label="Control casts" value={controlCasts} onIncrement={() => setControlCasts((v) => v + 1)} />
          <CatchCounter label="Control catches" value={controlCatches} onIncrement={() => setControlCatches((v) => v + 1)} />
        </View>
        <FlySelector title="Variant" value={variantFly} onChange={setVariantFly} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <CastCounter label="Variant casts" value={variantCasts} onIncrement={() => setVariantCasts((v) => v + 1)} />
          <CatchCounter label="Variant catches" value={variantCatches} onIncrement={() => setVariantCatches((v) => v + 1)} />
        </View>
        <Pressable onPress={save} style={{ backgroundColor: '#264653', padding: 12, borderRadius: 8 }}>
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Save Experiment</Text>
        </Pressable>
      </ScrollView>
    </ScreenBackground>
  );
};
TS

cat > src/app/SessionDetailScreen.tsx <<'TS'
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useAppStore } from './store';
import { ScreenBackground } from '@/components/ScreenBackground';
import { catchRate } from '@/utils/calculations';

export const SessionDetailScreen = ({ route, navigation }: any) => {
  const { sessions, experiments } = useAppStore();
  const sessionId = route?.params?.sessionId as number;

  const session = sessions.find((s) => s.id === sessionId);
  const sessionExperiments = experiments.filter((e) => e.sessionId === sessionId);

  const totalCasts = sessionExperiments.reduce((sum, e) => sum + e.controlCasts + e.variantCasts, 0);
  const totalCatches = sessionExperiments.reduce((sum, e) => sum + e.controlCatches + e.variantCatches, 0);

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
        <Text style={{ fontSize: 24, color: 'white', fontWeight: '700' }}>Session Continuity</Text>
        {session ? (
          <View style={{ backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 10, padding: 12, gap: 4 }}>
            <Text>Date: {new Date(session.date).toLocaleString()}</Text>
            <Text>Water: {session.waterType}</Text>
            <Text>Depth: {session.depthRange}</Text>
            <Text>Catch rate: {(catchRate(totalCatches, totalCasts) * 100).toFixed(1)}%</Text>
          </View>
        ) : (
          <Text style={{ color: 'white' }}>Session not found.</Text>
        )}

        <Text style={{ color: 'white', fontWeight: '700' }}>Experiments in this session: {sessionExperiments.length}</Text>
        {sessionExperiments.map((e) => (
          <View key={e.id} style={{ backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 10, padding: 12 }}>
            <Text style={{ fontWeight: '700' }}>#{e.id} Winner: {e.winner}</Text>
            <Text>Hypothesis: {e.hypothesis}</Text>
            <Text>Control {e.controlFly.name || 'Unnamed'}: {e.controlCatches}/{e.controlCasts}</Text>
            <Text>Variant {e.variantFly.name || 'Unnamed'}: {e.variantCatches}/{e.variantCasts}</Text>
          </View>
        ))}

        <Pressable onPress={() => navigation.navigate('Experiment', { sessionId })} style={{ backgroundColor: '#2a9d8f', borderRadius: 8, padding: 12 }}>
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Add Another Experiment</Text>
        </Pressable>
        <Pressable onPress={() => navigation.navigate('Insights')} style={{ backgroundColor: '#1d3557', borderRadius: 8, padding: 12 }}>
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>View Insights</Text>
        </Pressable>
        <Pressable onPress={() => navigation.navigate('Home')} style={{ backgroundColor: '#264653', borderRadius: 8, padding: 12 }}>
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Back Home</Text>
        </Pressable>
      </ScrollView>
    </ScreenBackground>
  );
};
TS

cat > src/App.tsx <<'TS'
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppStoreProvider } from './app/store';
import { HomeScreen } from './app/HomeScreen';
import { SessionScreen } from './app/SessionScreen';
import { ExperimentScreen } from './app/ExperimentScreen';
import { InsightsScreen } from './app/InsightsScreen';
import { HistoryScreen } from './app/HistoryScreen';
import { CoachScreen } from './app/CoachScreen';
import { SessionDetailScreen } from './app/SessionDetailScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <AppStoreProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Home" screenOptions={{ headerTintColor: '#0b1f2a', headerBackTitleVisible: false }}>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Session" component={SessionScreen} />
          <Stack.Screen name="Experiment" component={ExperimentScreen} />
          <Stack.Screen name="SessionDetail" component={SessionDetailScreen} options={{ title: 'Session' }} />
          <Stack.Screen name="Insights" component={InsightsScreen} />
          <Stack.Screen name="History" component={HistoryScreen} />
          <Stack.Screen name="Coach" component={CoachScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </AppStoreProvider>
  );
}
TS

echo "Codex updates synced locally."
