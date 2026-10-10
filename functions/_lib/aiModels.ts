/**
 * Model choices and output caps for every AI call (alerts, weather, news), shared by the
 * Pages Functions, the cache-warmer Worker, and the dev-server plugins in vite.config.ts.
 *
 * Which provider runs is decided by the AI_PROVIDER env var (default 'openai').
 */

import type { OpenAIReasoningEffort } from './openaiResponses';

/** OpenAI model. A reasoning model: temperature is not sent, effort is set explicitly. */
export const OPENAI_MODEL = 'gpt-6-luna';
export const OPENAI_REASONING_EFFORT: OpenAIReasoningEffort = 'low';

/** Anthropic model. Adaptive thinking is on by default; effort is set in callAnthropic. */
export const ANTHROPIC_MODEL = 'claude-haiku-5-5';

/**
 * Max output tokens per task. Reasoning (OpenAI) and thinking (Anthropic) tokens count against
 * these caps, so they are generous ceilings rather than expected output sizes; an undersized
 * cap can end a response before any text is written.
 */
export const AI_MAX_OUTPUT_TOKENS = {
  alerts: { openai: 8000, anthropic: 2000 },
  weather: { openai: 4000, anthropic: 1500 },
  news: { openai: 16000, anthropic: 8192 },
} as const;
