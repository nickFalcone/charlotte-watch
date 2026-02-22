import type { Env } from '../_lib/env';
import { isCFDIncidentTweet, isWithinLast24Hours } from '../../src/utils/cfdFilters';
import { extractLocationFromTweet } from '../../src/utils/cfdAddressParser';
import { jsonResponse, errorResponse, getCached, setCached } from '../_lib/responseHelpers';
import { fetchTwitter241Tweets, TwitterApiError } from '../_lib/twitter241';
import { geocodeAddress } from '../_lib/hereGeocode';

const CFD_TWITTER_USER_ID = '23398654';
// 6h TTL: ~4 requests/day/endpoint, ~240/month total (quota: 500/month)
const CACHE_TTL_SECONDS = 21600;

export interface CFDTweetEnriched {
  id: string;
  text: string;
  createdAt: string;
  author?: { id: string };
  type?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
}

export const onRequestGet: PagesFunction<Env> = async context => {
  const apiKey = context.env.RAPIDAPI_KEY;

  if (!apiKey) {
    return errorResponse('RAPIDAPI_KEY not configured', 500);
  }

  const CACHE_KEY = 'alerts:cfd-twitter';
  const cached = await getCached(context.env.CACHE, CACHE_KEY);
  if (cached) {
    return jsonResponse(JSON.parse(cached), 200, CACHE_TTL_SECONDS);
  }

  try {
    const allTweets = await fetchTwitter241Tweets({
      userId: CFD_TWITTER_USER_ID,
      apiKey,
    });

    const cfdTweets = allTweets.filter(
      t =>
        t.author?.id === CFD_TWITTER_USER_ID &&
        (t.type === 'tweet' || t.type === 'quote') &&
        isCFDIncidentTweet(t.text) &&
        isWithinLast24Hours(t.createdAt)
    );

    const hereKey = context.env.HERE_API_KEY;
    const results = await Promise.allSettled(
      cfdTweets.map(async t => {
        const location = extractLocationFromTweet(t.text);
        const result: CFDTweetEnriched = {
          id: t.id,
          text: t.text,
          createdAt: t.createdAt,
          author: t.author,
          type: t.type,
          location,
        };
        if (location && hereKey) {
          const coords = await geocodeAddress(location, hereKey);
          if (coords) {
            result.latitude = coords.latitude;
            result.longitude = coords.longitude;
          }
        }
        return result;
      })
    );

    const enriched: CFDTweetEnriched[] = results.map((outcome, i) => {
      if (outcome.status === 'fulfilled') {
        return outcome.value;
      }
      const t = cfdTweets[i];
      console.error('CFD geocoding failed for tweet', t.id, outcome.reason);
      return {
        id: t.id,
        text: t.text,
        createdAt: t.createdAt,
        author: t.author,
        type: t.type,
        location: extractLocationFromTweet(t.text),
      };
    });

    const responseData = { data: enriched };
    const responseBody = JSON.stringify(responseData);
    await setCached(context.env.CACHE, CACHE_KEY, responseBody, CACHE_TTL_SECONDS);

    return jsonResponse(responseData, 200, CACHE_TTL_SECONDS);
  } catch (error) {
    console.error('CFD Twitter fetch error:', error);
    if (error instanceof TwitterApiError) {
      return errorResponse(`Twitter API returned ${error.status}`, error.status);
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(`Failed to fetch CFD Twitter: ${message}`, 500);
  }
};
