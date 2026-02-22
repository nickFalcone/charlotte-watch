import type { CFDTwitterResponse } from '../types/cfd';

const CFD_TWITTER_URL = '/api/cfd-twitter';

/**
 * Fetches Charlotte Fire Department incident alerts from official Twitter feed
 * via Pages Function. Returns enriched tweets with parsed locations and
 * geocoded coordinates when available.
 */
export async function fetchCFDTwitter(signal?: AbortSignal): Promise<CFDTwitterResponse['data']> {
  try {
    const response = await fetch(CFD_TWITTER_URL, { signal });
    if (!response.ok) return [];
    const data: CFDTwitterResponse = await response.json();
    return data.data ?? [];
  } catch (error) {
    console.error('Failed to fetch CFD Twitter:', error);
    return [];
  }
}
