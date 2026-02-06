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
} from '../_lib/summarizationHelpers';
import blufPrompt from '../../src/prompts/blufSummary.json';

const BLUF_SYSTEM_PROMPT: string = blufPrompt.systemPrompt;

interface AlertInput {
  title: string;
  summary: string;
  severity: string;
  source: string;
  category: string;
  /** ISO 8601; prefer alerts with later updatedAt when same service has conflicting status */
  updatedAt?: string;
}

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

function buildUserPrompt(alerts: AlertInput[]): string {
  if (alerts.length === 0) {
    return 'No active alerts.';
  }

  const alertLines = alerts.map((alert, i) => {
    const timePart = alert.updatedAt ? ` [updated ${alert.updatedAt}]` : '';
    return `${i + 1}. [${alert.severity.toUpperCase()}] ${alert.source.toUpperCase()}: ${alert.title} - ${alert.summary}${timePart}`;
  });

  return `Current alerts (${alerts.length} total). Each alert may include [updated <ISO timestamp>]; when the same service has conflicting status (e.g. suspended vs resumed), prefer the alert with the later updated timestamp as the current state.\n\n${alertLines.join('\n')}`;
}

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

  // Check KV cache (15min TTL, keyed by alert set hash)
  const cacheKey = `summary:${request.hash}`;
  const cachedResponse = await checkCache(context.env.CACHE, cacheKey);
  if (cachedResponse) return cachedResponse;

  // Limit alerts to prevent abuse
  const alerts = request.alerts.slice(0, MAX_ALERTS);

  try {
    const userPrompt = buildUserPrompt(alerts);
    let summary: string;

    if (provider === 'anthropic') {
      summary = await callAnthropic(BLUF_SYSTEM_PROMPT, userPrompt, key, 150);
    } else {
      // Use OpenAI Responses API
      summary = await callOpenAIResponses({
        apiKey: key,
        model: 'gpt-4o-mini',
        instructions: BLUF_SYSTEM_PROMPT,
        input: userPrompt,
        maxOutputTokens: 150,
        temperature: 0.3,
      });
    }

    const response: SummarizeResponse = {
      summary,
      hash: request.hash,
      generatedAt: new Date().toISOString(),
    };

    const responseBody = JSON.stringify(response);

    // Store in KV cache (15min TTL); failures are non-fatal
    await storeInCache(context.env.CACHE, cacheKey, responseBody);

    return createSuccessResponse(responseBody);
  } catch (error) {
    return createErrorResponse(error, 'Failed to generate summary');
  }
};
