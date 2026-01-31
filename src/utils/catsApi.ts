import type {
  CATSAlertsResponse,
  CATSEntity,
  CATSInformedEntity,
  CATSTwitterResponse,
} from '../types/cats';
import { LYNX_LIGHT_RAIL_ROUTES } from '../types/cats';

// Use Pages Function in production, dev proxy in development
const CATS_ALERTS_URL = import.meta.env.DEV
  ? '/proxy/cats/api/v2/rest/feeds/f-dnq-charlotteareatransitsystem~rt/download_latest_rt/alerts.json'
  : '/api/cats-alerts';

const CATS_TWITTER_URL = '/api/cats-twitter';

/**
 * Checks if a route ID corresponds to LYNX light rail services
 */
export function isLynxLightRailRoute(routeId?: string): boolean {
  if (!routeId) return false;
  return (LYNX_LIGHT_RAIL_ROUTES as readonly string[]).includes(routeId);
}

/**
 * Checks if an alert affects LYNX light rail routes
 */
export function affectsLynxLightRail(alert: CATSEntity): boolean {
  return (
    alert.alert.informedEntity?.some((entity: CATSInformedEntity) =>
      isLynxLightRailRoute(entity.routeId)
    ) || false
  );
}

/**
 * Fetches CATS alerts from transit.land API via Netlify function
 * Filters to only include LYNX light rail alerts
 */
export async function fetchCATSAlerts(signal?: AbortSignal): Promise<CATSEntity[]> {
  try {
    const response = await fetch(CATS_ALERTS_URL, { signal });

    if (!response.ok) {
      throw new Error(`CATS API returned ${response.status}: ${response.statusText}`);
    }

    const data: CATSAlertsResponse = await response.json();

    // Filter to only LYNX light rail alerts
    const lynxAlerts = data.entity.filter(affectsLynxLightRail);

    return lynxAlerts;
  } catch (error) {
    console.error('Failed to fetch CATS alerts:', error);
    throw error;
  }
}

/**
 * Fetches CATS service alerts from official Twitter (X) feed via Pages Function.
 * Used to augment GTFS-RT alerts with announcements (e.g. Blue Line, Gold Line suspensions).
 * Returns empty array on failure so the app still shows GTFS alerts.
 */
export async function fetchCATSTwitter(signal?: AbortSignal): Promise<CATSTwitterResponse['data']> {
  try {
    const response = await fetch(CATS_TWITTER_URL, { signal });
    if (!response.ok) return [];
    const data: CATSTwitterResponse = await response.json();
    return data.data ?? [];
  } catch (error) {
    console.error('Failed to fetch CATS Twitter:', error);
    return [];
  }
}
