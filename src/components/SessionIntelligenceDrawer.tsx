import React from 'react';
import { Text, View } from 'react-native';
import { AppButton } from '@/components/ui/AppButton';
import { BottomSheetSurface } from '@/components/ui/BottomSheetSurface';
import { InlineSummaryRow } from '@/components/ui/InlineSummaryRow';
import { SectionCard } from '@/components/ui/SectionCard';
import { useTheme } from '@/design/theme';
import { CatchEvent, SessionSegment } from '@/types/activity';
import { Experiment, Insight } from '@/types/experiment';
import { Session } from '@/types/session';
import { describeFishingStyleSetup } from '@/utils/fishingStyle';
import { formatPracticeDuration, getPracticeSessionDurationMs } from '@/utils/practiceReview';
import { getWaterTypePlaybookEntry } from '@/utils/waterTypePlaybook';

const getConfidenceLabel = (confidence?: Insight['confidence']) =>
  confidence === 'high' ? 'strong pattern' : confidence === 'medium' ? 'moderate evidence' : 'early signal';

const getSessionModeLabel = (mode: Session['mode']) =>
  mode === 'practice' ? 'journal entry' : mode === 'experiment' ? 'structured experiment' : 'competition session';

export const SessionIntelligenceDrawer = ({
  visible,
  session,
  sessionSegments,
  catchEvents,
  experiments,
  insights,
  onOpenFullInsights,
  onClose
}: {
  visible: boolean;
  session: Session | null;
  sessionSegments: SessionSegment[];
  catchEvents: CatchEvent[];
  experiments: Experiment[];
  insights: Insight[];
  onOpenFullInsights?: () => void;
  onClose: () => void;
}) => {
  const { theme } = useTheme();

  const sessionCatches = React.useMemo(
    () => (session ? catchEvents.filter((event) => event.sessionId === session.id) : []),
    [catchEvents, session]
  );
  const sessionExperimentList = React.useMemo(
    () => (session ? experiments.filter((experiment) => experiment.sessionId === session.id) : []),
    [experiments, session]
  );
  const bestInsight = insights.find((insight) => insight.confidence !== 'low') ?? insights[0] ?? null;
  const activePlaybook = getWaterTypePlaybookEntry(session?.waterType);
  const durationLabel = session ? formatPracticeDuration(getPracticeSessionDurationMs(session)) : null;
  const segmentsForSession = session ? sessionSegments.filter((segment) => segment.sessionId === session.id) : [];
  const changedWaterTypes = [...new Set(segmentsForSession.map((segment) => segment.waterType))];
  const changedTechniques = [...new Set(segmentsForSession.map((segment) => segment.technique).filter(Boolean))];
  const styleSetup = React.useMemo(() => describeFishingStyleSetup(session), [session]);
  const isSpinBaitJournal = styleSetup.style === 'spin_bait';
  const bestSegment = React.useMemo(() => {
    const catchCountBySegmentId = new Map<number, number>();
    sessionCatches.forEach((event) => {
      if (typeof event.segmentId === 'number') {
        catchCountBySegmentId.set(event.segmentId, (catchCountBySegmentId.get(event.segmentId) ?? 0) + 1);
      }
    });
    return (
      segmentsForSession
        .map((segment) => ({ segment, catches: catchCountBySegmentId.get(segment.id) ?? 0 }))
        .sort((left, right) => right.catches - left.catches)[0] ?? null
    );
  }, [segmentsForSession, sessionCatches]);
  const workedItems = React.useMemo(() => {
    const counts = new Map<string, number>();
    sessionCatches.forEach((event) => {
      const label =
        event.flyName ||
        event.flySnapshot?.name ||
        styleSetup.setupName ||
        styleSetup.method ||
        styleSetup.tackleNotes ||
        'Logged catch';
      counts.set(label, (counts.get(label) ?? 0) + 1);
    });
    return [...counts.entries()].sort((left, right) => right[1] - left[1]).slice(0, 3);
  }, [sessionCatches, styleSetup.method, styleSetup.setupName, styleSetup.tackleNotes]);
  const improvementFocus = styleSetup.style === 'boat_trolling'
    ? 'Keep naming the setup, then add depth, speed, lure, and location notes so lake patterns become easier to repeat.'
    : styleSetup.style === 'spin_bait'
      ? 'Keep naming the setup, then add lure, bait, retrieve, structure, and water notes so tackle signals get cleaner.'
      : activePlaybook.commonMistake;

  return (
      <BottomSheetSurface
        visible={visible}
        title="Session Intelligence"
        subtitle="Coach and insight context tied to this journal entry, not a detached analytics page."
        onClose={onClose}
      >
        <View style={{ gap: 12 }}>
          {!session ? (
            <Text style={{ color: theme.colors.modalTextSoft }}>Session not found.</Text>
          ) : (
            <>
              <SectionCard title="What Happened" subtitle={new Date(session.date).toLocaleString()} tone="modal">
                <InlineSummaryRow label="Mode" value={getSessionModeLabel(session.mode)} tone="modal" />
                {session.riverName ? <InlineSummaryRow label="Location" value={session.riverName} tone="modal" /> : null}
                <InlineSummaryRow label="Water" value={changedWaterTypes.length > 1 ? changedWaterTypes.join(' | ') : session.waterType} tone="modal" />
                {!isSpinBaitJournal ? <InlineSummaryRow label="Depth" value={session.depthRange} tone="modal" /> : null}
                {changedTechniques.length ? <InlineSummaryRow label="Technique" value={changedTechniques.join(' | ')} tone="modal" /> : null}
                <InlineSummaryRow label="Catches" value={`${sessionCatches.length}`} tone="modal" />
                <InlineSummaryRow label="Experiments" value={`${sessionExperimentList.length}`} tone="modal" />
                {durationLabel ? <InlineSummaryRow label="Duration" value={durationLabel} tone="modal" /> : null}
              </SectionCard>

              <SectionCard title="Session Summary" subtitle={getConfidenceLabel(bestInsight?.confidence)} tone="modal">
                <Text style={{ color: theme.colors.modalTextSoft, lineHeight: 20 }}>
                  {bestSegment && bestSegment.catches > 0
                    ? isSpinBaitJournal
                      ? `${bestSegment.segment.waterType} water produced the strongest result in this outing.`
                      : `${bestSegment.segment.waterType} water at ${bestSegment.segment.depthRange} produced the strongest result in this outing.`
                    : bestInsight?.message ??
                      'This journal does not have enough repeated evidence yet. Keep logging water, setup names, notes, and catches so the app can separate hunches from patterns.'}
                </Text>
                <InlineSummaryRow
                  label="What You Fished Best"
                  value={
                    bestSegment
                      ? isSpinBaitJournal
                        ? `${bestSegment.segment.waterType} | ${styleSetup.setupName ?? styleSetup.method ?? 'method not set'}`
                        : `${bestSegment.segment.waterType} | ${bestSegment.segment.depthRange} | ${bestSegment.segment.technique ?? styleSetup.setupName ?? styleSetup.method ?? 'method not set'}`
                      : isSpinBaitJournal
                        ? session.waterType
                        : `${session.waterType} | ${session.depthRange}`
                  }
                  tone="modal"
                />
                <InlineSummaryRow label="Catch Context" value={`${sessionCatches.length} catch${sessionCatches.length === 1 ? '' : 'es'}, ${segmentsForSession.length} segment${segmentsForSession.length === 1 ? '' : 's'}, ${sessionExperimentList.length} structured test${sessionExperimentList.length === 1 ? '' : 's'}.`} tone="modal" />
              </SectionCard>

              <SectionCard title="What Worked" subtitle="The flies, named setups, tackle, or methods tied to catches in this outing." tone="modal">
                {workedItems.length ? (
                  workedItems.map(([label, count]) => (
                    <InlineSummaryRow key={label} label={label} value={`${count} catch${count === 1 ? '' : 'es'}`} tone="modal" />
                  ))
                ) : (
                  <Text style={{ color: theme.colors.modalTextSoft, lineHeight: 20 }}>
                    No catches were logged in this outing yet. The best next value is recording what you tried, where you tried it, and what you would change.
                  </Text>
                )}
              </SectionCard>

              <SectionCard title="Coach Takeaway" subtitle="Recommendation plus one improvement focus" tone="modal">
                <Text style={{ color: theme.colors.modalTextSoft, lineHeight: 20 }}>
                  In {activePlaybook.title.toLowerCase()} water, start by checking whether your depth and drift matched the recommended approach: {activePlaybook.recommendedApproach}
                </Text>
                <InlineSummaryRow label="Why This Exists" value={bestInsight ? `The recommendation is grounded in your journal and labeled as ${getConfidenceLabel(bestInsight.confidence)}.` : 'This is water-type guidance until your own history has enough signal.'} tone="modal" />
                <InlineSummaryRow label="Area To Improve" value={improvementFocus} tone="modal" />
                <InlineSummaryRow label="Next Log Focus" value={activePlaybook.whatToLog} tone="modal" />
              </SectionCard>
            </>
          )}

          {onOpenFullInsights ? (
            <AppButton label="Open Full Analysis" onPress={onOpenFullInsights} variant="secondary" surfaceTone="modal" />
          ) : null}
          <AppButton label="Done" onPress={onClose} surfaceTone="modal" />
        </View>
      </BottomSheetSurface>
  );
};
