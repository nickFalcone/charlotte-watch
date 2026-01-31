import type { GenericAlert } from '../types/alerts';

interface AlertForSummary {
  title: string;
  summary: string;
  severity: string;
  source: string;
  category: string;
}

export interface SummarizeResponse {
  summary: string;
  hash: string;
  generatedAt: string;
}

/**
 * Compute a stable hash from alerts for cache invalidation.
 * Uses alert IDs and severities to detect meaningful changes.
 */
export function computeAlertsHash(alerts: GenericAlert[]): string {
  if (alerts.length === 0) return 'empty';

  // Sort by ID for stable ordering, include severity to detect changes
  const sortedAlerts = [...alerts].sort((a, b) => a.id.localeCompare(b.id));
  const hashInput = sortedAlerts.map(a => `${a.id}:${a.severity}`).join('|');

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
  return alerts.map(alert => ({
    title: alert.title,
    summary: alert.summary,
    severity: alert.severity,
    source: alert.source,
    category: alert.category,
  }));
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
