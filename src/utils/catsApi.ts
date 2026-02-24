import type { CATSTweet, CATSTwitterResponse } from '../types/cats';

const CATS_TWITTER_URL = '/api/cats-twitter';

/**
 * Fetches CATS service alerts from official Twitter (X) feed via Pages Function.
 * Returns empty array on failure so the app degrades gracefully.
 */
export async function fetchCATSTwitter(signal?: AbortSignal): Promise<CATSTweet[]> {
  try {
    const response = await fetch(CATS_TWITTER_URL, { signal });
    if (!response.ok) return [];
    const data: CATSTwitterResponse = await response.json();
    return data.data ?? [];
  } catch (error) {
    console.error('Failed to fetch CATS Twitter:', error);
    return [];
  }
}
