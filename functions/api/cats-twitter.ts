import type { Env } from '../_lib/env';

const TWITTER_API_HOST = 'twitter-api47.p.rapidapi.com';
const CATS_TWITTER_USER_ID = '868028628';
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

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

/** Keep tweets that mention service status (suspensions, delays, Blue/Gold Line, etc.) */
function isServiceAlertTweet(text: string): boolean {
  const lower = text.toLowerCase();
  const serviceTerms =
    /suspend|suspended|blue line|gold line|bus service|operational|on schedule|delays?|detour|road closed|no service|micro service|micro |tracks|blocked|ctc|station|route|reopening|winter weather|road conditions|express bus|streetcar/i;
  const excludeTerms =
    /live now|meeting|fare study|fare modernization|hosting a |join us|be there to share|want to learn more about fare|book demo/i;
  return serviceTerms.test(lower) && !excludeTerms.test(lower);
}

function isWithinLast12Hours(createdAt: string): boolean {
  const ts = new Date(createdAt).getTime();
  return ts > Date.now() - TWELVE_HOURS_MS;
}

export const onRequestGet: PagesFunction<Env> = async context => {
  const apiKey = context.env.RAPIDAPI_KEY;

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'RAPIDAPI_KEY not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const CACHE_KEY = 'alerts:cats-twitter';
  try {
    const cached = await context.env.CACHE.get(CACHE_KEY);
    if (cached) {
      return new Response(cached, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': `private, max-age=${CACHE_TTL_SECONDS}`,
        },
      });
    }
  } catch (e) {
    console.error('KV cache read error:', e);
  }

  const url = `https://${TWITTER_API_HOST}/v3/user/tweets?userId=${CATS_TWITTER_USER_ID}`;

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
      console.error('CATS Twitter API error:', response.status, errText);
      return new Response(JSON.stringify({ error: `Twitter API returned ${response.status}` }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body: TwitterApiResponse = await response.json();
    const allTweets = body.data ?? [];
    const catsTweets = allTweets.filter(
      t =>
        t.author?.id === CATS_TWITTER_USER_ID &&
        (t.type === 'tweet' || t.type === 'quote') &&
        isServiceAlertTweet(t.text) &&
        isWithinLast12Hours(t.createdAt)
    );

    const responseBody = JSON.stringify({ data: catsTweets });

    try {
      await context.env.CACHE.put(CACHE_KEY, responseBody, { expirationTtl: CACHE_TTL_SECONDS });
    } catch (e) {
      console.error('KV cache write error:', e);
    }

    return new Response(responseBody, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `private, max-age=${CACHE_TTL_SECONDS}`,
      },
    });
  } catch (error) {
    console.error('CATS Twitter fetch error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch CATS Twitter',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
