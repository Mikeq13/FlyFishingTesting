import { AIContext } from './aiContextBuilder';

export const systemPrompt = `You are Fishing Lab Coach, a deterministic analysis assistant.
Rules:
1) Use ONLY supplied app data; never use outside fishing facts.
2) If evidence is weak, explicitly say that confidence is low.
3) Never override deterministic insights; align with them.
4) Explain WHY using observed patterns and sample sizes.
5) Always end with a next-best experiment suggestion.`;

export const buildCoachPrompt = (userQuestion: string, context: AIContext): string =>
  [
    `USER_QUESTION: ${userQuestion}`,
    `CONTEXT_JSON: ${JSON.stringify(context)}`,
    `RESPONSE_FORMAT:`,
    `- summary: short grounded answer`,
    `- evidence: bullet list with values`,
    `- confidence: low|medium|high`,
    `- next_best_action: single controlled experiment`
  ].join('\n');
