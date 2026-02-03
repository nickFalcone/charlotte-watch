import type { CMSTweet } from '../../types/cms';
import type { GenericAlert } from '../../types/alerts';
import { ALERT_SEVERITY_CONFIG } from '../../types/alerts';
import type { AlertSeverity } from '../../types/alerts';
import { stripEmojis } from '../../utils/textUtils';

const TITLE_MAX_LEN = 80;
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

/** Extract first line of text, truncate if too long */
function firstLine(s: string, maxLen: number): string {
  const line = s.split(/\r?\n/)[0]?.trim() ?? s;
  if (line.length <= maxLen) return line;
  return line.slice(0, maxLen - 3) + '...';
}

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
 * Check if tweet is a time-sensitive CMS alert.
 * Must contain relevant keywords AND must NOT be a holiday closure.
 */
export function isCMSAlertTweet(text: string): boolean {
  const lower = text.toLowerCase();

  // Must contain at least one of these keywords
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
