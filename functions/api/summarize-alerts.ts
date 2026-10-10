import type { Env } from '../_lib/env';
import { callOpenAIResponses } from '../_lib/openaiResponses';
import {
  getAIProvider,
  validateAPIKey,
  parseJSONRequest,
  checkCache,
  sha256Hex,
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
  /** Ignored by the server: the cache key is derived from the alert content (see below). */
  hash?: string;
}

interface SummarizeResponse {
  summary: string;
  hash: string;
  generatedAt: string;
}

const MAX_ALERTS = 50;

const MAX_FIELD_LENGTH = {
  title: 200,
  summary: 600,
  severity: 24,
  source: 24,
  category: 24,
} as const;

function clampString(value: unknown, max: number): string {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

/** Coerce an untrusted request item into a bounded AlertInput. */
function normalizeAlert(raw: unknown): AlertInput | null {
  if (!raw || typeof raw !== 'object') return null;
  const a = raw as Record<string, unknown>;
  const updatedAt =
    typeof a.updatedAt === 'string' && !isNaN(Date.parse(a.updatedAt))
      ? new Date(a.updatedAt).toISOString()
      : undefined;
  return {
    title: clampString(a.title, MAX_FIELD_LENGTH.title),
    summary: clampString(a.summary, MAX_FIELD_LENGTH.summary),
    severity: clampString(a.severity, MAX_FIELD_LENGTH.severity),
    source: clampString(a.source, MAX_FIELD_LENGTH.source),
    category: clampString(a.category, MAX_FIELD_LENGTH.category),
    updatedAt,
  };
}

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

  // Sort by updatedAt descending, then cap to prevent abuse.
  // Must sort before slicing so we keep the most recent alerts when > MAX_ALERTS.
  const alerts = request.alerts
    .map(normalizeAlert)
    .filter((a): a is AlertInput => a !== null)
    .sort((a, b) => getSortTimestamp(b.updatedAt) - getSortTimestamp(a.updatedAt))
    .slice(0, MAX_ALERTS);

  // The cache key is a SHA-256 of the alerts actually sent to the model, never the
  // client-supplied hash, so a caller can only populate the entry for the content they
  // submitted. The OpenAI key includes the model so deploys on different models sharing
  // one KV namespace never serve each other's summaries.
  const contentHash = await sha256Hex(JSON.stringify(alerts));
  const cacheKey =
    provider === 'openai' ? `summary:${OPENAI_MODEL}:${contentHash}` : `summary:${contentHash}`;
  const cachedResponse = await checkCache(context.env.CACHE, cacheKey);
  if (cachedResponse) return cachedResponse;

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
      hash: contentHash,
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
