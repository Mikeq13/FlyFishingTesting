import React from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { KeyboardDismissView } from '@/components/KeyboardDismissView';
import { ScreenBackground } from '@/components/ScreenBackground';
import { AppButton } from '@/components/ui/AppButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { StatusBanner } from '@/components/ui/StatusBanner';
import { ModalSurface } from '@/components/ui/ModalSurface';
import { WaterGuideDrawer } from '@/components/WaterGuideDrawer';
import { useTheme } from '@/design/theme';
import { useAppStore } from './store';
import { SessionMode } from '@/types/session';
import { useResponsiveLayout } from '@/design/layout';
import { buildActiveOutingLabel, buildActiveOutingNavigationTarget, HANDS_FREE_EXAMPLES } from '@/utils/handsFree';
import { getSyncTrustFeedback } from '@/utils/syncFeedback';

const SESSION_MODE_OPTIONS: Array<{
  mode: SessionMode;
  title: string;
  description: string;
}> = [
  {
    mode: 'experiment',
    title: 'Structured Experiment',
    description: 'Compare flies, water, or techniques when you want cleaner evidence instead of a loose journal note.'
  },
  {
    mode: 'practice',
    title: 'Journal Entry',
    description: 'Log the river, water, rig, flies, notes, and catches without turning the day into a research project.'
  },
  {
    mode: 'competition',
    title: 'Competition',
    description: 'Use a comp-focused session flow today, with the data model ready for future shared intel and teammate comparison.'
  }
];

export const HomeScreen = ({ navigation }: any) => {
  const {
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
    clearActiveOuting,
    autoResumePromptEnabled,
    sharedDataStatus,
    syncStatus
  } = useAppStore();
  const { theme, themeId, setThemeId, themeOptions } = useTheme();
  const layout = useResponsiveLayout();
  const isDaylightTheme = theme.id === 'daylight_light';
  const [showSessionChooser, setShowSessionChooser] = React.useState(false);
  const [showWaterGuide, setShowWaterGuide] = React.useState(false);
  const [resumeFeedback, setResumeFeedback] = React.useState<{ tone: 'success' | 'warning'; text: string } | null>(null);
  const shouldCenterContent = Platform.OS !== 'web' && !layout.isCompactLayout;
  const latestInsight = React.useMemo(
    () => [...topFlyInsights, ...insights].find((insight) => insight.confidence !== 'low') ?? topFlyInsights[0] ?? insights[0] ?? null,
    [insights, topFlyInsights]
  );
  const completedSessions = React.useMemo(() => sessions.filter((session) => !!session.endedAt).length, [sessions]);
  const activeOutingTarget = activeOuting ? buildActiveOutingNavigationTarget(activeOuting) : null;
  const activeOutingSession = React.useMemo(
    () => (activeOuting ? sessions.find((session) => session.id === activeOuting.sessionId) ?? null : null),
    [activeOuting, sessions]
  );
  const activeOutingSegment = React.useMemo(
    () =>
      activeOuting
        ? sessionSegments
            .filter((segment) => segment.sessionId === activeOuting.sessionId)
            .sort((left, right) => new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime())[0] ?? null
        : null,
    [activeOuting, sessionSegments]
  );
  const activeOutingIsStale = !!activeOuting && (!activeOutingSession || !!activeOutingSession.endedAt);
  const activeOutingResumeRoute = activeOutingTarget
    ? `${activeOutingTarget.route}${activeOuting?.experimentId ? ` #${activeOuting.experimentId}` : ''}`
    : 'No route available';
  const syncTrustFeedback = React.useMemo(
    () =>
      getSyncTrustFeedback({
        hasRemoteSession: !!remoteSession,
        sharedDataStatus,
        syncStatus,
        scope: 'local_data',
        entityLabel: 'journal'
      }),
    [remoteSession, sharedDataStatus, syncStatus]
  );
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
  const guidedDemoSteps = [
    {
      label: '1',
      title: 'Review a journal entry',
      body: demoPracticeSession?.riverName
        ? `${demoPracticeSession.riverName}: water changes, rig decisions, and catch notes are already logged.`
        : 'Open the seeded practice outing and inspect the river, water, setup, and catch timeline.'
    },
    {
      label: '2',
      title: 'Read the signal',
      body: latestInsight
        ? latestInsight.message
        : 'Insights wait for enough journal signal before turning logged trips into recommendations.'
    },
    {
      label: '3',
      title: 'Ask why it worked',
      body: 'Coach context now belongs with the outing so the recommendation is grounded in what was actually logged.'
    }
  ];
  const themeToneLabel =
    themeId === 'high_contrast'
      ? 'Field contrast'
      : themeId === 'daylight_light'
        ? 'Daylight review'
        : 'Professional river';

  const beginSession = (mode: SessionMode) => {
    setShowSessionChooser(false);
    navigation.navigate('Session', { mode });
  };

  return (
    <ScreenBackground>
      <KeyboardDismissView>
      <ScrollView style={{ flex: 1, minHeight: 0 }} contentContainerStyle={contentContainerStyle} keyboardShouldPersistTaps="handled">
        {!isWebDemoMode ? (
          <ScreenHeader
            title="Fishing Lab"
            subtitle="A hands-free fly fishing journal that turns outings, water changes, rigs, flies, and catches into patterns you can trust."
            eyebrow="On The Water"
          />
        ) : null}
        {isWebDemoMode ? (
          <View
            style={{
              minHeight: Platform.OS === 'web' ? (layout.isCompactLayout ? 520 : 620) : undefined,
              justifyContent: 'center',
              gap: 18,
              paddingVertical: layout.isCompactLayout ? 28 : 48
            }}
          >
            <View style={{ gap: 12, maxWidth: 780 }}>
              <Text
                style={{
                  color: theme.colors.textMuted,
                  fontSize: 12,
                  fontWeight: '800',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  textShadowColor: theme.colors.overlay,
                  textShadowRadius: 10
                }}
              >
                Codex Challenge Demo
              </Text>
              <Text
                style={{
                  color: theme.colors.text,
                  fontWeight: '900',
                  fontSize: layout.isCompactLayout ? 36 : 56,
                  lineHeight: layout.isCompactLayout ? 42 : 62,
                  textShadowColor: theme.colors.overlay,
                  textShadowRadius: 16
                }}
              >
                Fishing Lab turns a day on the river into patterns you can trust.
              </Text>
              <Text
                style={{
                  color: theme.colors.textSoft,
                  fontSize: layout.isCompactLayout ? 16 : 18,
                  lineHeight: layout.isCompactLayout ? 23 : 26,
                  maxWidth: 690,
                  textShadowColor: theme.colors.overlay,
                  textShadowRadius: 12
                }}
              >
                Review a logged outing, inspect the signal it produced, then ask the coach why the next recommendation exists.
              </Text>
            </View>
            <View style={{ flexDirection: layout.stackDirection, gap: 10, maxWidth: 760 }}>
              {demoPracticeSession ? (
                <View style={{ flex: 1 }}>
                  <AppButton
                    label="Review Journal Entry"
                    onPress={() => navigation.navigate('PracticeReview', { sessionId: demoPracticeSession.id })}
                    variant="primary"
                  />
                </View>
              ) : null}
              <View style={{ flex: 1 }}>
                <AppButton label="Open Water Guide" onPress={() => setShowWaterGuide(true)} variant="secondary" />
              </View>
              <View style={{ flex: 1 }}>
                <AppButton label="Start Journal Entry" onPress={() => beginSession('practice')} variant="secondary" />
              </View>
            </View>
            <View style={{ gap: 10, maxWidth: 820 }}>
              <Text style={{ color: theme.colors.text, fontWeight: '800', textShadowColor: theme.colors.overlay, textShadowRadius: 10 }}>
                River theme: {themeToneLabel}
              </Text>
              <View style={{ flexDirection: layout.stackDirection, gap: 8 }}>
                {themeOptions.map((themeOption) => (
                  <View key={themeOption.id} style={{ flex: 1 }}>
                    <AppButton
                      label={themeOption.label}
                      onPress={() => setThemeId(themeOption.id)}
                      variant={themeOption.id === themeId ? 'primary' : 'ghost'}
                    />
                  </View>
                ))}
              </View>
            </View>
            <View style={{ flexDirection: layout.stackDirection, gap: 10, maxWidth: 880 }}>
              {guidedDemoSteps.map((step) => (
                <View
                  key={step.label}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    gap: 4,
                    padding: 12,
                    borderRadius: theme.radius.md,
                    backgroundColor: theme.colors.surfaceAlt,
                    borderWidth: 1,
                    borderColor: theme.colors.border
                  }}
                >
                  <Text style={{ color: theme.colors.text, fontWeight: '900' }}>{step.label}. {step.title}</Text>
                  <Text style={{ color: theme.colors.textSoft, lineHeight: 19 }}>{step.body}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
        {!isWebDemoMode ? (
        <SectionCard>
          <Text style={{ color: theme.colors.textMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>
            Active Account
          </Text>
          <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 24 }}>{currentUser?.name ?? 'Loading...'}</Text>
          <Text style={{ color: theme.colors.textSoft }}>
            Signed in as: {remoteSession?.email ?? 'No account linked'}
          </Text>
        </SectionCard>
        ) : null}
        <SectionCard
          title={activeOuting && autoResumePromptEnabled ? 'Current Journal Entry' : 'Today\'s Journal'}
          subtitle={
            activeOuting && autoResumePromptEnabled
              ? 'Jump back into the live entry without digging through old records.'
              : 'Start with the water in front of you, log what happens, then review what the day taught you.'
          }
        >
          {activeOuting && autoResumePromptEnabled ? (
            <>
              {activeOutingIsStale ? (
                <>
                  <StatusBanner
                    tone="warning"
                    text="Repair needed: the stored outing points to a session that is missing or already ended. This outing cannot be resumed safely."
                  />
                  <View
                    style={{
                      gap: 6,
                      borderRadius: theme.radius.md,
                      padding: 12,
                      backgroundColor: theme.colors.surfaceAlt,
                      borderWidth: 1,
                      borderColor: theme.colors.border
                    }}
                  >
                    <Text style={{ color: theme.colors.textSoft }}>Mode: {activeOuting.mode}</Text>
                    <Text style={{ color: theme.colors.textSoft }}>Resume target: {activeOutingResumeRoute}</Text>
                    <Text style={{ color: theme.colors.textSoft }}>Last action: {new Date(activeOuting.lastActiveAt).toLocaleString()}</Text>
                    <Text style={{ color: theme.colors.textSoft }}>Repair: dismiss stale entry, then start a clean journal flow.</Text>
                  </View>
                  <AppButton
                    label="Dismiss Stale Entry"
                    onPress={() => {
                      clearActiveOuting().catch(() => undefined);
                    }}
                    variant="secondary"
                  />
                </>
              ) : (
                <>
                  <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 18 }}>{buildActiveOutingLabel(activeOuting)}</Text>
                  {resumeFeedback ? <StatusBanner tone={resumeFeedback.tone} text={resumeFeedback.text} /> : null}
                  <View
                    style={{
                      gap: 6,
                      borderRadius: theme.radius.md,
                      padding: 12,
                      backgroundColor: theme.colors.surfaceAlt,
                      borderWidth: 1,
                      borderColor: theme.colors.border
                    }}
                  >
                    <Text style={{ color: theme.colors.textSoft }}>
                      Mode: {activeOutingSession?.mode ?? activeOuting.mode}
                    </Text>
                    <Text style={{ color: theme.colors.textSoft }}>
                      River: {activeOutingSession?.riverName ?? activeOutingSegment?.riverName ?? 'Not set'}
                    </Text>
                    <Text style={{ color: theme.colors.textSoft }}>
                      Water: {activeOutingSegment?.waterType ?? activeOutingSession?.waterType ?? 'Not set'}
                    </Text>
                    <Text style={{ color: theme.colors.textSoft }}>
                      Technique: {activeOutingSegment?.technique ?? activeOutingSession?.startingTechnique ?? 'Not set'}
                    </Text>
                    <Text style={{ color: theme.colors.textSoft }}>
                      Last action: {new Date(activeOuting.lastActiveAt).toLocaleString()}
                    </Text>
                    <Text style={{ color: theme.colors.textSoft }}>
                      Resume target: {activeOutingResumeRoute}
                    </Text>
                  </View>
                  {syncTrustFeedback ? <StatusBanner tone={syncTrustFeedback.tone} text={syncTrustFeedback.text} /> : null}
                  <AppButton
                    label="Resume Journal Entry"
                    onPress={() => {
                      if (activeOutingTarget) {
                        setResumeFeedback({
                          tone: 'success',
                          text: 'Current outing is ready to resume. Saved state should survive relaunch.'
                        });
                        navigation.navigate(activeOutingTarget.route, activeOutingTarget.params);
                      } else {
                        setResumeFeedback({
                          tone: 'warning',
                          text: 'Resume target is unavailable. Start a clean outing or dismiss the stale recovery state.'
                        });
                      }
                    }}
                  />
                </>
              )}
            </>
          ) : (
            <Text style={{ color: theme.colors.textSoft, lineHeight: 20 }}>
              No active journal entry right now. Open the Water Guide if you want a quick read on how to fish today, or start logging when you are ready.
            </Text>
          )}
          <View style={{ flexDirection: layout.stackDirection, gap: 10 }}>
            <View style={{ flex: 1 }}>
              <AppButton label="Start Journal Entry" onPress={() => beginSession('practice')} variant="primary" />
            </View>
            <View style={{ flex: 1 }}>
              <AppButton label="Structured Experiment" onPress={() => beginSession('experiment')} variant="secondary" />
            </View>
            <View style={{ flex: 1 }}>
              <AppButton label="Competition" onPress={() => beginSession('competition')} variant="secondary" />
            </View>
          </View>
          <AppButton label="Open Water Guide" onPress={() => setShowWaterGuide(true)} variant="ghost" />
          <AppButton label="Choose Session Style" onPress={() => setShowSessionChooser(true)} variant="ghost" />
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
              <AppButton label="Open Full Analysis" onPress={() => navigation.navigate('Insights')} variant="secondary" />
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
          title={isWebDemoMode ? 'Hands-Free Field Promise' : 'Hands-Free Beta Commands'}
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
            <AppButton label="Settings & Beta Tools" onPress={() => navigation.navigate('Access')} variant="tertiary" />
          </View>
        </View>
      </ScrollView>
      </KeyboardDismissView>
      <WaterGuideDrawer visible={showWaterGuide} waterType={activeOutingSegment?.waterType ?? activeOutingSession?.waterType ?? 'run'} onClose={() => setShowWaterGuide(false)} />
      <ModalSurface
        visible={showSessionChooser}
        title="What do you want to log today?"
        subtitle="Choose the light journal path for most days, or a structured experiment when you want to compare one thing carefully."
        onClose={() => setShowSessionChooser(false)}
      >
            <View style={{ gap: 12 }}>
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
      </ModalSurface>
    </ScreenBackground>
  );
};

export default HomeScreen;
