import type { DukeOutage, DukeOutageResponse } from '../types/duke';
import {
  MECKLENBURG_BOUNDS,
  DUKE_SEVERITY_THRESHOLDS,
  getDukeCustomersAffected,
} from '../types/duke';
import { dedupeBy } from './dedupe';

// Use proxy in dev (auth injected by Vite proxy), Pages Function in production
const DUKE_OUTAGE_URL = import.meta.env.DEV
  ? '/proxy/duke/outage-maps/v1/outages?jurisdiction=DEC'
  : '/api/duke-outages';

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
 * Filters outages to only include those meeting minimum pipeline threshold.
 * Keeps small outages (10+) so they can combine with others in the same area.
 */
function filterByMinimumCustomers(outages: DukeOutage[]): DukeOutage[] {
  return outages.filter(
    outage => getDukeCustomersAffected(outage) >= DUKE_SEVERITY_THRESHOLDS.MIN_PIPELINE
  );
}

/**
 * Fetches Duke Energy outages for Mecklenburg County
 * Returns empty array on error to avoid breaking the alerts widget
 */
export async function fetchDukeOutages(signal?: AbortSignal): Promise<DukeOutage[]> {
  try {
    // Auth is handled by Vite proxy (dev) or Cloudflare Function (prod)
    const response = await fetch(DUKE_OUTAGE_URL, { signal });

    if (!response.ok) {
      throw new Error(`Duke Energy API returned ${response.status}: ${response.statusText}`);
    }

    const json: DukeOutageResponse = await response.json();
    const allOutages = json.data || [];
    const mecklenburgOutages = filterMecklenburgOutages(allOutages);
    const dedupedOutages = dedupeBy(mecklenburgOutages, outage => outage.sourceEventNumber);
    const significantOutages = filterByMinimumCustomers(dedupedOutages);

    return significantOutages;
  } catch (error) {
    console.error('Failed to fetch Duke Energy outages:', error);
    throw error;
  }
}
