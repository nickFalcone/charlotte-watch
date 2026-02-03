import type { Env } from './env';

/**
 * Shared helpers for AI summarization endpoints
 */

const CACHE_TTL_SECONDS = 900; // 15 minutes
const CACHE_CONTROL_HEADER = 'private, max-age=900';

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
  console.error(`${message}:`, err.message, cause || '');

  // Enhanced error message for network failures
  let errorMessage = err.message;
  if (err.message === 'fetch failed') {
    errorMessage = cause
      ? `fetch failed: ${cause}`
      : 'Network error calling AI provider. Check API key and connectivity.';
  }

  return new Response(
    JSON.stringify({
      error: message,
      message: errorMessage,
    }),
    {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Anthropic API response structure
 */
interface AnthropicResponse {
  content: Array<{ text?: string }>;
}

/**
 * Calls Anthropic Claude API with the given parameters
 */
export async function callAnthropic(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string,
  maxTokens: number = 150,
  model: string = 'claude-3-5-haiku-latest'
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
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${error}`);
  }

  const data: AnthropicResponse = await response.json();
  return data.content[0]?.text?.trim() || 'Unable to generate summary.';
}
