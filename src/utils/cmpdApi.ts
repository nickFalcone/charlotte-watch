import type { CMPDTrafficEvent } from '../types/cmpd';
import { isWithinCharlotteBounds } from '../types/cmpd';
import { dedupeBy } from './dedupe';

const CMPD_TRAFFIC_URL = 'https://cmpdinfo.charlottenc.gov/api/v2.1/Traffic';

/** API may return PascalCase (EventNo, Latitude); normalize to camelCase. */
interface CMPDTrafficEventRaw {
  eventNo?: string;
  EventNo?: string;
  eventDateTime?: string;
  EventDateTime?: string;
  addedDateTimeString?: string;
  AddedDateTimeString?: string;
  typeCode?: string;
  TypeCode?: string;
  typeDescription?: string;
  TypeDescription?: string;
  typeSubCode?: string;
  TypeSubCode?: string;
  typeSubDescription?: string;
  TypeSubDescription?: string;
  division?: string;
  Division?: string;
  xCoordinate?: number;
  XCoordinate?: number;
  yCoordinate?: number;
  YCoordinate?: number;
  latitude?: number;
  Latitude?: number;
  longitude?: number;
  Longitude?: number;
  address?: string;
  Address?: string;
}

function normalizeEvent(raw: CMPDTrafficEventRaw): CMPDTrafficEvent {
  // Helper to get coordinate value - undefined if not a valid number
  const getCoord = (val: number | undefined): number | undefined => {
    return typeof val === 'number' && Number.isFinite(val) ? val : undefined;
  };

  return {
    eventNo: raw.eventNo ?? raw.EventNo ?? '',
    eventDateTime: raw.eventDateTime ?? raw.EventDateTime ?? '',
    addedDateTimeString: raw.addedDateTimeString ?? raw.AddedDateTimeString ?? '',
    typeCode: raw.typeCode ?? raw.TypeCode ?? '',
    typeDescription: raw.typeDescription ?? raw.TypeDescription ?? '',
    typeSubCode: raw.typeSubCode ?? raw.TypeSubCode ?? '',
    typeSubDescription: raw.typeSubDescription ?? raw.TypeSubDescription ?? '',
    division: raw.division ?? raw.Division ?? '',
    // Use undefined instead of 0 for missing coordinates to avoid (0,0) false positives
    xCoordinate: getCoord(raw.xCoordinate ?? raw.XCoordinate),
    yCoordinate: getCoord(raw.yCoordinate ?? raw.YCoordinate),
    latitude: getCoord(raw.latitude ?? raw.Latitude),
    longitude: getCoord(raw.longitude ?? raw.Longitude),
    address: raw.address ?? raw.Address ?? '',
  };
}

/**
 * Filters events to only include those within Charlotte-Mecklenburg bounds.
 * Also filters out events with missing or invalid coordinates.
 */
function filterCharlotteBoundsEvents(events: CMPDTrafficEvent[]): CMPDTrafficEvent[] {
  return events.filter(event => {
    // Require valid coordinates (not undefined, not null, must be finite numbers)
    if (
      event.latitude == null ||
      event.longitude == null ||
      !Number.isFinite(event.latitude) ||
      !Number.isFinite(event.longitude)
    ) {
      return false;
    }

    // Check if within Charlotte-Mecklenburg bounds
    return isWithinCharlotteBounds(event.latitude, event.longitude);
  });
}

/**
 * Extracts the array of traffic events from the CMPD API response.
 * The API may return data in multiple formats:
 * - Direct array: [...]
 * - Wrapped in .value: { value: [...] }
 * - Wrapped in .results: { results: [...] }
 * - Wrapped in .data: { data: [...] }
 * - Wrapped in .incidents: { incidents: [...] }
 */
function extractEventArray(data: unknown): CMPDTrafficEventRaw[] {
  // Check if data is directly an array
  if (Array.isArray(data)) {
    return data;
  }

  // Check if data is an object with one of the known wrapper keys
  if (data && typeof data === 'object') {
    const possibleKeys = ['value', 'results', 'data', 'incidents'] as const;
    for (const key of possibleKeys) {
      const value = (data as Record<string, unknown>)[key];
      if (Array.isArray(value)) {
        return value;
      }
    }
  }

  // Return empty array if no valid format found
  return [];
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

    const data = await response.json();
    const rawList = extractEventArray(data);
    const events: CMPDTrafficEvent[] = rawList.map(normalizeEvent);

    // Filter to Charlotte bounds and deduplicate
    const filteredEvents = filterCharlotteBoundsEvents(events);
    const dedupedEvents = dedupeBy(filteredEvents, event => event.eventNo);

    return dedupedEvents;
  } catch (error) {
    console.error('Failed to fetch CMPD traffic events:', error);
    throw error;
  }
}
