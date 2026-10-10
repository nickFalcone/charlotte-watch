/**
 * Pure helpers for the alerts summary prompt. Shared by the Cloudflare Function
 * (functions/api/summarize-alerts.ts) and unit tests, so keep this file free of
 * DOM and browser dependencies.
 */

export interface AlertInput {
  title: string;
  summary: string;
  severity: string;
  source: string;
  category: string;
  /** ISO 8601; prefer alerts with later updatedAt when same service has conflicting status */
  updatedAt?: string;
}

const EASTERN_TIME_ZONE = 'America/New_York';

const easternFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: EASTERN_TIME_ZONE,
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZoneName: 'short',
});

/** e.g. "Wed, Feb 4, 12:00 PM EST". Returns undefined for missing or invalid input. */
export function formatEasternTime(input: Date | string | undefined): string | undefined {
  if (!input) return undefined;
  const date = input instanceof Date ? input : new Date(input);
  if (isNaN(date.getTime())) return undefined;
  return easternFormatter.format(date).replace(' at ', ', ');
}

/** Returns ms since epoch, or 0 if missing/invalid (sorts as oldest). */
export function getSortTimestamp(updatedAt?: string): number {
  if (!updatedAt) return 0;
  const ts = Date.parse(updatedAt);
  return isNaN(ts) ? 0 : ts;
}

/** Alert text comes from external feeds; strip angle brackets so it cannot close our tags. */
function sanitize(text: string): string {
  return text.replace(/[<>]/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Build the user message: current Eastern time plus the alerts (most recently updated
 * first) wrapped in <alerts> tags. Timestamps are rendered in Eastern time so the model
 * never has to convert from UTC.
 */
export function buildAlertsUserPrompt(alerts: AlertInput[], now: Date = new Date()): string {
  if (alerts.length === 0) {
    return 'No active alerts.';
  }

  const sorted = [...alerts].sort(
    (a, b) => getSortTimestamp(b.updatedAt) - getSortTimestamp(a.updatedAt)
  );

  const lines = sorted.map((alert, i) => {
    const updated = formatEasternTime(alert.updatedAt);
    const timePart = updated ? ` [updated ${updated}]` : '';
    return `${i + 1}. [${sanitize(alert.severity).toUpperCase()}] ${sanitize(alert.source).toUpperCase()}: ${sanitize(alert.title)} - ${sanitize(alert.summary)}${timePart}`;
  });

  return `Current time: ${formatEasternTime(now)}

<alerts count="${sorted.length}">
${lines.join('\n')}
</alerts>`;
}

/**
 * Guarantee the bullet format regardless of what the model returned: one "- " bullet
 * per non-empty line, with common alternative markers normalized.
 */
export function normalizeBullets(text: string): string {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => `- ${line.replace(/^([-*•]\s*)+/, '')}`)
    .join('\n');
}
