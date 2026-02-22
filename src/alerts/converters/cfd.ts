import type { CFDTweet } from '../../types/cfd';
import type { GenericAlert } from '../../types/alerts';
import { ALERT_SEVERITY_CONFIG } from '../../types/alerts';
import type { AlertSeverity } from '../../types/alerts';
import { stripEmojis } from '../../utils/textUtils';
import { firstLine, TITLE_MAX_LEN } from '../../utils/twitterHelpers';

const CFD_TWITTER_PROFILE = 'CharlotteFD';

/** Determine severity based on tweet content */
function severityFromTweetText(text: string): AlertSeverity {
  const lower = text.toLowerCase();

  // Critical: structure fires, apartment fires, fire showing
  if (
    lower.includes('structure fire') ||
    lower.includes('apartment fire') ||
    lower.includes('fire showing') ||
    lower.includes('heavy fire')
  ) {
    return 'critical';
  }

  // High: tractor trailer fire, road closures
  if (
    lower.includes('tractor trailer fire') ||
    lower.includes('road closed') ||
    lower.includes('is closed')
  ) {
    return 'high';
  }

  // Moderate: delays, alternate route
  if (lower.includes('alternate route') || lower.includes('delays')) {
    return 'moderate';
  }

  return 'minor';
}

/** Convert CFD Twitter tweet to generic alert format */
export function convertCFDTweetToGeneric(tweet: CFDTweet): GenericAlert {
  const text = stripEmojis(tweet.text);
  const severity = severityFromTweetText(text);
  const title = firstLine(text, TITLE_MAX_LEN);
  const updatedAt = tweet.createdAt ? new Date(tweet.createdAt) : new Date();
  const tweetUrl = `https://x.com/${CFD_TWITTER_PROFILE}/status/${tweet.id}`;

  const hasCoords =
    typeof tweet.latitude === 'number' &&
    typeof tweet.longitude === 'number' &&
    Number.isFinite(tweet.latitude) &&
    Number.isFinite(tweet.longitude);

  const metadata = {
    source: 'cfd' as const,
    tweetId: tweet.id,
    ...(tweet.location && { location: tweet.location }),
    ...(hasCoords && { latitude: tweet.latitude!, longitude: tweet.longitude! }),
    displaySeverity: ALERT_SEVERITY_CONFIG[severity].label,
  };

  return {
    id: `cfd-twitter-${tweet.id}`,
    source: 'cfd',
    category: 'other',
    severity,
    title,
    summary: text,
    description: text,
    affectedArea: tweet.location ?? 'Charlotte',
    updatedAt,
    url: tweetUrl,
    metadata,
  };
}

export function convertCFDTweetsToGeneric(tweets: CFDTweet[]): GenericAlert[] {
  return tweets.map(convertCFDTweetToGeneric);
}
