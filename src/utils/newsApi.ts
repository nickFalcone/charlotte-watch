import type { ParsedNewsResponse } from '../types/news';

const NEWS_PARSED_URL = '/api/news-charlotte-parsed';

/**
 * Fetch parsed Charlotte news from KV cache (populated hourly by cache-warmer).
 */
export async function fetchCharlotteNewsParsed(signal?: AbortSignal): Promise<ParsedNewsResponse> {
  const response = await fetch(NEWS_PARSED_URL, { signal });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `News API error: ${response.status}`);
  }

  return response.json();
}
