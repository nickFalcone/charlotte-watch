import type { DukeOutage, DukeOutageResponse } from '../types/duke';
import {
  MECKLENBURG_BOUNDS,
  DUKE_SEVERITY_THRESHOLDS,
  getDukeCustomersAffected,
} from '../types/duke';

// Use proxy in dev (auth injected by Vite proxy), Netlify function in production
const DUKE_OUTAGE_URL = import.meta.env.DEV
  ? '/proxy/duke/outage-maps/v1/outages?jurisdiction=DEC'
  : '/.netlify/functions/duke-outages';

/**
 * Checks if coordinates fall within Mecklenburg County bounds
 */
function isInMecklenburgCounty(lat: number, lng: number): boolean {
  return (
    lat >= MECKLENBURG_BOUNDS.south &&
    lat <= MECKLENBURG_BOUNDS.north &&
    lng >= MECKLENBURG_BOUNDS.west &&
    lng <= MECKLENBURG_BOUNDS.east
  );
}

/**
 * Filters outages to only include those within Mecklenburg County
 */
function filterMecklenburgOutages(outages: DukeOutage[]): DukeOutage[] {
  return outages.filter(outage =>
    isInMecklenburgCounty(outage.deviceLatitudeLocation, outage.deviceLongitudeLocation)
  );
}

/**
 * Deduplicates outages by sourceEventNumber
 */
function dedupeOutages(outages: DukeOutage[]): DukeOutage[] {
  const seen = new Set<string>();
  return outages.filter(outage => {
    if (seen.has(outage.sourceEventNumber)) {
      return false;
    }
    seen.add(outage.sourceEventNumber);
    return true;
  });
}

/**
 * Filters outages to only include those meeting minimum customer threshold
 */
function filterByMinimumCustomers(outages: DukeOutage[]): DukeOutage[] {
  return outages.filter(
    outage => getDukeCustomersAffected(outage) >= DUKE_SEVERITY_THRESHOLDS.minor
  );
}

/**
 * Fetches Duke Energy outages for Mecklenburg County
 * Returns empty array on error to avoid breaking the alerts widget
 */
export async function fetchDukeOutages(signal?: AbortSignal): Promise<DukeOutage[]> {
  try {
    // Auth is handled by Vite proxy (dev) or Netlify function (prod)
    const response = await fetch(DUKE_OUTAGE_URL, { signal });

    if (!response.ok) {
      throw new Error(`Duke Energy API returned ${response.status}: ${response.statusText}`);
    }

    const json: DukeOutageResponse = await response.json();
    const allOutages = json.data || [];
    const mecklenburgOutages = filterMecklenburgOutages(allOutages);
    const dedupedOutages = dedupeOutages(mecklenburgOutages);
    const significantOutages = filterByMinimumCustomers(dedupedOutages);

    return significantOutages;
  } catch (error) {
    console.error('Failed to fetch Duke Energy outages:', error);
    throw error;
  }
}
