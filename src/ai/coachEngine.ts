import { AIContext } from './aiContextBuilder';
import { buildCoachPrompt, systemPrompt } from './aiPromptBuilder';

export interface CoachResponse {
  summary: string;
  evidence: string[];
  confidence: 'low' | 'medium' | 'high';
  nextBestAction: string;
  rawPrompt: string;
}

export const runCoach = (question: string, context: AIContext): CoachResponse => {
  const topInsight = context.topInsights[0];
  const evidence = [
    ...context.topInsights.slice(0, 3).map((i) => `${i.type}: ${i.message}`),
    ...context.anomalies.map((a) => `anomaly: ${a}`)
  ];

  const confidence: 'low' | 'medium' | 'high' = topInsight?.confidence || 'low';
  const summary = topInsight
    ? `Based on your own data, the strongest signal is: ${topInsight.message}`
    : 'Your current dataset has limited signal. We can still improve by tightening experiment design.';

  return {
    summary,
    evidence,
    confidence,
    nextBestAction: 'Run 40 casts in one water type, keep fly constant, and change only depth range to isolate depth effect.',
    rawPrompt: `${systemPrompt}\n\n${buildCoachPrompt(question, context)}`
  };
};
