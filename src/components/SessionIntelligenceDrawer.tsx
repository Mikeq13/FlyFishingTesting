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
                {session.riverName ? <InlineSummaryRow label="River" value={session.riverName} tone="modal" /> : null}
                <InlineSummaryRow label="Water" value={changedWaterTypes.length > 1 ? changedWaterTypes.join(' | ') : session.waterType} tone="modal" />
                <InlineSummaryRow label="Depth" value={session.depthRange} tone="modal" />
                {changedTechniques.length ? <InlineSummaryRow label="Technique" value={changedTechniques.join(' | ')} tone="modal" /> : null}
                <InlineSummaryRow label="Catches" value={`${sessionCatches.length}`} tone="modal" />
                <InlineSummaryRow label="Experiments" value={`${sessionExperimentList.length}`} tone="modal" />
                {durationLabel ? <InlineSummaryRow label="Duration" value={durationLabel} tone="modal" /> : null}
              </SectionCard>

              <SectionCard title="Pattern Signal" subtitle={getConfidenceLabel(bestInsight?.confidence)} tone="modal">
                <Text style={{ color: theme.colors.modalTextSoft, lineHeight: 20 }}>
                  {bestInsight?.message ??
                    'This journal does not have enough repeated evidence yet. Keep logging water, technique, flies, and catches so the app can separate hunches from patterns.'}
                </Text>
                <InlineSummaryRow
                  label="Sample Context"
                  value={`${sessionCatches.length} catch${sessionCatches.length === 1 ? '' : 'es'}, ${segmentsForSession.length} segment${segmentsForSession.length === 1 ? '' : 's'}, ${sessionExperimentList.length} structured test${sessionExperimentList.length === 1 ? '' : 's'} in this outing.`}
                  tone="modal"
                />
              </SectionCard>

              <SectionCard title="Coach Takeaway" subtitle="What to try next" tone="modal">
                <Text style={{ color: theme.colors.modalTextSoft, lineHeight: 20 }}>
                  In {activePlaybook.title.toLowerCase()} water, start by checking whether your depth and drift matched the recommended approach: {activePlaybook.recommendedApproach}
                </Text>
                <InlineSummaryRow label="Why This Exists" value={bestInsight ? `The recommendation is grounded in your journal and labeled as ${getConfidenceLabel(bestInsight.confidence)}.` : 'This is water-type guidance until your own history has enough signal.'} tone="modal" />
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
