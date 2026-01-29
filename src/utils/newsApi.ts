import type { NewsSearchResponse, ParsedNewsResponse } from '../types/news';

const NEWS_URL = '/api/openwebninja-news';
const NEWS_PARSED_URL = '/api/news-charlotte-parsed';

export async function fetchCharlotteNews(signal?: AbortSignal): Promise<NewsSearchResponse> {
  const params = new URLSearchParams({
    country: 'US',
    lang: 'en',
    query: 'charlotte north carolina',
    time_published: '1d',
    limit: '100',
  });
  const response = await fetch(`${NEWS_URL}?${params}`, { signal });

  if (!response.ok) {
    throw new Error(`News API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Fetch parsed Charlotte news (fetch + AI parse pipeline).
 * Intended to be called at most twice per day (use staleTime/refetchInterval ~12h).
 */
export async function fetchCharlotteNewsParsed(signal?: AbortSignal): Promise<ParsedNewsResponse> {
  const response = await fetch(NEWS_PARSED_URL, { signal });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `News API error: ${response.status}`);
  }

  return response.json();
}
