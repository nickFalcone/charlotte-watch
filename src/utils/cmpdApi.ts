import type { CMPDTrafficEvent } from '../types/cmpd';
import { isWithinCharlotteBounds } from '../types/cmpd';

const CMPD_TRAFFIC_URL = 'https://cmpdinfo.charlottenc.gov/api/v2.1/Traffic';

/**
 * Filters events to only include those within Charlotte-Mecklenburg bounds
 */
function filterCharlotteBoundsEvents(events: CMPDTrafficEvent[]): CMPDTrafficEvent[] {
  return events.filter(
    event =>
      event.latitude && event.longitude && isWithinCharlotteBounds(event.latitude, event.longitude)
  );
}

/**
 * Deduplicates events by event number
 */
function dedupeEvents(events: CMPDTrafficEvent[]): CMPDTrafficEvent[] {
  const seen = new Set<string>();
  return events.filter(event => {
    if (seen.has(event.eventNo)) {
      return false;
    }
    seen.add(event.eventNo);
    return true;
  });
}

/**
 * Fetches CMPD real-time traffic incidents
 * Returns filtered and deduplicated events within Charlotte-Mecklenburg area
 */
export async function fetchCMPDTrafficEvents(signal?: AbortSignal): Promise<CMPDTrafficEvent[]> {
  try {
    const response = await fetch(CMPD_TRAFFIC_URL, {
      headers: {
        Accept: 'application/json',
      },
      signal,
    });

    if (!response.ok) {
      throw new Error(`CMPD API returned ${response.status}: ${response.statusText}`);
    }

    const events: CMPDTrafficEvent[] = await response.json();

    // Filter to Charlotte bounds and deduplicate
    const filteredEvents = filterCharlotteBoundsEvents(events);
    const dedupedEvents = dedupeEvents(filteredEvents);

    return dedupedEvents;
  } catch (error) {
    console.error('Failed to fetch CMPD traffic events:', error);
    throw error;
  }
}
