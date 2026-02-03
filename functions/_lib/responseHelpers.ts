/**
 * Shared response construction helpers for Cloudflare Pages Functions.
 * Provides consistent JSON response formatting and caching patterns.
 */

/**
 * Creates a JSON response with standard headers.
 *
 * @param data - Data to serialize as JSON
 * @param status - HTTP status code (default: 200)
 * @param cacheMaxAge - Cache-Control max-age in seconds (optional)
 * @returns Response object with JSON content type
 */
export function jsonResponse(data: unknown, status: number = 200, cacheMaxAge?: number): Response {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (cacheMaxAge !== undefined) {
    headers['Cache-Control'] = `private, max-age=${cacheMaxAge}`;
  }

  return new Response(JSON.stringify(data), {
    status,
    headers,
  });
}

/**
 * Creates an error response with consistent formatting.
 *
 * @param error - Error message or Error object
 * @param status - HTTP status code (default: 500)
 * @returns Response object with error message
 */
export function errorResponse(error: string | Error, status: number = 500): Response {
  const message = error instanceof Error ? error.message : error;
  return jsonResponse({ error: message }, status);
}

/**
 * Attempts to retrieve cached data from Cloudflare KV.
 * Returns null if cache miss or error.
 *
 * @param kv - Cloudflare KV namespace
 * @param key - Cache key
 * @returns Cached string or null
 */
export async function getCached(kv: KVNamespace, key: string): Promise<string | null> {
  try {
    return await kv.get(key);
  } catch (e) {
    console.error('KV cache read error:', e);
    return null;
  }
}

/**
 * Stores data in Cloudflare KV cache.
 * Silently fails on error (logs to console).
 *
 * @param kv - Cloudflare KV namespace
 * @param key - Cache key
 * @param value - Value to cache
 * @param ttlSeconds - Time to live in seconds
 */
export async function setCached(
  kv: KVNamespace,
  key: string,
  value: string,
  ttlSeconds: number
): Promise<void> {
  try {
    await kv.put(key, value, { expirationTtl: ttlSeconds });
  } catch (e) {
    console.error('KV cache write error:', e);
  }
}
