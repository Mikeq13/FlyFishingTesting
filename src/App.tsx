import React, { useEffect, useRef, useState } from 'react';
import * as Linking from 'expo-linking';
import { Alert, AppState, Text, View } from 'react-native';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
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
import {
  ensureNotificationHandler,
  getNavigationTargetFromNotificationData,
  scheduleImmediateNotification
} from './utils/sessionNotifications';
import { consumeAuthRedirect } from './services/authService';
import { ThemeProvider, useTheme } from './design/theme';
import { buildActiveOutingNavigationTarget, parseHandsFreeUrlCommand, parsePendingHandsFreeCommand } from './utils/handsFree';
import { consumePendingHandsFreeNativeCommand } from './services/handsFreeNative';
import { executeHandsFreeCommand } from './utils/handsFreeActions';
import { StatusBanner } from './components/ui/StatusBanner';

const Stack = createNativeStackNavigator();

const AuthLoadingScreen = () => (
  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
    <Text style={{ fontSize: 16, fontWeight: '600' }}>Loading your account…</Text>
  </View>
);

const AppNavigator = ({ navigationRef }: { navigationRef: ReturnType<typeof useNavigationContainerRef> }) => {
  const { theme } = useTheme();
  const [handsFreeBanner, setHandsFreeBanner] = useState<{ tone: 'success' | 'warning'; text: string } | null>(null);
  const bannerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appStateRef = useRef(AppState.currentState);
  const {
    authReady,
    localBootstrapReady,
    remoteSession,
    currentUser,
    remoteBootstrapState,
    isWebDemoMode,
    activeOuting,
    dictationEnabled,
    confirmationNotificationsEnabled,
    resumeFromNotificationsEnabled,
    sessions,
    sessionSegments,
    experiments,
    addCatchEvent,
    addSessionSegment,
    updateSessionEntry,
    updateSessionSegmentEntry,
    updateExperimentEntry
  } = useAppStore();
  const canEnterApp = Boolean((remoteSession && currentUser) || (isWebDemoMode && currentUser));

  useEffect(() => {
    ensureNotificationHandler().catch(console.error);
  }, []);

  useEffect(() => {
    if (!handsFreeBanner) return;
    if (bannerTimeoutRef.current) {
      clearTimeout(bannerTimeoutRef.current);
    }
    bannerTimeoutRef.current = setTimeout(() => {
      setHandsFreeBanner(null);
      bannerTimeoutRef.current = null;
    }, 3200);

    return () => {
      if (bannerTimeoutRef.current) {
        clearTimeout(bannerTimeoutRef.current);
        bannerTimeoutRef.current = null;
      }
    };
  }, [handsFreeBanner]);

  useEffect(() => {
    let mounted = true;

    const handleAuthUrl = async (url: string) => {
      try {
        await consumeAuthRedirect(url);
      } catch (error) {
        console.error(error);
        const message = error instanceof Error ? error.message : 'Please request a fresh magic link and try again.';
        Alert.alert('Sign-in link could not be completed', message);
      }
    };

    const drainPendingNativeCommands = async () => {
      while (mounted) {
        const nextCommand = await consumePendingHandsFreeNativeCommand();
        if (!nextCommand) break;
        await runHandsFreeCommand(nextCommand);
      }
    };

    const runHandsFreeCommand = async (rawCommand: string | null) => {
      if (!rawCommand || !mounted || !currentUser) return;
      const command = parsePendingHandsFreeCommand(rawCommand);
      if (!command) return;
      const result = await executeHandsFreeCommand(command, {
        activeOuting,
        dictationEnabled,
        sessions,
        sessionSegments,
        experiments,
        addCatchEvent,
        addSessionSegment,
        updateSessionEntry,
        updateSessionSegmentEntry,
        updateExperimentEntry
      });

      if (result.ok) {
        if (appStateRef.current === 'active') {
          setHandsFreeBanner({ tone: 'success', text: result.message });
        } else if (confirmationNotificationsEnabled) {
          await scheduleImmediateNotification({
            title: result.successTitle ?? 'Fishing Lab',
            body: result.message,
            data: activeOuting
              ? {
                  sessionId: activeOuting.sessionId,
                  experimentId: activeOuting.experimentId ?? undefined,
                  targetRoute: activeOuting.targetRoute
                }
              : undefined
          });
        }
      } else if (!result.ok) {
        setHandsFreeBanner({ tone: 'warning', text: result.message });
        Alert.alert('Hands-free action unavailable', result.message);
      }

      if (result.navigateToOuting && activeOuting) {
        const target = buildActiveOutingNavigationTarget(activeOuting);
        if (navigationRef.isReady()) {
          (navigationRef as any).navigate(target.route, target.params);
        }
      } else if (result.ok && activeOuting) {
        const target = buildActiveOutingNavigationTarget(activeOuting);
        if (navigationRef.isReady()) {
          (navigationRef as any).navigate(target.route, target.params);
        }
      }
    };

    const handleUrl = async (url: string | null) => {
      if (!url || !mounted) return;
      const handsFreeCommand = parseHandsFreeUrlCommand(url);
      if (handsFreeCommand) {
        await runHandsFreeCommand(JSON.stringify(handsFreeCommand));
        return;
      }
      await handleAuthUrl(url);
    };

    Linking.getInitialURL()
      .then(handleUrl)
      .catch(console.error);

    drainPendingNativeCommands()
      .catch(console.error);

    const linkSubscription = Linking.addEventListener('url', ({ url }) => {
      handleUrl(url).catch(console.error);
    });

    const appStateSubscription = AppState.addEventListener('change', (state) => {
      appStateRef.current = state;
      if (state !== 'active') return;
      drainPendingNativeCommands()
        .catch(console.error);
    });

    let notificationSubscription: { remove: () => void } | null = null;
    import('expo-notifications')
      .then((Notifications) => {
        if (!mounted) return;
        notificationSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
          if (!resumeFromNotificationsEnabled) return;
          const data = response.notification.request.content.data as Record<string, unknown> | undefined;
          const target = getNavigationTargetFromNotificationData(data);
          if (target) {
            if (navigationRef.isReady()) {
              (navigationRef as any).navigate(target.route, target.params);
            }
          }
        });
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
      linkSubscription.remove();
      appStateSubscription.remove();
      notificationSubscription?.remove();
    };
  }, [
    activeOuting,
    addCatchEvent,
    addSessionSegment,
    confirmationNotificationsEnabled,
    currentUser,
    dictationEnabled,
    experiments,
    navigationRef,
    remoteSession,
    resumeFromNotificationsEnabled,
    sessionSegments,
    sessions,
    updateExperimentEntry,
    updateSessionEntry,
    updateSessionSegmentEntry
  ]);

  if (
    !authReady ||
    !localBootstrapReady ||
    remoteBootstrapState === 'resolving_local' ||
    (remoteSession && !currentUser && remoteBootstrapState !== 'degraded')
  ) {
    return (
      <NavigationContainer ref={navigationRef}>
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
    <View style={{ flex: 1 }}>
      <NavigationContainer ref={navigationRef}>
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
      {handsFreeBanner ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            right: 12
          }}
        >
          <StatusBanner tone={handsFreeBanner.tone} text={handsFreeBanner.text} />
        </View>
      ) : null}
    </View>
  );
};

export default function App() {
  const navigationRef = useNavigationContainerRef();

  return (
    <ThemeProvider>
      <AppStoreProvider>
        <AppNavigator navigationRef={navigationRef} />
      </AppStoreProvider>
    </ThemeProvider>
  );
}
