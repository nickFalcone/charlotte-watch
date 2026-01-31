// Duke Energy Outage API types
// Based on actual API response structure

export interface DukeOutage {
  sourceEventNumber: string;
  deviceLatitudeLocation: number;
  deviceLongitudeLocation: number;
  /** API may send a number, or a string like "Forsyth-NC:834". Prefer customersAffectedSum when present. */
  customersAffectedNumber?: number | string;
  /** Numeric total; use this when present instead of parsing customersAffectedNumber. */
  customersAffectedSum?: number;
  /** May be 'planned', 'unplanned', or missing entirely. */
  outageCause?: 'planned' | 'unplanned' | string;
  convexHull?: { lat: number; lng: number }[] | null;
  /** Human-readable cause, e.g. "Unknown at this time.", "Animal contact." */
  causeDescription?: string;
  /** Crew status, e.g. "Crew Working". API field name is crewStatTxt. */
  crewStatTxt?: string | null;
  estimatedRestorationTime?: string;
  /** Operation center name, e.g. "Kannapolis", "Charlotte". Useful for location context. */
  operationCenterName?: string;
}

/**
 * Resolves the number of customers affected from API fields.
 * Prefers customersAffectedSum, then numeric customersAffectedNumber, then parses "County-ST:N" strings.
 */
export function getDukeCustomersAffected(o: DukeOutage): number {
  if (typeof o.customersAffectedSum === 'number') return o.customersAffectedSum;
  if (typeof o.customersAffectedNumber === 'number') return o.customersAffectedNumber;
  const s = String(o.customersAffectedNumber ?? '');
  const m = s.match(/:(\d+)$/);
  return m ? parseInt(m[1], 10) : 0;
}

export interface DukeOutageResponse {
  data: DukeOutage[];
  errorMessages: string[];
}

// Mecklenburg County bounding box (approximate)
export const MECKLENBURG_BOUNDS = {
  north: 35.51,
  south: 35.0,
  east: -80.53,
  west: -81.07,
} as const;

// Severity thresholds for customer counts (aligned with mapDukeOutageSeverity in types/alerts.ts)
// Card: show if >= MIN_CARD; Summary (BLUF): include bullet only if at least one outage >= MIN_SUMMARY
export const DUKE_SEVERITY_THRESHOLDS = {
  /** Minimum customers to show an alert card (under this: no card, not in summary) */
  MIN_CARD: 10,
  /** Minimum customers for a single outage to be included in the AI summary bullet (100+ = moderate+) */
  MIN_SUMMARY: 100,
} as const;
