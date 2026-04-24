import { buildSessionSegmentUpdatePayload, buildSessionUpdatePayload } from '@/utils/sessionState';
import { Experiment } from '@/types/experiment';
import { HandsFreeActionContext, HandsFreeActionResult, HandsFreeCommand } from '@/types/handsFree';

const buildExperimentUpdatePayload = (
  experiment: Experiment,
  overrides: Partial<Omit<Experiment, 'id' | 'userId'>> = {}
): Omit<Experiment, 'id' | 'userId'> => ({
  sessionId: experiment.sessionId,
  hypothesis: experiment.hypothesis,
  controlFocus: experiment.controlFocus,
  waterType: experiment.waterType,
  technique: experiment.technique,
  rigSetup: experiment.rigSetup,
  flyEntries: experiment.flyEntries,
  controlFly: experiment.controlFly,
  variantFly: experiment.variantFly,
  controlCasts: experiment.controlCasts,
  controlCatches: experiment.controlCatches,
  variantCasts: experiment.variantCasts,
  variantCatches: experiment.variantCatches,
  winner: experiment.winner,
  outcome: experiment.outcome,
  status: experiment.status,
  confidenceScore: experiment.confidenceScore,
  archivedAt: experiment.archivedAt,
  legacyStatusMissing: experiment.legacyStatusMissing,
  ...overrides
});

const appendNote = (existing: string | undefined, nextNote: string) =>
  [existing?.trim(), `[Hands-free] ${nextNote.trim()}`].filter(Boolean).join('\n');

const success = (message: string, successTitle?: string, navigateToOuting?: boolean): HandsFreeActionResult => ({
  ok: true,
  message,
  successTitle,
  navigateToOuting
});

const failure = (message: string): HandsFreeActionResult => ({
  ok: false,
  message
});

const describeSource = (source: HandsFreeCommand['source']) =>
  source === 'watch' ? 'Apple Watch' : source === 'assistant' ? 'Google Assistant' : source === 'app' ? 'Fishing Lab' : 'Siri';

export const executeHandsFreeCommand = async (
  command: HandsFreeCommand,
  context: HandsFreeActionContext
): Promise<HandsFreeActionResult> => {
  const sourceLabel = describeSource(command.source ?? 'siri');

  if (!context.dictationEnabled) {
    return failure('Hands-free dictation is turned off in Settings.');
  }

  const activeOuting = context.activeOuting;
  if (!activeOuting) {
    return failure('No active outing is available to receive this command.');
  }

  const session = context.sessions.find((candidate) => candidate.id === activeOuting.sessionId) ?? null;
  if (!session || session.endedAt) {
    return failure('The current outing is no longer active.');
  }

  const activeSegment =
    context.sessionSegments
      .filter((segment) => segment.sessionId === activeOuting.sessionId)
      .sort((left, right) => new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime())
      .find((segment) => !segment.endedAt) ?? null;
  const activeExperiment =
    (activeOuting.experimentId
      ? context.experiments.find((experiment) => experiment.id === activeOuting.experimentId)
      : context.experiments
          .filter((experiment) => experiment.sessionId === activeOuting.sessionId)
          .sort((left, right) => right.id - left.id)[0]) ?? null;

  if (command.action === 'resume_outing') {
    return success('Current outing is ready to resume.', 'Outing Ready', true);
  }

  if (command.action === 'add_note') {
    const noteText = command.noteText?.trim();
    if (!noteText) return failure('A short note is required before I can save it.');

    if (activeOuting.targetRoute === 'Practice' && activeSegment) {
      await context.updateSessionSegmentEntry(
        activeSegment.id,
        buildSessionSegmentUpdatePayload(activeSegment, {
          notes: appendNote(activeSegment.notes, noteText)
        })
      );
      return success(`Added a ${sourceLabel} note to the current practice segment.`, 'Note Added');
    }

    await context.updateSessionEntry(
      session.id,
      buildSessionUpdatePayload(session, {
        notes: appendNote(session.notes, noteText)
      })
    );
    return success(`Added a ${sourceLabel} note to the current outing.`, 'Note Added');
  }

  if (command.action === 'change_water') {
    if (!command.waterType) return failure('Choose one of the supported water types before changing water.');

    if (activeOuting.targetRoute === 'Practice' && activeSegment) {
      const endedAt = new Date().toISOString();
      await context.updateSessionSegmentEntry(
        activeSegment.id,
        buildSessionSegmentUpdatePayload(activeSegment, { endedAt })
      );
      await context.addSessionSegment({
        sessionId: session.id,
        mode: session.mode,
        riverName: activeSegment.riverName,
        waterType: command.waterType,
        depthRange: activeSegment.depthRange,
        startedAt: endedAt,
        flySnapshots: activeSegment.flySnapshots,
        rigSetup: activeSegment.rigSetup,
        technique: activeSegment.technique,
        notes: activeSegment.notes
      });
      await context.updateSessionEntry(
        session.id,
        buildSessionUpdatePayload(session, {
          waterType: command.waterType
        })
      );
      return success(`Started a new practice segment in ${command.waterType}.`, 'Water Updated');
    }

    if (activeOuting.targetRoute === 'Experiment' && activeExperiment) {
      await context.updateExperimentEntry(
        activeExperiment.id,
        buildExperimentUpdatePayload(activeExperiment, {
          waterType: command.waterType
        }),
        { refresh: true }
      );
      return success(`Updated the experiment water type to ${command.waterType}.`, 'Water Updated');
    }

    return failure('Change Water is currently available for practice and experiment outings.');
  }

  if (command.action === 'change_technique') {
    if (!command.technique) return failure('Choose one of the supported techniques before changing it.');

    if (activeOuting.targetRoute === 'Practice' && activeSegment) {
      await context.updateSessionSegmentEntry(
        activeSegment.id,
        buildSessionSegmentUpdatePayload(activeSegment, {
          technique: command.technique
        })
      );
      return success(`Updated the active practice technique to ${command.technique}.`, 'Technique Updated');
    }

    if (activeOuting.targetRoute === 'Experiment' && activeExperiment) {
      await context.updateExperimentEntry(
        activeExperiment.id,
        buildExperimentUpdatePayload(activeExperiment, {
          technique: command.technique
        }),
        { refresh: true }
      );
      return success(`Updated the experiment technique to ${command.technique}.`, 'Technique Updated');
    }

    return failure('Change Technique is currently available for practice and experiment outings.');
  }

  if (command.action === 'log_fish') {
    if (session.mode === 'competition') {
      await context.addCatchEvent({
        sessionId: session.id,
        mode: 'competition',
        species: command.species ?? undefined,
        lengthValue: session.competitionRequiresMeasurement === false ? undefined : command.lengthValue ?? undefined,
        lengthUnit: session.competitionLengthUnit ?? command.lengthUnit ?? 'mm',
        caughtAt: new Date().toISOString(),
        notes: `Logged hands-free through ${sourceLabel}`
      });
      return success('Logged a fish to the current competition outing.', 'Fish Logged');
    }

    if (activeOuting.targetRoute === 'Practice' && activeSegment) {
      const defaultFly = activeSegment.rigSetup?.assignments[0]?.fly ?? activeSegment.flySnapshots[0];
      await context.addCatchEvent({
        sessionId: session.id,
        segmentId: activeSegment.id,
        mode: 'practice',
        flyName: defaultFly?.name,
        flySnapshot: defaultFly,
        species: command.species ?? undefined,
        lengthValue: session.practiceMeasurementEnabled ? command.lengthValue ?? undefined : undefined,
        lengthUnit: session.practiceLengthUnit ?? command.lengthUnit ?? 'in',
        caughtAt: new Date().toISOString(),
        notes: `Logged hands-free through ${sourceLabel}`
      });
      return success('Logged a fish to the active practice segment.', 'Fish Logged');
    }

    return failure('Hands-free fish logging is available for practice and competition outings right now.');
  }

  return failure('That hands-free command is not supported yet.');
};
