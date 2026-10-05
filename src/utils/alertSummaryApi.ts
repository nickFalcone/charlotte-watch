import type { AlertSeverity, GenericAlert } from '../types/alerts';

/** Construction/lane-closure alerts older than this are excluded from the summary. */
const CONSTRUCTION_SUMMARY_MAX_AGE_MS = 48 * 60 * 60 * 1000;

/** CATS posts about a single elevator or escalator are not summary-worthy. */
const SINGLE_STATION_AMENITY_PATTERN = /\b(elevator|escalator)s?\b/i;
/** ...unless the post also describes a service-level disruption. */
const SERVICE_DISRUPTION_PATTERN = /suspend|no service|detour|delay|resum/i;

const SEVERITY_RANK: Record<AlertSeverity, number> = {
  critical: 0,
  high: 1,
  moderate: 2,
  minor: 3,
};

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
 * Alerts to send to the summarizer. Thresholds that used to live in the prompt are
 * applied here so the model only sees alerts worth mentioning:
 * - construction not updated in the last 48 hours
 * - FAA delays under 30 minutes (minor); ground stops and closures are critical
 * - CMPD incidents below critical (fatal, serious, major or multi-vehicle)
 * - CFD incidents below high (structure fires and road closures are critical/high)
 * - CATS single elevator/escalator outages
 */
export function filterAlertsForSummary(alerts: GenericAlert[]): GenericAlert[] {
  const cutoff = Date.now() - CONSTRUCTION_SUMMARY_MAX_AGE_MS;
  return alerts.filter(alert => {
    switch (alert.source) {
      case 'faa':
        return alert.severity !== 'minor';
      case 'cmpd':
        return alert.severity === 'critical';
      case 'cfd':
        return alert.severity === 'critical' || alert.severity === 'high';
      case 'cats': {
        const text = `${alert.title} ${alert.summary}`;
        return !(
          SINGLE_STATION_AMENITY_PATTERN.test(text) && !SERVICE_DISRUPTION_PATTERN.test(text)
        );
      }
      default:
        break;
    }
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
        a.updatedAt instanceof Date
          ? a.updatedAt.toISOString()
          : new Date(a.updatedAt).toISOString();
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
  const powerAlerts = alerts.filter(alert => alert.metadata?.source === 'duke');
  const others = alerts.filter(alert => alert.metadata?.source !== 'duke');
  const combinedPower = combinePowerAlerts(powerAlerts);
  return [...others.map(toAlertForSummary), ...(combinedPower ? [combinedPower] : [])];
}

function toIsoString(date: Date | string): string {
  return date instanceof Date ? date.toISOString() : new Date(date).toISOString();
}

function toAlertForSummary(alert: GenericAlert): AlertForSummary {
  return {
    title: alert.title,
    summary: alert.summary,
    severity: alert.severity,
    source: alert.source,
    category: alert.category,
    updatedAt: toIsoString(alert.updatedAt),
  };
}

/**
 * Collapse all Duke outages into one line with the total computed here, so the model
 * does not have to add up customer counts. Only named operation centers are listed
 * as locations; nothing is inferred for outages without one.
 */
export function combinePowerAlerts(alerts: GenericAlert[]): AlertForSummary | null {
  if (alerts.length === 0) return null;

  let total = 0;
  let allPlanned = true;
  let severity: AlertSeverity = 'minor';
  let latest = 0;
  const byArea = new Map<string, number>();

  for (const alert of alerts) {
    if (alert.metadata?.source !== 'duke') continue;
    const customers = alert.metadata.customersAffected;
    total += customers;
    allPlanned = allPlanned && alert.metadata.planned;
    if (SEVERITY_RANK[alert.severity] < SEVERITY_RANK[severity]) severity = alert.severity;
    latest = Math.max(latest, new Date(alert.updatedAt).getTime());
    const area = alert.metadata.operationCenter?.trim();
    if (area) byArea.set(area, (byArea.get(area) ?? 0) + customers);
  }

  const areas = [...byArea.entries()];
  let locationPart = '';
  if (areas.length === 1) {
    locationPart = ` in ${areas[0][0]}`;
  } else if (areas.length > 1) {
    locationPart = ` (${areas.map(([name, n]) => `${name} ${n.toLocaleString('en-US')}`).join(', ')})`;
  }
  const planPart = allPlanned ? '; planned maintenance' : '';

  return {
    title: allPlanned ? 'Planned Power Outage' : 'Power Outages',
    summary: `${total.toLocaleString('en-US')} Duke Energy customers without power${locationPart}${planPart}`,
    severity,
    source: 'duke',
    category: 'power',
    updatedAt: new Date(latest || Date.now()).toISOString(),
  };
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
