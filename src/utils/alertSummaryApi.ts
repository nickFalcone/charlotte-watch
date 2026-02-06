import type { GenericAlert } from '../types/alerts';

/** Construction/lane-closure alerts older than this are excluded from the summary. */
const CONSTRUCTION_SUMMARY_MAX_AGE_MS = 48 * 60 * 60 * 1000;

interface AlertForSummary {
  title: string;
  summary: string;
  severity: string;
  source: string;
  category: string;
  /** ISO 8601 timestamp; use for preferring most recent when alerts conflict */
  updatedAt: string;
}

export interface SummarizeResponse {
  summary: string;
  hash: string;
  generatedAt: string;
}

/**
 * True if the alert is NCDOT construction/maintenance/lane closure.
 * Used to exclude stale construction from the summary.
 */
function isConstructionAlert(alert: GenericAlert): boolean {
  if (alert.source !== 'ncdot') return false;
  const meta = alert.metadata;
  if (!meta || meta.source !== 'ncdot') return false;
  const type = meta.incidentType.toLowerCase();
  const cond = meta.condition.toLowerCase();
  const reason = meta.reason.toLowerCase();
  return (
    meta.inWorkZone ||
    /construction|maintenance/.test(type) ||
    /construction|maintenance/.test(cond) ||
    /construction|maintenance/.test(reason)
  );
}

/**
 * Alerts to send to the summarizer. Excludes construction alerts whose
 * last updated date is older than 48 hours (they are not newsworthy).
 */
export function filterAlertsForSummary(alerts: GenericAlert[]): GenericAlert[] {
  const cutoff = Date.now() - CONSTRUCTION_SUMMARY_MAX_AGE_MS;
  return alerts.filter(alert => {
    if (!isConstructionAlert(alert)) return true;
    const updatedMs =
      alert.updatedAt instanceof Date
        ? alert.updatedAt.getTime()
        : new Date(alert.updatedAt).getTime();
    return updatedMs >= cutoff;
  });
}

/**
 * Compute a stable hash from alerts for cache invalidation.
 * Uses alert IDs and severities to detect meaningful changes.
 */
export function computeAlertsHash(alerts: GenericAlert[]): string {
  if (alerts.length === 0) return 'empty';

  // Sort by ID for stable ordering; include all fields that affect summarization
  const sortedAlerts = [...alerts].sort((a, b) => a.id.localeCompare(b.id));
  const hashInput = sortedAlerts
    .map(a => {
      const updatedAt =
        a.updatedAt instanceof Date ? a.updatedAt.toISOString() : String(a.updatedAt);
      return `${a.id}:${a.severity}:${a.title}:${a.summary}:${updatedAt}`;
    })
    .join('|');

  // Simple hash function (djb2)
  let hash = 5381;
  for (let i = 0; i < hashInput.length; i++) {
    hash = (hash * 33) ^ hashInput.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

/**
 * Prepare alerts for the summarization API.
 * Extracts only the fields needed for summarization to minimize payload.
 * Includes all categories (weather, power, transit, traffic) so the summary
 * can mention major interstate congestion and accidents when present.
 */
function prepareAlertsForSummary(alerts: GenericAlert[]): AlertForSummary[] {
  return alerts.map(alert => {
    const updatedAt =
      alert.updatedAt instanceof Date
        ? alert.updatedAt.toISOString()
        : new Date(alert.updatedAt).toISOString();
    return {
      title: alert.title,
      summary: alert.summary,
      severity: alert.severity,
      source: alert.source,
      category: alert.category,
      updatedAt,
    };
  });
}

/**
 * Fetch an AI-generated summary of the alerts.
 * Uses Cloudflare Pages Function in production and dev:pages.
 * In dev without Pages Functions, the summary feature is disabled.
 */
export async function fetchAlertSummary(
  alerts: GenericAlert[],
  hash: string,
  signal?: AbortSignal
): Promise<SummarizeResponse> {
  const API_URL = '/api/summarize-alerts';

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      alerts: prepareAlertsForSummary(alerts),
      hash,
    }),
    signal,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API error: ${response.status}`);
  }

  return response.json();
}
