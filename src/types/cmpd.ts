// CMPD (Charlotte-Mecklenburg Police Department) Traffic Incidents API Types
// API: https://cmpdinfo.charlottenc.gov/api/v2.1/Traffic

/**
 * Raw traffic event from CMPD API
 */
export interface CMPDTrafficEvent {
  eventNo: string;
  eventDateTime: string; // ISO 8601 format (e.g., "2026-01-23T18:23:18")
  addedDateTimeString: string; // Compact format (e.g., "20260123182318ES")
  typeCode: string; // Short code (e.g., "AC-PI", "TC-MAL")
  typeDescription: string; // Full description (e.g., "ACCIDENT-PERSONAL INJURY")
  typeSubCode: string; // Sub-type code (e.g., "JST-OCC")
  typeSubDescription: string; // Sub-type description (e.g., "JUST OCCURRED")
  division: string; // CMPD division (e.g., "PROVIDENCE", "METRO")
  xCoordinate: number; // NC State Plane (NAD83) X coordinate
  yCoordinate: number; // NC State Plane (NAD83) Y coordinate
  latitude: number; // WGS84 latitude
  longitude: number; // WGS84 longitude
  address: string; // Street address or intersection
}

/**
 * Known CMPD traffic event type codes
 */
export const CMPD_EVENT_TYPE_CODES = {
  // Accidents
  'AC-PI': 'Accident - Personal Injury',
  'AC-PD': 'Accident - Property Damage',
  'AC-FI': 'Accident - Fatality Investigation',
  'AC-HR': 'Accident - Hit and Run',
  // Traffic Control
  'TC-MAL': 'Traffic Control Malfunction',
  'TC-SIG': 'Traffic Signal Issue',
  // Roadway Obstructions
  'RO-DEB': 'Roadway Obstruction - Debris',
  'RO-DV': 'Roadway Obstruction - Disabled Vehicle',
  'RO-HAZ': 'Roadway Obstruction - Hazard',
  // Other
  'TC-GEN': 'Traffic Control - General',
} as const;

/**
 * Incident type categories for severity mapping
 */
export type CMPDIncidentCategory = 'crash' | 'traffic_control' | 'obstruction' | 'other';

/**
 * Maps typeCode prefix to incident category
 */
export function getCMPDIncidentCategory(typeCode: string): CMPDIncidentCategory {
  if (typeCode.startsWith('AC-')) return 'crash';
  if (typeCode.startsWith('TC-')) return 'traffic_control';
  if (typeCode.startsWith('RO-')) return 'obstruction';
  return 'other';
}

/**
 * Charlotte-Mecklenburg bounds for filtering (same as used for Duke/NCDOT)
 */
export const CHARLOTTE_BOUNDS = {
  north: 35.51,
  south: 35.0,
  east: -80.53,
  west: -81.07,
};

/**
 * Checks if coordinates are within Charlotte-Mecklenburg bounds
 */
export function isWithinCharlotteBounds(latitude: number, longitude: number): boolean {
  return (
    latitude >= CHARLOTTE_BOUNDS.south &&
    latitude <= CHARLOTTE_BOUNDS.north &&
    longitude >= CHARLOTTE_BOUNDS.west &&
    longitude <= CHARLOTTE_BOUNDS.east
  );
}
