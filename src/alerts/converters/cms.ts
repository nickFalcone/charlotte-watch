import type { CMSTweet } from '../../types/cms';
import type { GenericAlert } from '../../types/alerts';
import { ALERT_SEVERITY_CONFIG } from '../../types/alerts';
import type { AlertSeverity } from '../../types/alerts';
import { stripEmojis } from '../../utils/textUtils';
import { isCMSAlertTweet } from '../../utils/cmsFilters';
import { firstLine, TITLE_MAX_LEN } from '../../utils/twitterHelpers';

const CMS_TWITTER_PROFILE = 'CharMeckSchools';

/** Determine severity based on tweet content */
function severityFromTweetText(text: string): AlertSeverity {
  const lower = text.toLowerCase();

  // Critical: emergencies, active shooter, lockdowns
  if (
    lower.includes('emergency') ||
    lower.includes('active shooter') ||
    lower.includes('lockdown')
  ) {
    return 'critical';
  }

  // High: closures, delays
  if (lower.includes('closed') || lower.includes('canceled') || lower.includes('delay')) {
    return 'high';
  }

  // Moderate: remote learning
  if (lower.includes('remote')) {
    return 'moderate';
  }

  return 'minor';
}

// Re-export filtering function for use by consumers of this module
export { isCMSAlertTweet } from '../../utils/cmsFilters';

/** Convert CMS Twitter tweet to generic alert format */
export function convertCMSTweetToGeneric(tweet: CMSTweet): GenericAlert {
  const text = stripEmojis(tweet.text);
  const severity = severityFromTweetText(text);
  const title = firstLine(text, TITLE_MAX_LEN);
  const updatedAt = tweet.createdAt ? new Date(tweet.createdAt) : new Date();
  const tweetUrl = `https://x.com/${CMS_TWITTER_PROFILE}/status/${tweet.id}`;

  return {
    id: `cms-twitter-${tweet.id}`,
    source: 'cms',
    category: 'other',
    severity,
    title,
    summary: text,
    description: text,
    affectedArea: 'Charlotte-Mecklenburg Schools',
    updatedAt,
    url: tweetUrl,
    metadata: {
      source: 'cms',
      tweetId: tweet.id,
      displaySeverity: ALERT_SEVERITY_CONFIG[severity].label,
    },
  };
}

export function convertCMSTweetsToGeneric(tweets: CMSTweet[]): GenericAlert[] {
  // Filter before conversion to only include time-sensitive alerts
  const filteredTweets = tweets.filter(tweet => isCMSAlertTweet(tweet.text));
  return filteredTweets.map(convertCMSTweetToGeneric);
}
