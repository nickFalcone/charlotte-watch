/**
 * Shared parsing utilities for the twitter241 RapidAPI endpoint.
 * Extracts tweets from the deeply nested GraphQL timeline response format.
 */

const TWITTER241_HOST = 'twitter241.p.rapidapi.com';

export interface TwitterTweet {
  id: string;
  text: string;
  createdAt: string;
  author?: { id: string };
  type?: string;
}

export interface FetchTweetsOptions {
  userId: string;
  apiKey: string;
  count?: number;
}

/**
 * Fetches tweets from the twitter241 RapidAPI endpoint and normalizes them
 * into a flat TwitterTweet array.
 */
export async function fetchTwitter241Tweets(options: FetchTweetsOptions): Promise<TwitterTweet[]> {
  const { userId, apiKey, count = 20 } = options;
  const url = `https://${TWITTER241_HOST}/user-tweets?user=${userId}&count=${count}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'x-rapidapi-host': TWITTER241_HOST,
      'x-rapidapi-key': apiKey,
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new TwitterApiError(
      `Twitter API returned ${response.status}: ${errText}`,
      response.status
    );
  }

  const body = await response.json();
  return parseTimelineResponse(body);
}

export class TwitterApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = 'TwitterApiError';
  }
}

// --- Internal parsing ---

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Parses the twitter241 GraphQL timeline response into flat tweet objects.
 * Filters out promoted tweets, cursor entries, and non-tweet modules.
 */
function parseTimelineResponse(body: any): TwitterTweet[] {
  const instructions: any[] = body?.result?.timeline?.instructions ?? [];
  const tweets: TwitterTweet[] = [];

  for (const instruction of instructions) {
    const entries: any[] = instruction.entries ?? [];
    for (const entry of entries) {
      const tweet = extractTweetFromEntry(entry);
      if (tweet) {
        tweets.push(tweet);
      }
    }
  }

  return tweets;
}

/**
 * Extracts a normalized TwitterTweet from a timeline entry, or null if the
 * entry is not a regular (non-promoted) tweet.
 */
function extractTweetFromEntry(entry: any): TwitterTweet | null {
  const content = entry?.content;
  if (!content || content.__typename !== 'TimelineTimelineItem') return null;

  const itemContent = content.itemContent;
  if (!itemContent || itemContent.__typename !== 'TimelineTweet') return null;

  // Skip promoted tweets
  if (itemContent.promotedMetadata) return null;

  const tweetResult = itemContent.tweet_results?.result;
  if (!tweetResult) return null;

  // Handle tweets wrapped in TweetWithVisibilityResults
  const result =
    tweetResult.__typename === 'TweetWithVisibilityResults' ? tweetResult.tweet : tweetResult;

  const legacy = result?.legacy;
  if (!legacy) return null;

  const id = result.rest_id ?? legacy.id_str;
  const text = legacy.full_text;
  const createdAt = legacy.created_at;
  const authorId = legacy.user_id_str ?? result.core?.user_results?.result?.rest_id;

  if (!id || !text || !createdAt) return null;

  return {
    id,
    text,
    createdAt,
    author: authorId ? { id: authorId } : undefined,
    type: legacy.is_quote_status ? 'quote' : 'tweet',
  };
}
