import type { CATSEntity, CATSTweet } from '../../types/cats';
import type { GenericAlert } from '../../types/alerts';
import { mapCATSSeverity, ALERT_SEVERITY_CONFIG } from '../../types/alerts';
import type { AlertSeverity } from '../../types/alerts';
import { isLynxLightRailRoute } from '../../utils/catsApi';

const TITLE_MAX_LEN = 80;

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

function firstLine(s: string, maxLen: number): string {
  const line = s.split(/\r?\n/)[0]?.trim() ?? s;
  if (line.length <= maxLen) return line;
  return line.slice(0, maxLen - 3) + '...';
}

// Convert CATS alert to generic alert format
export function convertCATSAlertToGeneric(alert: CATSEntity): GenericAlert {
  const severity = mapCATSSeverity({
    effect: alert.alert.effect,
    cause: alert.alert.cause,
  });

  // Get affected routes (only LYNX routes since we filter for them)
  const affectedRoutes = alert.alert.informedEntity
    .map(entity => entity.routeId)
    .filter(routeId => routeId !== undefined)
    .filter(routeId => isLynxLightRailRoute(routeId));

  // Build title
  const effectText =
    alert.alert.effectDetail?.translation?.[0]?.text ||
    alert.alert.effect.replace(/_/g, ' ').toLowerCase();
  const causeText =
    alert.alert.causeDetail?.translation?.[0]?.text ||
    alert.alert.cause.replace(/_/g, ' ').toLowerCase();
  const title = `${effectText} - ${causeText}`;

  // Build summary with affected routes
  const routesText =
    affectedRoutes.length > 0 ? `Routes: ${affectedRoutes.join(', ')}` : 'LYNX Light Rail';
  const headerText = alert.alert.headerText?.translation?.[0]?.text || title;
  const summary = `${headerText} • ${routesText}`;

  // Build description
  const descriptionText =
    alert.alert.descriptionText?.translation?.[0]?.text || 'Transit service alert';

  // Get active period
  const activePeriod = alert.alert.activePeriod[0];
  const startTime = activePeriod?.start ? new Date(activePeriod.start * 1000) : undefined;
  const endTime = activePeriod?.end ? new Date(activePeriod.end * 1000) : undefined;

  return {
    id: `cats-${alert.id}`,
    source: 'cats',
    category: 'transit',
    severity,
    title,
    summary,
    description: descriptionText,
    affectedArea: 'Charlotte LYNX Light Rail',
    startTime,
    endTime,
    updatedAt: new Date(),
    metadata: {
      source: 'cats',
      routes: affectedRoutes,
      effect: alert.alert.effect,
      cause: alert.alert.cause,
      displaySeverity: ALERT_SEVERITY_CONFIG[severity].label,
    },
  };
}

// Convert all CATS alerts to generic format
export function convertCATSAlertsToGeneric(alerts: CATSEntity[]): GenericAlert[] {
  return alerts.map(convertCATSAlertToGeneric);
}

const CATS_TWITTER_PROFILE = 'CATSRideTransit';

// Convert CATS Twitter tweet to generic alert format (source still 'cats', category 'transit')
export function convertCATSTweetToGeneric(tweet: CATSTweet): GenericAlert {
  const severity = severityFromTweetText(tweet.text);
  const title = firstLine(tweet.text, TITLE_MAX_LEN);
  const updatedAt = tweet.createdAt ? new Date(tweet.createdAt) : new Date();
  const tweetUrl = `https://x.com/${CATS_TWITTER_PROFILE}/status/${tweet.id}`;

  return {
    id: `cats-twitter-${tweet.id}`,
    source: 'cats',
    category: 'transit',
    severity,
    title,
    summary: tweet.text,
    description: tweet.text,
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
