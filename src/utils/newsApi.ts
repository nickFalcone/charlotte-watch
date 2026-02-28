import type { ParsedNewsEvent, ParsedNewsResponse } from '../types/news';

const NEWS_PARSED_URL = '/api/news-charlotte-parsed';

/**
 * Sort news events: most-sourced first, then newest source date descending.
 * Safe against empty sources arrays and invalid/missing dates.
 */
export function sortNewsEvents<T extends ParsedNewsEvent>(events: T[]): T[] {
  const newestMs = (e: T): number => {
    if (e.sources.length === 0) return 0;
    const timestamps = e.sources
      .map(s => new Date(s.published_datetime_utc).getTime())
      .filter(n => isFinite(n));
    return timestamps.length > 0 ? Math.max(...timestamps) : 0;
  };
  return events.slice().sort((a, b) => {
    if (b.sources.length !== a.sources.length) return b.sources.length - a.sources.length;
    return newestMs(b) - newestMs(a);
  });
}

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
