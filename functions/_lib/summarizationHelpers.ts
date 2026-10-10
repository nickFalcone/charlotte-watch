import type { Env } from './env';
import { ANTHROPIC_MODEL } from './aiModels';

/**
 * Shared helpers for AI summarization endpoints
 */

const CACHE_TTL_SECONDS = 900; // 15 minutes
const CACHE_CONTROL_HEADER = 'private, max-age=900';

/**
 * SHA-256 hex digest. Cache keys are derived with this from the exact content sent to the
 * model, never from a client-supplied value, so a caller can only ever populate the cache
 * entry for the content they actually submitted.
 */
export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Determines which AI provider to use based on environment config
 */
export function getAIProvider(env: Env): {
  provider: 'anthropic' | 'openai';
  apiKey: string | undefined;
} {
  const provider = env.AI_PROVIDER || 'openai';
  const apiKey = provider === 'anthropic' ? env.ANTHROPIC_API_KEY : env.OPENAI_API_KEY;
  return { provider, apiKey };
}

/**
 * Validates that an API key is configured, returns error response if not
 */
export function validateAPIKey(apiKey: string | undefined, provider: string): Response | null {
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: `${provider.toUpperCase()} API key not configured` }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
  return null;
}

/**
 * Parses JSON request body, returns error response if invalid
 */
export async function parseJSONRequest<T>(request: Request): Promise<T | Response> {
  try {
    return await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Checks KV cache for existing result, returns cached response if found
 */
export async function checkCache(cache: KVNamespace, cacheKey: string): Promise<Response | null> {
  try {
    const cached = await cache.get(cacheKey);
    if (cached) {
      return new Response(cached, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': CACHE_CONTROL_HEADER,
        },
      });
    }
  } catch (e) {
    console.error('KV cache read error:', e);
  }
  return null;
}

/**
 * Stores result in KV cache (non-fatal on failure)
 */
export async function storeInCache(
  cache: KVNamespace,
  cacheKey: string,
  responseBody: string
): Promise<void> {
  try {
    await cache.put(cacheKey, responseBody, { expirationTtl: CACHE_TTL_SECONDS });
  } catch (e) {
    console.error('KV cache write error:', e);
  }
}

/**
 * Creates a successful JSON response with cache headers
 */
export function createSuccessResponse(responseBody: string): Response {
  return new Response(responseBody, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': CACHE_CONTROL_HEADER,
    },
  });
}

/**
 * Creates an error JSON response
 */
export function createErrorResponse(
  error: unknown,
  message: string = 'Failed to generate summary'
): Response {
  const err = error instanceof Error ? error : new Error('Unknown error');
  const cause = err.cause instanceof Error ? err.cause.message : String(err.cause ?? '');
  // Upstream details (provider error bodies, request ids) stay in server logs only.
  console.error(`${message}:`, err.message, cause || '');

  return new Response(JSON.stringify({ error: message }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** What the AI helpers return when the model produced no usable text. */
export const SUMMARY_UNAVAILABLE = 'Unable to generate summary.';

export type AnthropicEffort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

/**
 * Anthropic API response structure. Haiku 5.5 thinks adaptively by default, so content can
 * start with a `thinking` block; select the answer by block type, never by position.
 */
interface AnthropicResponse {
  content?: Array<{ type?: string; text?: string }>;
  stop_reason?: string;
}

/**
 * Calls Anthropic Claude API with the given parameters.
 *
 * Haiku 5.5 notes: temperature/top_p/top_k must be omitted, and thinking tokens count against
 * max_tokens, so leave generous headroom and steer depth with `effort` (default 'low' here).
 * Returns SUMMARY_UNAVAILABLE when no text came back (empty, max_tokens during thinking, refusal).
 */
export async function callAnthropic(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string,
  maxTokens: number = 2000,
  effort: AnthropicEffort = 'low',
  model: string = ANTHROPIC_MODEL
): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      output_config: { effort },
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  const requestId = response.headers.get('request-id');

  if (!response.ok) {
    const error = await response.text();
    throw new Error(
      `Anthropic API error: ${response.status} - ${error}${requestId ? ` (request ${requestId})` : ''}`
    );
  }

  const data: AnthropicResponse = await response.json();
  const text = (data.content ?? [])
    .filter(block => block.type === 'text')
    .map(block => block.text ?? '')
    .join('')
    .trim();

  if (!text) {
    console.warn(
      `Anthropic returned no text for ${model} (stop_reason=${data.stop_reason ?? 'unknown'}, request ${requestId})`
    );
    return SUMMARY_UNAVAILABLE;
  }
  return text;
}
