import type { CMPDTrafficEvent } from '../types/cmpd';
import { isWithinCharlotteBounds } from '../types/cmpd';

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
  return {
    eventNo: raw.eventNo ?? raw.EventNo ?? '',
    eventDateTime: raw.eventDateTime ?? raw.EventDateTime ?? '',
    addedDateTimeString: raw.addedDateTimeString ?? raw.AddedDateTimeString ?? '',
    typeCode: raw.typeCode ?? raw.TypeCode ?? '',
    typeDescription: raw.typeDescription ?? raw.TypeDescription ?? '',
    typeSubCode: raw.typeSubCode ?? raw.TypeSubCode ?? '',
    typeSubDescription: raw.typeSubDescription ?? raw.TypeSubDescription ?? '',
    division: raw.division ?? raw.Division ?? '',
    xCoordinate: raw.xCoordinate ?? raw.XCoordinate ?? 0,
    yCoordinate: raw.yCoordinate ?? raw.YCoordinate ?? 0,
    latitude: raw.latitude ?? raw.Latitude ?? 0,
    longitude: raw.longitude ?? raw.Longitude ?? 0,
    address: raw.address ?? raw.Address ?? '',
  };
}

/**
 * Filters events to only include those within Charlotte-Mecklenburg bounds
 */
function filterCharlotteBoundsEvents(events: CMPDTrafficEvent[]): CMPDTrafficEvent[] {
  return events.filter(
    event =>
      event.latitude != null &&
      event.longitude != null &&
      isWithinCharlotteBounds(event.latitude, event.longitude)
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

    const data = await response.json();
    const rawList: CMPDTrafficEventRaw[] = Array.isArray(data)
      ? data
      : Array.isArray((data as { value?: unknown[] }).value)
        ? (data as { value: CMPDTrafficEventRaw[] }).value
        : Array.isArray((data as { results?: unknown[] }).results)
          ? (data as { results: CMPDTrafficEventRaw[] }).results
          : Array.isArray((data as { data?: unknown[] }).data)
            ? (data as { data: CMPDTrafficEventRaw[] }).data
            : Array.isArray((data as { incidents?: unknown[] }).incidents)
              ? (data as { incidents: CMPDTrafficEventRaw[] }).incidents
              : [];
    const events: CMPDTrafficEvent[] = rawList.map(normalizeEvent);

    // Filter to Charlotte bounds and deduplicate
    const filteredEvents = filterCharlotteBoundsEvents(events);
    const dedupedEvents = dedupeEvents(filteredEvents);

    return dedupedEvents;
  } catch (error) {
    console.error('Failed to fetch CMPD traffic events:', error);
    throw error;
  }
}
