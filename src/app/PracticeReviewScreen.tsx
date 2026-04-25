import React, { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { ScreenBackground } from '@/components/ScreenBackground';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { InlineSummaryRow } from '@/components/ui/InlineSummaryRow';
import { AppButton } from '@/components/ui/AppButton';
import { StatusBanner } from '@/components/ui/StatusBanner';
import { SessionIntelligenceDrawer } from '@/components/SessionIntelligenceDrawer';
import { useAppStore } from './store';
import { useTheme } from '@/design/theme';
import { useResponsiveLayout } from '@/design/layout';
import {
  buildPracticeReviewSegments,
  describePracticeFlies,
  describePracticeRig,
  formatPracticeDuration,
  getPracticeCatchesPerHour,
  getPracticeSessionDurationMs
} from '@/utils/practiceReview';
import { describeFishingStyleSetup } from '@/utils/fishingStyle';

export const PracticeReviewScreen = ({ route, navigation }: any) => {
  const { theme } = useTheme();
  const layout = useResponsiveLayout();
  const isDaylightTheme = theme.id === 'daylight_light';
  const elevatedTextColor = isDaylightTheme ? theme.colors.textDark : theme.colors.text;
  const elevatedSoftTextColor = isDaylightTheme ? theme.colors.textDarkSoft : theme.colors.textSoft;
  const elevatedNestedSurface = isDaylightTheme ? theme.colors.nestedSurface : theme.colors.surface;
  const elevatedNestedBorder = isDaylightTheme ? theme.colors.nestedSurfaceBorder : theme.colors.borderStrong;
  const { sessions, sessionSegments, catchEvents, experiments, insights, topFlyInsights, users, activeUserId } = useAppStore();
  const [showIntelligence, setShowIntelligence] = React.useState(false);
  const sessionId = route?.params?.sessionId as number;
  const activeUser = users.find((user) => user.id === activeUserId);
  const session = sessions.find((candidate) => candidate.id === sessionId && candidate.mode === 'practice') ?? null;
  const practiceCatches = useMemo(
    () => catchEvents.filter((event) => event.sessionId === sessionId && event.mode === 'practice'),
    [catchEvents, sessionId]
  );
  const reviewSegments = useMemo(
    () => (session ? buildPracticeReviewSegments(session, sessionSegments, catchEvents) : []),
    [catchEvents, session, sessionSegments]
  );
  const sessionDurationMs = session ? getPracticeSessionDurationMs(session) : null;
  const fishingStyleSetup = describeFishingStyleSetup(session);
  const isFlyJournal = fishingStyleSetup.style === 'fly';
  const sessionDurationLabel = formatPracticeDuration(sessionDurationMs);
  const catchesPerHour = session ? getPracticeCatchesPerHour(session, practiceCatches) : null;
  const unassignedCatchCount = practiceCatches.filter((event) => !event.segmentId).length;

  return (
    <ScreenBackground>
      <ScrollView style={{ flex: 1, minHeight: 0 }} contentContainerStyle={layout.buildScrollContentStyle({ gap: 10 })}>
        <ScreenHeader
          title="Journal Review"
          subtitle="Review the logged outing segment by segment, then open Coach context to see what the day taught you."
          eyebrow={`Angler: ${activeUser?.name ?? 'Loading...'}`}
        />
        {!session ? (
          <StatusBanner tone="error" text="Journal entry not found." />
        ) : (
          <>
            <SectionCard
              title="Journal Summary"
              subtitle={new Date(session.date).toLocaleString()}
              tone="light"
            >
              {session.riverName ? <InlineSummaryRow label="River" value={session.riverName} tone="light" /> : null}
              <InlineSummaryRow label="Style" value={fishingStyleSetup.styleLabel} tone="light" />
              {!isFlyJournal && fishingStyleSetup.method ? <InlineSummaryRow label="Method" value={fishingStyleSetup.method} tone="light" /> : null}
              {!isFlyJournal && fishingStyleSetup.tackleNotes ? <InlineSummaryRow label="Tackle" value={fishingStyleSetup.tackleNotes} tone="light" /> : null}
              <InlineSummaryRow label="Water" value={session.waterType} tone="light" />
              <InlineSummaryRow label="Depth" value={session.depthRange} tone="light" />
              {session.startingTechnique ? <InlineSummaryRow label="Starting Technique" value={session.startingTechnique} tone="light" /> : null}
              <InlineSummaryRow label="Segments Logged" value={`${reviewSegments.length}`} tone="light" />
              <InlineSummaryRow label="Total Catches" value={`${practiceCatches.length}`} tone="light" />
              {sessionDurationLabel ? <InlineSummaryRow label="Elapsed Practice Time" value={sessionDurationLabel} tone="light" /> : null}
              {catchesPerHour ? <InlineSummaryRow label="Catches Per Hour" value={catchesPerHour.toFixed(1)} tone="light" /> : null}
              {unassignedCatchCount ? (
                <StatusBanner
                  tone="warning"
                  text={`${unassignedCatchCount} catch${unassignedCatchCount === 1 ? '' : 'es'} are not tied to a practice segment and are shown only in the session total.`}
                />
              ) : null}
              <AppButton label="What Did This Teach Me?" onPress={() => setShowIntelligence(true)} variant="secondary" surfaceTone="light" />
            </SectionCard>

            <SectionCard
              title="Segment Timeline"
              subtitle={isFlyJournal ? 'Use the journal timeline to trace water changes, fly choices, and catches through the outing.' : 'Use the journal timeline to trace water changes, method choices, and catches through the outing.'}
              tone="light"
            >
              {!reviewSegments.length ? (
                <Text style={{ color: elevatedSoftTextColor }}>No practice segments were logged for this session yet.</Text>
              ) : (
                reviewSegments.map(({ segment, catches, durationMs }, index) => (
                  <View
                    key={segment.id}
                    style={{
                      backgroundColor: elevatedNestedSurface,
                      borderRadius: theme.radius.md,
                      padding: 12,
                      gap: 6,
                      borderWidth: 1,
                      borderColor: elevatedNestedBorder
                    }}
                  >
                    <Text style={{ color: elevatedTextColor, fontWeight: '800' }}>Segment {index + 1}</Text>
                    <InlineSummaryRow label="Water" value={segment.waterType} tone="light" />
                    <InlineSummaryRow label="Depth" value={segment.depthRange} tone="light" />
                    <InlineSummaryRow label={isFlyJournal ? 'Technique' : 'Method'} value={isFlyJournal ? segment.technique ?? 'Technique not set' : fishingStyleSetup.method ?? 'Method not set'} tone="light" />
                    <InlineSummaryRow label="Started" value={new Date(segment.startedAt).toLocaleTimeString()} tone="light" />
                    {segment.endedAt ? <InlineSummaryRow label="Ended" value={new Date(segment.endedAt).toLocaleTimeString()} tone="light" /> : null}
                    {formatPracticeDuration(durationMs) ? <InlineSummaryRow label="Duration" value={formatPracticeDuration(durationMs) ?? ''} tone="light" /> : null}
                    {isFlyJournal ? <InlineSummaryRow label="Rig" value={describePracticeRig(segment)} tone="light" /> : null}
                    {isFlyJournal ? <InlineSummaryRow label="Flies" value={describePracticeFlies(segment)} tone="light" /> : null}
                    <InlineSummaryRow label="Catches In Segment" value={`${catches.length}`} tone="light" />

                    {!catches.length ? (
                      <Text style={{ color: elevatedSoftTextColor }}>No fish were logged during this segment.</Text>
                    ) : (
                      catches.map((event) => (
                        <View
                          key={event.id}
                          style={{
                            gap: 2,
                            borderRadius: theme.radius.sm,
                            padding: 10,
                            backgroundColor: theme.colors.surfaceAlt,
                            borderWidth: 1,
                            borderColor: theme.colors.borderStrong
                          }}
                        >
                          <Text style={{ color: elevatedTextColor, fontWeight: '700' }}>
                            {event.flyName || event.flySnapshot?.name || fishingStyleSetup.method || 'Catch'}{event.species ? ` | ${event.species}` : ''}
                          </Text>
                          <Text style={{ color: elevatedSoftTextColor }}>
                            {new Date(event.caughtAt).toLocaleTimeString()}
                            {typeof event.lengthValue === 'number' ? ` | ${event.lengthValue}${event.lengthUnit}` : ''}
                          </Text>
                        </View>
                      ))
                    )}
                  </View>
                ))
              )}
            </SectionCard>
          </>
        )}

        <AppButton label="View History" onPress={() => navigation.navigate('History')} variant="secondary" />
        <AppButton label="Back Home" onPress={() => navigation.navigate('Home')} variant="tertiary" />
      </ScrollView>
      <SessionIntelligenceDrawer
        visible={showIntelligence}
        session={session}
        sessionSegments={sessionSegments}
        catchEvents={catchEvents}
        experiments={experiments}
        insights={[...topFlyInsights, ...insights]}
        onOpenFullInsights={() => {
          setShowIntelligence(false);
          navigation.navigate('Insights');
        }}
        onClose={() => setShowIntelligence(false)}
      />
    </ScreenBackground>
  );
};
