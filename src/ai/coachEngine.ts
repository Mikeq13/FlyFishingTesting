import { AIContext } from './aiContextBuilder';
import { buildCoachPrompt, systemPrompt } from './aiPromptBuilder';

export interface CoachResponse {
  summary: string;
  evidence: string[];
  confidence: 'low' | 'medium' | 'high';
  confidenceLabel: 'early signal' | 'moderate evidence' | 'strong pattern';
  sampleContext: string;
  whyThisExists: string;
  nextBestAction: string;
  rawPrompt: string;
}

export const runCoach = (question: string, context: AIContext): CoachResponse => {
  const topInsight = context.topInsights[0];
  const loggedSessionCount = context.recentSessions.length;
  const completedSessionCount = context.recentSessions.filter((session) => !!session.endedAt).length;
  const evidence = [
    ...context.topInsights.slice(0, 3).map((i) => `${i.type}: ${i.message}`),
    ...context.anomalies.map((a) => `anomaly: ${a}`)
  ];

  const confidence: 'low' | 'medium' | 'high' = topInsight?.confidence || 'low';
  const confidenceLabel =
    confidence === 'high' ? 'strong pattern' : confidence === 'medium' ? 'moderate evidence' : 'early signal';
  const sampleContext = `${loggedSessionCount} recent journal entr${loggedSessionCount === 1 ? 'y' : 'ies'} reviewed, ${completedSessionCount} completed outing${completedSessionCount === 1 ? '' : 's'}.`;

  const summary = topInsight
    ? `Based on your own data, the strongest signal is: ${topInsight.message}`
    : 'Your current dataset has limited signal. We can still improve by tightening experiment design.';
  const whyThisExists = topInsight
    ? `This recommendation is grounded in your logged journal conditions and is labeled as ${confidenceLabel} so it does not overstate thin data.`
    : 'This recommendation exists to help you collect cleaner evidence before the app treats anything as a repeatable pattern.';

  return {
    summary,
    evidence,
    confidence,
    confidenceLabel,
    sampleContext,
    whyThisExists,
    nextBestAction:
      'Run 40 casts in one water type, keep fly constant, and change only depth range to isolate depth effect.',
    rawPrompt: `${systemPrompt}\n\n${buildCoachPrompt(question, context)}`
  };
};
