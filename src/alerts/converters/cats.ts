import type { CATSTweet } from '../../types/cats';
import type { GenericAlert } from '../../types/alerts';
import { ALERT_SEVERITY_CONFIG } from '../../types/alerts';
import type { AlertSeverity } from '../../types/alerts';
import { stripEmojis, stripTcoLinks } from '../../utils/textUtils';
import { firstLine, TITLE_MAX_LEN } from '../../utils/twitterHelpers';

function severityFromTweetText(text: string): AlertSeverity {
  const lower = text.toLowerCase();
  if (
    lower.includes('suspend') ||
    lower.includes('no service') ||
    lower.includes('suspended') ||
    lower.includes('will suspend')
  )
    return 'critical';
  if (
    lower.includes('detour') ||
    lower.includes('delay') ||
    lower.includes('delays') ||
    lower.includes('road closed')
  )
    return 'moderate';
  return 'minor';
}

const CATS_TWITTER_PROFILE = 'CATSRideTransit';

export function convertCATSTweetToGeneric(tweet: CATSTweet): GenericAlert {
  const text = stripTcoLinks(stripEmojis(tweet.text));
  const severity = severityFromTweetText(text);
  const title = firstLine(text, TITLE_MAX_LEN);
  const updatedAt = tweet.createdAt ? new Date(tweet.createdAt) : new Date();
  const tweetUrl = `https://x.com/${CATS_TWITTER_PROFILE}/status/${tweet.id}`;

  return {
    id: `cats-twitter-${tweet.id}`,
    source: 'cats',
    category: 'transit',
    severity,
    title,
    summary: text,
    description: text,
    affectedArea: 'Charlotte Area Transit System',
    updatedAt,
    url: tweetUrl,
    metadata: {
      source: 'cats',
      routes: [],
      effect: 'ANNOUNCEMENT',
      cause: 'TWITTER',
      displaySeverity: ALERT_SEVERITY_CONFIG[severity].label,
    },
  };
}

export function convertCATSTweetsToGeneric(tweets: CATSTweet[]): GenericAlert[] {
  return tweets.map(convertCATSTweetToGeneric);
}
