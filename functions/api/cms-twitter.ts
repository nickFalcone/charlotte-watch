import type { Env } from '../_lib/env';
import { isCMSAlertTweet, isWithinLast24Hours } from '../../src/utils/cmsFilters';
import { jsonResponse, errorResponse, getCached, setCached } from '../_lib/responseHelpers';

const TWITTER_API_HOST = 'twitter-api47.p.rapidapi.com';
const CMS_TWITTER_USER_ID = '199341683';
// 12h TTL: at most ~2 requests/day to stay under 100 requests/month
// https://rapidapi.com/restocked-gAGxip8a_/api/twitter-api47
const CACHE_TTL_SECONDS = 43200;

interface TwitterTweet {
  id: string;
  text: string;
  createdAt: string;
  author?: { id: string };
  type?: string;
}

interface TwitterApiResponse {
  data?: TwitterTweet[];
}

export const onRequestGet: PagesFunction<Env> = async context => {
  const apiKey = context.env.RAPIDAPI_KEY;

  if (!apiKey) {
    return errorResponse('RAPIDAPI_KEY not configured', 500);
  }

  const CACHE_KEY = 'alerts:cms-twitter';
  const cached = await getCached(context.env.CACHE, CACHE_KEY);
  if (cached) {
    return jsonResponse(JSON.parse(cached), 200, CACHE_TTL_SECONDS);
  }

  const url = `https://${TWITTER_API_HOST}/v3/user/tweets?userId=${CMS_TWITTER_USER_ID}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': TWITTER_API_HOST,
        'x-rapidapi-key': apiKey,
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('CMS Twitter API error:', response.status, errText);
      return errorResponse(`Twitter API returned ${response.status}`, response.status);
    }

    const body: TwitterApiResponse = await response.json();
    const allTweets = body.data ?? [];
    const cmsTweets = allTweets.filter(
      t =>
        t.author?.id === CMS_TWITTER_USER_ID &&
        (t.type === 'tweet' || t.type === 'quote') &&
        isCMSAlertTweet(t.text) &&
        isWithinLast24Hours(t.createdAt)
    );

    const responseData = { data: cmsTweets };
    const responseBody = JSON.stringify(responseData);
    await setCached(context.env.CACHE, CACHE_KEY, responseBody, CACHE_TTL_SECONDS);

    return jsonResponse(responseData, 200, CACHE_TTL_SECONDS);
  } catch (error) {
    console.error('CMS Twitter fetch error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(`Failed to fetch CMS Twitter: ${message}`, 500);
  }
};
