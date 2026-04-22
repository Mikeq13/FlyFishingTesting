import React, { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { Alert, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppStoreProvider } from './app/store';
import { HomeScreen } from './app/HomeScreen';
import { AuthScreen } from './app/AuthScreen';
import { SessionScreen } from './app/SessionScreen';
import { ExperimentScreen } from './app/ExperimentScreen';
import { PracticeScreen } from './app/PracticeScreen';
import { CompetitionScreen } from './app/CompetitionScreen';
import { InsightsScreen } from './app/InsightsScreen';
import { HistoryScreen } from './app/HistoryScreen';
import { CoachScreen } from './app/CoachScreen';
import { SessionDetailScreen } from './app/SessionDetailScreen';
import { PracticeReviewScreen } from './app/PracticeReviewScreen';
import { AccessScreen } from './app/AccessScreen';
import { useAppStore } from './app/store';
import { ensureNotificationHandler } from './utils/sessionNotifications';
import { consumeAuthRedirect } from './services/authService';
import { ThemeProvider, useTheme } from './design/theme';

const Stack = createNativeStackNavigator();

const AuthLoadingScreen = () => (
  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
    <Text style={{ fontSize: 16, fontWeight: '600' }}>Loading your account…</Text>
  </View>
);

const AppNavigator = () => {
  const { theme } = useTheme();
  const { authReady, localBootstrapReady, remoteSession, currentUser, remoteBootstrapState, isWebDemoMode } = useAppStore();
  const canEnterApp = Boolean((remoteSession && currentUser) || (isWebDemoMode && currentUser));

  if (
    !authReady ||
    !localBootstrapReady ||
    remoteBootstrapState === 'resolving_local' ||
    (remoteSession && !currentUser && remoteBootstrapState !== 'degraded')
  ) {
    return (
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.colors.surface }
          }}
        >
          <Stack.Screen name="AuthLoading" component={AuthLoadingScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={canEnterApp ? 'Home' : 'Auth'}
        screenOptions={{
          headerTintColor: theme.colors.headerTint,
          headerBackTitleVisible: false,
          headerStyle: { backgroundColor: theme.colors.surfaceLightAlt },
          headerTitleStyle: { color: theme.colors.textDark }
        }}
      >
        {!canEnterApp ? (
          <Stack.Screen name="Auth" component={AuthScreen} options={{ headerShown: false }} />
        ) : (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Session" component={SessionScreen} />
            <Stack.Screen name="Experiment" component={ExperimentScreen} />
            <Stack.Screen name="Practice" component={PracticeScreen} />
            <Stack.Screen name="Competition" component={CompetitionScreen} />
            <Stack.Screen name="SessionDetail" component={SessionDetailScreen} options={{ title: 'Session' }} />
            <Stack.Screen name="PracticeReview" component={PracticeReviewScreen} options={{ title: 'Practice Review' }} />
            <Stack.Screen name="Insights" component={InsightsScreen} />
            <Stack.Screen name="History" component={HistoryScreen} />
            <Stack.Screen name="Coach" component={CoachScreen} />
            <Stack.Screen name="Access" component={AccessScreen} />
          </>
        )}
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
