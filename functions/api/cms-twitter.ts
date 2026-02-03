import type { Env } from '../_lib/env';

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

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

/**
 * Check if tweet is about a U.S. holiday closure (comprehensive filtering).
 * Returns true if the tweet appears to be a routine holiday closure announcement.
 */
function isHolidayClosure(text: string): boolean {
  const lower = text.toLowerCase();

  // Holiday names
  const holidayNames =
    /martin luther king|mlk day|christmas|thanksgiving|memorial day|labor day|independence day|july 4th|president'?s day|new year/i;

  // Date patterns for common school breaks
  const datePatterns = /dec\.? 2[2-6]|dec\.? 24-26|jan\.? 1-2|jan\.? 19/i;

  // Generic closure patterns combined with holiday context
  const closurePattern =
    /(closed|will be closed|schools closed|schools? and|offices? will be closed)/i;

  // If it mentions a holiday name AND a closure pattern, it's likely a holiday announcement
  if (holidayNames.test(text) && closurePattern.test(lower)) {
    return true;
  }

  // If it mentions specific holiday date ranges, it's likely a holiday announcement
  if (datePatterns.test(text)) {
    return true;
  }

  return false;
}

/**
 * Keep tweets that are time-sensitive school alerts (emergencies, closures, delays).
 * Exclude routine holiday announcements.
 */
function isCMSAlertTweet(text: string): boolean {
  const lower = text.toLowerCase();

  // Must contain at least one time-sensitive keyword
  const alertKeywords = /emergency|active shooter|lockdown|closed|canceled|delay|remote/i;

  if (!alertKeywords.test(lower)) {
    return false;
  }

  // Exclude holiday closures
  if (isHolidayClosure(text)) {
    return false;
  }

  return true;
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

  const CACHE_KEY = 'alerts:cms-twitter';
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
      return new Response(JSON.stringify({ error: `Twitter API returned ${response.status}` }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body: TwitterApiResponse = await response.json();
    const allTweets = body.data ?? [];
    const cmsTweets = allTweets.filter(
      t =>
        t.author?.id === CMS_TWITTER_USER_ID &&
        (t.type === 'tweet' || t.type === 'quote') &&
        isCMSAlertTweet(t.text) &&
        isWithinLast12Hours(t.createdAt)
    );

    const responseBody = JSON.stringify({ data: cmsTweets });

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
    console.error('CMS Twitter fetch error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch CMS Twitter',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
