import React from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { KeyboardDismissView } from '@/components/KeyboardDismissView';
import { ScreenBackground } from '@/components/ScreenBackground';
import { AppButton } from '@/components/ui/AppButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { StatusBanner } from '@/components/ui/StatusBanner';
import { ModalSurface } from '@/components/ui/ModalSurface';
import { useTheme } from '@/design/theme';
import { useAppStore } from './store';
import { SessionMode } from '@/types/session';
import { useResponsiveLayout } from '@/design/layout';
import { buildActiveOutingLabel, buildActiveOutingNavigationTarget } from '@/utils/handsFree';
import { getSyncTrustFeedback } from '@/utils/syncFeedback';
import { FISHING_STYLE_OPTIONS, FishingStyle } from '@/utils/fishingStyle';

const SESSION_MODE_OPTIONS: Array<{
  mode: SessionMode;
  title: string;
  description: string;
  recommended?: boolean;
}> = [
  {
    mode: 'practice',
    title: 'Journal Entry',
    description: 'Recommended for most anglers. Log the water, setup, notes, and catches without turning the day into a research project.',
    recommended: true
  },
  {
    mode: 'experiment',
    title: 'Structured Experiment',
    description: 'Compare flies, water, or techniques when you want cleaner evidence instead of a loose journal note.'
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
    resetWebDemoData,
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
  const [selectedFishingStyle, setSelectedFishingStyle] = React.useState<FishingStyle | null>(null);
  const [resumeFeedback, setResumeFeedback] = React.useState<{ tone: 'success' | 'warning'; text: string } | null>(null);
  const [demoResetFeedback, setDemoResetFeedback] = React.useState<{ tone: 'success' | 'warning'; text: string } | null>(null);
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

  const beginSession = (mode: SessionMode, fishingStyle: FishingStyle = 'fly') => {
    setShowSessionChooser(false);
    setSelectedFishingStyle(null);
    navigation.navigate('Session', { mode, fishingStyle });
  };

  const openSessionChooser = () => {
    setSelectedFishingStyle(null);
    setShowSessionChooser(true);
  };

  const resetDemoData = () => {
    setDemoResetFeedback(null);
    resetWebDemoData()
      .then(() =>
        setDemoResetFeedback({
          tone: 'success',
          text: 'Demo data reset. The seeded journal, catches, and insights are ready again.'
        })
      )
      .catch(() =>
        setDemoResetFeedback({
          tone: 'warning',
          text: 'Demo reset did not finish. Refresh the page and try again.'
        })
      );
  };

  return (
    <ScreenBackground>
      <KeyboardDismissView>
      <ScrollView style={{ flex: 1, minHeight: 0 }} contentContainerStyle={contentContainerStyle} keyboardShouldPersistTaps="handled">
        {!isWebDemoMode ? (
          <ScreenHeader
            title="Fishing Lab"
            subtitle="A hands-free fishing journal that turns outings, water changes, setups, and catches into patterns you can trust."
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
                Fishing Lab turns a day on the water into patterns you can trust.
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
                <AppButton label="Start Journal Entry" onPress={openSessionChooser} variant="secondary" />
              </View>
            </View>
            {demoResetFeedback ? <StatusBanner tone={demoResetFeedback.tone} text={demoResetFeedback.text} /> : null}
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
              <View style={{ maxWidth: 360 }}>
                <AppButton label="Reset Demo Data" onPress={resetDemoData} variant="ghost" />
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
            Welcome
          </Text>
          <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 24 }}>
            Hello {currentUser?.name ?? 'there'}.
          </Text>
          <Text style={{ color: theme.colors.textSoft, lineHeight: 20 }}>
            {activeOuting && autoResumePromptEnabled
              ? 'Resume Journal Entry returns to the live record you already started. Start Journal Entry begins a separate outing for new water, new timing, or a different fishing style.'
              : 'Start a journal entry to briefly document what you are doing today.'}
          </Text>
        </SectionCard>
        ) : null}
        {!isWebDemoMode ? (
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
                No active journal entry right now. Choose the style of fishing you are doing today, then Fishing Lab will guide you into the right setup.
              </Text>
            )}
            <AppButton label="Start Journal Entry" onPress={openSessionChooser} variant="primary" />
          </SectionCard>
        ) : null}

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
            </>
          ) : (
            <Text style={{ color: theme.colors.textSoft, lineHeight: 21 }}>
              Log a few complete sessions with water, setup, method, and catch details. Fishing Lab will wait until the journal has enough signal before calling something a pattern.
            </Text>
          )}
        </SectionCard>

        <SectionCard
          title="Voice Commands"
          subtitle="Use structured voice shortcuts inside active journal entries for safe field actions like logging fish, adding notes, and changing water."
          tone="light"
        >
          <Text style={{ color: isDaylightTheme ? theme.colors.textDarkSoft : theme.colors.textSoft, lineHeight: 20 }}>
            Open Voice Commands from a journal entry when you want the full list of supported phrases.
          </Text>
        </SectionCard>

        <View>
          <AppButton label="Settings" onPress={() => navigation.navigate('Access')} variant="tertiary" />
        </View>
      </ScrollView>
      </KeyboardDismissView>
      <ModalSurface
        visible={showSessionChooser}
        title={selectedFishingStyle ? FISHING_STYLE_OPTIONS.find((option) => option.key === selectedFishingStyle)?.title ?? 'Choose Session' : 'Choose Fishing Style'}
        subtitle={
          selectedFishingStyle
            ? selectedFishingStyle === 'fly'
              ? 'Choose how much structure you want. Journal Entry is the best default when you just want to fish and learn.'
              : 'This style starts with a lightweight journal entry so logging stays quick.'
            : 'Start with the type of fishing you are doing today. Fishing Lab will only show the flows that fit that style.'
        }
        onClose={() => {
          setShowSessionChooser(false);
          setSelectedFishingStyle(null);
        }}
      >
        <View style={{ gap: 12 }}>
          {!selectedFishingStyle ? (
            FISHING_STYLE_OPTIONS.map((styleOption) => (
              <Pressable
                key={styleOption.key}
                onPress={() => setSelectedFishingStyle(styleOption.key)}
                style={{
                  backgroundColor: isDaylightTheme ? theme.colors.nestedSurface : theme.colors.modalNestedSurface,
                  borderRadius: 16,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: isDaylightTheme ? theme.colors.nestedSurfaceBorder : theme.colors.modalNestedBorder,
                  gap: 4
                }}
              >
                <Text style={{ color: isDaylightTheme ? theme.colors.textDark : theme.colors.modalText, fontWeight: '800', fontSize: 17 }}>
                  {styleOption.title}
                </Text>
                <Text style={{ color: isDaylightTheme ? theme.colors.textDarkSoft : theme.colors.modalTextSoft, lineHeight: 19 }}>
                  {styleOption.description}
                </Text>
              </Pressable>
            ))
          ) : selectedFishingStyle === 'fly' ? (
            <View style={{ gap: 8 }}>
              {SESSION_MODE_OPTIONS.map((option) => (
                <Pressable
                  key={option.mode}
                  onPress={() => beginSession(option.mode, 'fly')}
                  style={{
                    backgroundColor: isDaylightTheme ? theme.colors.nestedSurface : theme.colors.modalNestedSurface,
                    borderRadius: 16,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: option.recommended ? theme.colors.primary : isDaylightTheme ? theme.colors.nestedSurfaceBorder : theme.colors.modalNestedBorder,
                    gap: 4
                  }}
                >
                  <Text style={{ color: isDaylightTheme ? theme.colors.textDark : theme.colors.modalText, fontWeight: '800', fontSize: 17 }}>
                    {option.title}{option.recommended ? ' - Recommended' : ''}
                  </Text>
                  <Text style={{ color: isDaylightTheme ? theme.colors.textDarkSoft : theme.colors.modalTextSoft, lineHeight: 19 }}>{option.description}</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              <StatusBanner tone="info" text="Journal Entry is the simple path for this fishing style. Structured experiments and competition stay fly-first for now." />
              <AppButton label="Start Journal Entry" onPress={() => beginSession('practice', selectedFishingStyle)} surfaceTone="modal" />
            </View>
          )}

          {selectedFishingStyle ? (
            <AppButton label="Back To Fishing Styles" onPress={() => setSelectedFishingStyle(null)} variant="ghost" surfaceTone="modal" />
          ) : null}
          <AppButton
            label="Cancel"
            onPress={() => {
              setShowSessionChooser(false);
              setSelectedFishingStyle(null);
            }}
            variant="ghost"
            surfaceTone="modal"
          />
        </View>
      </ModalSurface>
    </ScreenBackground>
  );
};

export default HomeScreen;
