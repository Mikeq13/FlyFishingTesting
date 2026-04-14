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
