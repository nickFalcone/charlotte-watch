import type { Env } from '../_lib/env';
import { callOpenAIResponses } from '../_lib/openaiResponses';
import {
  getAIProvider,
  validateAPIKey,
  parseJSONRequest,
  checkCache,
  storeInCache,
  createSuccessResponse,
  createErrorResponse,
  callAnthropic,
  SUMMARY_UNAVAILABLE,
} from '../_lib/summarizationHelpers';
import { AI_MAX_OUTPUT_TOKENS, OPENAI_MODEL, OPENAI_REASONING_EFFORT } from '../_lib/aiModels';
import blufPrompt from '../../src/prompts/blufSummary.json';
import {
  buildAlertsUserPrompt,
  getSortTimestamp,
  normalizeBullets,
  type AlertInput,
} from '../../src/utils/alertSummaryPrompt';

const BLUF_SYSTEM_PROMPT: string = blufPrompt.systemPrompt;

interface SummarizeRequest {
  alerts: AlertInput[];
  hash: string;
}

interface SummarizeResponse {
  summary: string;
  hash: string;
  generatedAt: string;
}

const MAX_ALERTS = 50;

/** What callOpenAIResponses / callAnthropic return when the model produced no text. */
const NO_SUMMARY = SUMMARY_UNAVAILABLE;

export const onRequestPost: PagesFunction<Env> = async context => {
  // Determine which AI provider to use
  const { provider, apiKey } = getAIProvider(context.env);

  const apiKeyError = validateAPIKey(apiKey, provider);
  if (apiKeyError) return apiKeyError;
  const key = apiKey as string; // narrow: validateAPIKey returned above if missing

  // Parse request body
  const request = await parseJSONRequest<SummarizeRequest>(context.request);
  if (request instanceof Response) return request;

  // Validate request
  if (!request.alerts || !Array.isArray(request.alerts)) {
    return new Response(JSON.stringify({ error: 'alerts array is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!request.hash || typeof request.hash !== 'string') {
    return new Response(JSON.stringify({ error: 'hash string is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Check KV cache (15min TTL, keyed by alert set hash). The OpenAI key includes the
  // model so deploys on different models sharing one KV namespace never serve each
  // other's summaries.
  const cacheKey =
    provider === 'openai' ? `summary:${OPENAI_MODEL}:${request.hash}` : `summary:${request.hash}`;
  const cachedResponse = await checkCache(context.env.CACHE, cacheKey);
  if (cachedResponse) return cachedResponse;

  // Sort by updatedAt descending, then cap to prevent abuse.
  // Must sort before slicing so we keep the most recent alerts when > MAX_ALERTS.
  const sorted = [...request.alerts].sort(
    (a, b) => getSortTimestamp(b.updatedAt) - getSortTimestamp(a.updatedAt)
  );
  const alerts = sorted.slice(0, MAX_ALERTS);

  try {
    const userPrompt = buildAlertsUserPrompt(alerts);
    let summary: string;

    if (provider === 'anthropic') {
      summary = await callAnthropic(
        BLUF_SYSTEM_PROMPT,
        userPrompt,
        key,
        AI_MAX_OUTPUT_TOKENS.alerts.anthropic
      );
    } else {
      // Use OpenAI Responses API
      summary = await callOpenAIResponses({
        apiKey: key,
        model: OPENAI_MODEL,
        instructions: BLUF_SYSTEM_PROMPT,
        input: userPrompt,
        maxOutputTokens: AI_MAX_OUTPUT_TOKENS.alerts.openai,
        reasoningEffort: OPENAI_REASONING_EFFORT,
      });
    }

    // The prompt asks for bullets; this guarantees the format whatever the model returned.
    const bullets = summary === NO_SUMMARY ? summary : normalizeBullets(summary);

    const response: SummarizeResponse = {
      summary: bullets,
      hash: request.hash,
      generatedAt: new Date().toISOString(),
    };

    const responseBody = JSON.stringify(response);

    // Store in KV cache (15min TTL); failures are non-fatal. Don't cache an empty result.
    if (summary !== NO_SUMMARY) {
      await storeInCache(context.env.CACHE, cacheKey, responseBody);
    }

    return createSuccessResponse(responseBody);
  } catch (error) {
    return createErrorResponse(error, 'Failed to generate summary');
  }
};
