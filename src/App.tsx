import React, { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppStoreProvider } from './app/store';
import { HomeScreen } from './app/HomeScreen';
import { SessionScreen } from './app/SessionScreen';
import { ExperimentScreen } from './app/ExperimentScreen';
import { PracticeScreen } from './app/PracticeScreen';
import { CompetitionScreen } from './app/CompetitionScreen';
import { InsightsScreen } from './app/InsightsScreen';
import { HistoryScreen } from './app/HistoryScreen';
import { CoachScreen } from './app/CoachScreen';
import { SessionDetailScreen } from './app/SessionDetailScreen';
import { AccessScreen } from './app/AccessScreen';
import { ensureNotificationHandler } from './utils/sessionNotifications';
import { consumeAuthRedirect } from './services/authService';
import { ThemeProvider, useTheme } from './design/theme';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const { theme } = useTheme();

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerTintColor: theme.colors.headerTint,
          headerBackTitleVisible: false,
          headerStyle: { backgroundColor: theme.colors.surfaceLightAlt },
          headerTitleStyle: { color: theme.colors.textDark }
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Session" component={SessionScreen} />
        <Stack.Screen name="Experiment" component={ExperimentScreen} />
        <Stack.Screen name="Practice" component={PracticeScreen} />
        <Stack.Screen name="Competition" component={CompetitionScreen} />
        <Stack.Screen name="SessionDetail" component={SessionDetailScreen} options={{ title: 'Session' }} />
        <Stack.Screen name="Insights" component={InsightsScreen} />
        <Stack.Screen name="History" component={HistoryScreen} />
        <Stack.Screen name="Coach" component={CoachScreen} />
        <Stack.Screen name="Access" component={AccessScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default function App() {
  useEffect(() => {
    ensureNotificationHandler().catch(console.error);
  }, []);

  useEffect(() => {
    let mounted = true;

    const handleUrl = async (url: string | null) => {
      if (!url || !mounted) return;
      try {
        await consumeAuthRedirect(url);
      } catch (error) {
        console.error(error);
        const message = error instanceof Error ? error.message : 'Please request a fresh magic link and try again.';
        Alert.alert('Sign-in link could not be completed', message);
      }
    };

    Linking.getInitialURL()
      .then(handleUrl)
      .catch(console.error);

    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleUrl(url).catch(console.error);
    });

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return (
    <ThemeProvider>
      <AppStoreProvider>
        <AppNavigator />
      </AppStoreProvider>
    </ThemeProvider>
  );
}
