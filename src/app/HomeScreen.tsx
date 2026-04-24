import React from 'react';
import { Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { KeyboardDismissView } from '@/components/KeyboardDismissView';
import { ScreenBackground } from '@/components/ScreenBackground';
import { AppButton } from '@/components/ui/AppButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { useTheme } from '@/design/theme';
import { useAppStore } from './store';
import { SessionMode } from '@/types/session';
import { useResponsiveLayout } from '@/design/layout';
import { buildActiveOutingLabel, buildActiveOutingNavigationTarget, HANDS_FREE_EXAMPLES } from '@/utils/handsFree';

const SESSION_MODE_OPTIONS: Array<{
  mode: SessionMode;
  title: string;
  description: string;
}> = [
  {
    mode: 'experiment',
    title: 'Experiment Journal',
    description: 'Run baseline and test fly experiments with deeper controls, hypotheses, and research-style logging.'
  },
  {
    mode: 'practice',
    title: 'Practice Session',
    description: 'Keep it lightweight for a practice day and get ready for quicker catch logging built around saved flies.'
  },
  {
    mode: 'competition',
    title: 'Competition',
    description: 'Use a comp-focused session flow today, with the data model ready for future shared intel and teammate comparison.'
  }
];

export const HomeScreen = ({ navigation }: any) => {
  const {
    currentHasPremiumAccess,
    currentUser,
    remoteSession,
    sessions,
    sessionSegments,
    catchEvents,
    experiments,
    insights,
    topFlyInsights,
    isWebDemoMode,
    activeOuting,
    autoResumePromptEnabled,
    sharedDataStatus,
    syncStatus
  } = useAppStore();
  const { theme } = useTheme();
  const layout = useResponsiveLayout();
  const isDaylightTheme = theme.id === 'daylight_light';
  const [showSessionChooser, setShowSessionChooser] = React.useState(false);
  const shouldCenterContent = Platform.OS !== 'web' && !layout.isCompactLayout;
  const latestInsight = React.useMemo(
    () => [...topFlyInsights, ...insights].find((insight) => insight.confidence !== 'low') ?? topFlyInsights[0] ?? insights[0] ?? null,
    [insights, topFlyInsights]
  );
  const completedSessions = React.useMemo(() => sessions.filter((session) => !!session.endedAt).length, [sessions]);
  const activeOutingTarget = activeOuting ? buildActiveOutingNavigationTarget(activeOuting) : null;
  const journalHealthItems = [
    { label: 'Outings', value: sessions.length },
    { label: 'Segments', value: sessionSegments.length },
    { label: 'Fish', value: catchEvents.length },
    { label: 'Tests', value: experiments.filter((experiment) => experiment.status === 'complete').length }
  ];
  const demoPracticeSession = React.useMemo(
    () =>
      sessions.find((session) => session.mode === 'practice' && !!session.endedAt) ??
      sessions.find((session) => session.mode === 'practice') ??
      null,
    [sessions]
  );
  const contentContainerStyle = layout.buildScrollContentStyle({
    centered: shouldCenterContent,
    gap: 14,
    bottomPadding: 40
  });

  const beginSession = (mode: SessionMode) => {
    setShowSessionChooser(false);
    navigation.navigate('Session', { mode });
  };

  return (
    <ScreenBackground>
      <KeyboardDismissView>
      <ScrollView style={{ flex: 1, minHeight: 0 }} contentContainerStyle={contentContainerStyle} keyboardShouldPersistTaps="handled">
        <ScreenHeader
          title="Fishing Lab"
          subtitle="A fly fishing journal that turns logged outings into clearer patterns, better setup decisions, and grounded AI guidance."
          eyebrow="On The Water"
        />
        {isWebDemoMode ? (
          <SectionCard>
            <Text style={{ color: theme.colors.textMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>
              Web Demo Mode
            </Text>
            <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 24 }}>
              Fly fishing journal with a guided demo path
            </Text>
            <Text style={{ color: theme.colors.textSoft, lineHeight: 20 }}>
              Review a logged outing, see the strongest journal patterns, and ask the AI coach what the data suggests you fish next.
            </Text>
            <View style={{ gap: 10 }}>
              {demoPracticeSession ? (
                <AppButton
                  label="Review a Logged Session"
                  onPress={() => navigation.navigate('PracticeReview', { sessionId: demoPracticeSession.id })}
                  variant="secondary"
                />
              ) : null}
              <AppButton label="See Journal Insights" onPress={() => navigation.navigate('Insights')} variant="secondary" />
              <AppButton label="Ask AI Coach" onPress={() => navigation.navigate('Coach')} variant="secondary" />
            </View>
            <View style={{ gap: 4 }}>
              <Text style={{ color: theme.colors.text, fontWeight: '700' }}>What this demonstrates</Text>
              <Text style={{ color: theme.colors.textSoft, lineHeight: 20 }}>
                Logged session review, exact setup intelligence, and AI coaching grounded in water changes, catches, and experiment outcomes.
              </Text>
            </View>
          </SectionCard>
        ) : null}
        <SectionCard>
          <Text style={{ color: theme.colors.textMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>
            {isWebDemoMode ? 'Demo Identity' : 'Active Account'}
          </Text>
          <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 24 }}>{currentUser?.name ?? 'Loading...'}</Text>
          <Text style={{ color: theme.colors.textSoft }}>
            {isWebDemoMode ? 'Seeded demo journal with local-only data and premium AI guidance unlocked.' : `Signed in as: ${remoteSession?.email ?? 'No account linked'}`}
          </Text>
        </SectionCard>
        <SectionCard
          title={activeOuting && autoResumePromptEnabled ? 'Current Outing' : 'Field Cockpit'}
          subtitle={
            activeOuting && autoResumePromptEnabled
              ? 'Jump back into the live session without digging through old records.'
              : 'Start a clean journal flow before the first cast, then let the app remember the details.'
          }
        >
          {activeOuting && autoResumePromptEnabled ? (
            <>
              <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 18 }}>{buildActiveOutingLabel(activeOuting)}</Text>
              <Text style={{ color: theme.colors.textSoft }}>
                Last active: {new Date(activeOuting.lastActiveAt).toLocaleString()}
              </Text>
              <AppButton
                label="Resume Current Outing"
                onPress={() => {
                  if (activeOutingTarget) navigation.navigate(activeOutingTarget.route, activeOutingTarget.params);
                }}
              />
            </>
          ) : (
            <Text style={{ color: theme.colors.textSoft, lineHeight: 20 }}>
              No active outing right now. Choose the journal mode that matches today's water so the data stays clean.
            </Text>
          )}
          <View style={{ flexDirection: layout.stackDirection, gap: 10 }}>
            <View style={{ flex: 1 }}>
              <AppButton label="Practice" onPress={() => beginSession('practice')} variant="secondary" />
            </View>
            <View style={{ flex: 1 }}>
              <AppButton label="Experiment" onPress={() => beginSession('experiment')} variant="secondary" />
            </View>
            <View style={{ flex: 1 }}>
              <AppButton label="Competition" onPress={() => beginSession('competition')} variant="secondary" />
            </View>
          </View>
          <AppButton label="Choose Session Style" onPress={() => setShowSessionChooser(true)} variant="ghost" />
        </SectionCard>

        <SectionCard
          title="Journal Health"
          subtitle="Beta trust starts here: complete outings, canonical setup details, and sync feedback that tells the truth."
          tone="light"
        >
          <View style={{ flexDirection: layout.stackDirection, gap: 10 }}>
            {journalHealthItems.map((item) => (
              <View
                key={item.label}
                style={{
                  flex: 1,
                  minWidth: 92,
                  backgroundColor: isDaylightTheme ? theme.colors.nestedSurface : theme.colors.surface,
                  borderRadius: theme.radius.md,
                  borderWidth: 1,
                  borderColor: isDaylightTheme ? theme.colors.nestedSurfaceBorder : theme.colors.border,
                  padding: 10,
                  gap: 2
                }}
              >
                <Text style={{ color: isDaylightTheme ? theme.colors.textDarkSoft : theme.colors.textSoft, fontSize: 12, fontWeight: '700' }}>
                  {item.label}
                </Text>
                <Text style={{ color: isDaylightTheme ? theme.colors.textDark : theme.colors.text, fontSize: 22, fontWeight: '900', fontVariant: ['tabular-nums'] }}>
                  {item.value}
                </Text>
              </View>
            ))}
          </View>
          <Text style={{ color: isDaylightTheme ? theme.colors.textDarkSoft : theme.colors.textSoft, lineHeight: 20 }}>
            {completedSessions} completed outing{completedSessions === 1 ? '' : 's'} are ready for reflection. Shared backend status: {sharedDataStatus}
            {syncStatus.pendingCount ? `, ${syncStatus.pendingCount} item${syncStatus.pendingCount === 1 ? '' : 's'} waiting to sync.` : '.'}
          </Text>
        </SectionCard>

        <SectionCard
          title="Best Current Signal"
          subtitle="Insights stay useful by favoring clean records and confidence over flashy guesses."
        >
          {latestInsight ? (
            <>
              <Text style={{ color: theme.colors.text, fontWeight: '800' }}>
                {latestInsight.confidence === 'high' ? 'Strong pattern' : latestInsight.confidence === 'medium' ? 'Moderate evidence' : 'Early signal'}
              </Text>
              <Text style={{ color: theme.colors.textSoft, lineHeight: 21 }}>{latestInsight.message}</Text>
              <AppButton label="Open Insights" onPress={() => navigation.navigate('Insights')} variant="secondary" />
            </>
          ) : (
            <>
              <Text style={{ color: theme.colors.textSoft, lineHeight: 21 }}>
                Log a few complete sessions with river, water, technique, fly, and catch details. Fishing Lab will wait until the journal has enough signal before calling something a pattern.
              </Text>
              <AppButton label="Start First Outing" onPress={() => setShowSessionChooser(true)} variant="secondary" />
            </>
          )}
        </SectionCard>

        <SectionCard
          title="Hands-Free Beta Commands"
          subtitle="Use voice as a narrow field shortcut for actions that are safe to complete without digging through screens."
          tone="light"
        >
          <View style={{ gap: 6 }}>
            {HANDS_FREE_EXAMPLES.map((example) => (
              <Text key={example.title} style={{ color: isDaylightTheme ? theme.colors.textDarkSoft : theme.colors.textSoft, lineHeight: 20 }}>
                {example.title}: {example.phrase}
              </Text>
            ))}
          </View>
        </SectionCard>

        <View style={{ flexDirection: layout.stackDirection, gap: 10 }}>
          <View style={{ flex: 1 }}>
            <AppButton label="View History" onPress={() => navigation.navigate('History')} variant="secondary" />
          </View>
          <View style={{ flex: 1 }}>
            <AppButton label="View Insights" onPress={() => navigation.navigate('Insights')} variant="secondary" />
          </View>
        </View>
        {[
          [`Ask AI Coach${currentHasPremiumAccess ? '' : ' (Premium)'}`, 'Coach'],
          ['Settings & Beta Tools', 'Access']
        ].map(([label, route]) => (
          <AppButton key={route} label={label} onPress={() => navigation.navigate(route)} variant="tertiary" />
        ))}
      </ScrollView>
      </KeyboardDismissView>
      <Modal visible={showSessionChooser} transparent animationType="fade" onRequestClose={() => setShowSessionChooser(false)}>
        <View style={{ flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'center', padding: 20 }}>
          <View
            style={{
              backgroundColor: theme.colors.modalSurface,
              borderRadius: 22,
              padding: 18,
              gap: 12,
              borderWidth: 1,
              borderColor: theme.colors.borderStrong,
              width: '100%',
              maxWidth: layout.modalMaxWidth,
              alignSelf: 'center'
            }}
          >
            <View style={{ gap: 4 }}>
              <Text style={{ color: theme.colors.modalText, fontSize: 24, fontWeight: '800' }}>What are you doing today?</Text>
              <Text style={{ color: theme.colors.modalTextSoft, lineHeight: 20 }}>
                Choose the session style that best matches today's water and how you want to log intel.
              </Text>
            </View>

            {SESSION_MODE_OPTIONS.map((option) => (
              <Pressable
                key={option.mode}
                onPress={() => beginSession(option.mode)}
                style={{
                backgroundColor: isDaylightTheme ? theme.colors.nestedSurface : theme.colors.modalNestedSurface,
                borderRadius: 16,
                padding: 14,
                borderWidth: 1,
                borderColor: isDaylightTheme ? theme.colors.nestedSurfaceBorder : theme.colors.modalNestedBorder,
                gap: 4
              }}
              >
                <Text style={{ color: isDaylightTheme ? theme.colors.textDark : theme.colors.modalText, fontWeight: '800', fontSize: 17 }}>{option.title}</Text>
                <Text style={{ color: isDaylightTheme ? theme.colors.textDarkSoft : theme.colors.modalTextSoft, lineHeight: 19 }}>{option.description}</Text>
              </Pressable>
            ))}

            <AppButton label="Cancel" onPress={() => setShowSessionChooser(false)} variant="ghost" surfaceTone="modal" />
          </View>
        </View>
      </Modal>
    </ScreenBackground>
  );
};

export default HomeScreen;
