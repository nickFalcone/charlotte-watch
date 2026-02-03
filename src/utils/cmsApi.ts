import type { CMSTweet, CMSTwitterResponse } from '../types/cms';

const CMS_TWITTER_URL = '/api/cms-twitter';

/**
 * Fetches CMS service alerts from official Twitter (X) feed via Pages Function.
 * Used for time-sensitive school announcements (closures, delays, emergencies).
 * Returns empty array on failure so the app still shows other alerts.
 */
export async function fetchCMSTwitter(signal?: AbortSignal): Promise<CMSTweet[]> {
  try {
    const response = await fetch(CMS_TWITTER_URL, { signal });
    if (!response.ok) return [];
    const data: CMSTwitterResponse = await response.json();
    return data.data ?? [];
  } catch (error) {
    console.error('Failed to fetch CMS Twitter:', error);
    return [];
  }
}
