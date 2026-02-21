import type { Env } from '../_lib/env';
import { isServiceAlertTweet, isWithinLast24Hours } from '../../src/utils/catsFilters';
import { jsonResponse, errorResponse, getCached, setCached } from '../_lib/responseHelpers';
import { fetchTwitter241Tweets, TwitterApiError } from '../_lib/twitter241';

const CATS_TWITTER_USER_ID = '868028628';
// 6h TTL: ~4 requests/day/endpoint, ~240/month total (quota: 500/month)
const CACHE_TTL_SECONDS = 21600;

export const onRequestGet: PagesFunction<Env> = async context => {
  const apiKey = context.env.RAPIDAPI_KEY;

  if (!apiKey) {
    return errorResponse('RAPIDAPI_KEY not configured', 500);
  }

  const CACHE_KEY = 'alerts:cats-twitter';
  const cached = await getCached(context.env.CACHE, CACHE_KEY);
  if (cached) {
    return jsonResponse(JSON.parse(cached), 200, CACHE_TTL_SECONDS);
  }

  try {
    const allTweets = await fetchTwitter241Tweets({
      userId: CATS_TWITTER_USER_ID,
      apiKey,
    });

    const catsTweets = allTweets.filter(
      t =>
        t.author?.id === CATS_TWITTER_USER_ID &&
        (t.type === 'tweet' || t.type === 'quote') &&
        isServiceAlertTweet(t.text) &&
        isWithinLast24Hours(t.createdAt)
    );

    const responseData = { data: catsTweets };
    const responseBody = JSON.stringify(responseData);
    await setCached(context.env.CACHE, CACHE_KEY, responseBody, CACHE_TTL_SECONDS);

    return jsonResponse(responseData, 200, CACHE_TTL_SECONDS);
  } catch (error) {
    console.error('CATS Twitter fetch error:', error);
    if (error instanceof TwitterApiError) {
      return errorResponse(`Twitter API returned ${error.status}`, error.status);
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(`Failed to fetch CATS Twitter: ${message}`, 500);
  }
};
