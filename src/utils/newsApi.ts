import type { NewsSearchResponse } from '../types/news';

const NEWS_URL = '/api/openwebninja-news';

export async function fetchCharlotteNews(signal?: AbortSignal): Promise<NewsSearchResponse> {
  const params = new URLSearchParams({
    query: 'charlotte north carolina',
    time_published: '1d',
  });
  const response = await fetch(`${NEWS_URL}?${params}`, { signal });

  if (!response.ok) {
    throw new Error(`News API error: ${response.status}`);
  }

  return response.json();
}
