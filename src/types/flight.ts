// ADS-B aircraft types (ADSBexchange v2 format, served by adsb.fi / adsb.lol via /api/adsb-aircraft)

/** One aircraft as returned by /api/adsb-aircraft. Units: feet, knots, feet/minute. */
export interface AdsbAircraft {
  hex: string;
  /** Callsign, padded with trailing spaces by the feed */
  flight?: string;
  /** Registration */
  r?: string;
  /** ICAO aircraft type code (e.g. A321) */
  t?: string;
  /** Aircraft type description (adsb.fi only) */
  desc?: string;
  /** Operator (adsb.fi only) */
  ownOp?: string;
  lat?: number;
  lon?: number;
  /** Barometric altitude in feet, or the string "ground" */
  alt_baro?: number | 'ground';
  /** Ground speed in knots */
  gs?: number;
  /** True track in degrees */
  track?: number;
  /** Barometric vertical rate in feet/minute */
  baro_rate?: number;
  /** Geometric vertical rate in feet/minute (fallback for baro_rate) */
  geom_rate?: number;
  squawk?: string;
  /** "none" or an emergency status such as "general" or "lifeguard" */
  emergency?: string;
  /** Seconds since any message was last received from this aircraft */
  seen?: number;
  /** Seconds since the position was last updated */
  seen_pos?: number;
}

export interface AdsbResponse {
  /** Name of the provider that answered */
  source?: string;
  /** Provider timestamp in milliseconds since the epoch */
  now?: number;
  ac: AdsbAircraft[];
}

export interface Aircraft {
  icao24: string;
  callsign: string;
  latitude: number;
  longitude: number;
  /** Meters */
  altitude: number;
  /** Meters per second */
  velocity: number;
  heading: number;
  /** Meters per second */
  verticalRate: number;
  onGround: boolean;
  squawk: string | null;
  registration: string | null;
  /** ICAO aircraft type code */
  aircraftType: string | null;
  operator: string | null;
  /** Emergency status, null when none is declared */
  emergency: string | null;
  /** Unix seconds when position was last updated; null if no recent position report. */
  timePosition: number | null;
  lastContact: Date;
}

// FAA Airport Status Types

export interface FAAGroundDelay {
  airportCode: string;
  reason: string;
  averageDelay: string;
  maximumDelay: string;
}

export interface FAADeparture {
  minimum: string;
  maximum: string;
  trend: string;
}

export interface FAAArrival {
  minimum: string;
  maximum: string;
  trend: string;
}

export interface FAAGeneralDelay {
  airportCode: string;
  reason: string;
  departure?: FAADeparture;
  arrival?: FAAArrival;
}

export interface FAAClosure {
  airportCode: string;
  start: string;
  reopens: string;
}

export interface FAAGroundStop {
  airportCode: string;
  reason: string;
  endTime: string;
}

export interface FAADelayType {
  name: string;
  ground_delay_list?: FAAGroundDelay[];
  delays?: FAAGeneralDelay[];
  closures?: FAAClosure[];
  ground_stop_list?: FAAGroundStop[];
}

export interface FAAStatusResponse {
  airport_status_information: {
    update_time: string;
    delay_types: FAADelayType[];
  };
}

// Airport configuration
export interface AirportConfig {
  code: string;
  name: string;
  latitude: number;
  longitude: number;
  /** Radius of the aircraft query around the airport, in nautical miles */
  radiusNm: number;
}

// KCLT - Charlotte Douglas International Airport
export const KCLT_AIRPORT: AirportConfig = {
  code: 'CLT',
  name: 'Charlotte Douglas International',
  latitude: 35.214,
  longitude: -80.9431,
  // 108 NM is 200 km, matching the outer range ring on the radar map
  radiusNm: 108,
};

// Flight category based on altitude and vertical rate
export type FlightPhase =
  | 'ground'
  | 'departing'
  | 'climbing'
  | 'cruise'
  | 'descending'
  | 'approaching';

export function getFlightPhase(aircraft: Aircraft): FlightPhase {
  const altitudeFeet = aircraft.altitude * 3.28084; // Convert meters to feet
  const velocityKnots = (aircraft.velocity || 0) * 1.94384; // Convert m/s to knots
  const verticalRateFpm = (aircraft.verticalRate || 0) * 196.85; // Convert m/s to fpm

  // Override onGround flag if altitude or velocity indicate flight
  // If altitude > 100ft OR velocity > 20 knots, consider it airborne
  const isActuallyAirborne = altitudeFeet > 100 || velocityKnots > 20;

  // Only consider on ground if the flag says so AND altitude/velocity confirm it
  if (aircraft.onGround && !isActuallyAirborne) {
    return 'ground';
  }

  // If we get here, the aircraft is airborne
  if (altitudeFeet < 3000) {
    if (verticalRateFpm > 500) return 'departing';
    if (verticalRateFpm < -500) return 'approaching';
    // Low altitude but not climbing/descending much - could be departing or approaching
    if (verticalRateFpm > 100) return 'departing';
    if (verticalRateFpm < -100) return 'approaching';
    return 'departing'; // Default to departing for low altitude flights
  }

  if (verticalRateFpm > 300) return 'climbing';
  if (verticalRateFpm < -300) return 'descending';
  return 'cruise';
}

export const FLIGHT_PHASE_COLORS: Record<FlightPhase, string> = {
  ground: '#6b7280',
  departing: '#22c55e',
  climbing: '#3b82f6',
  cruise: '#8b5cf6',
  descending: '#f59e0b',
  approaching: '#ef4444',
};

export const FLIGHT_PHASE_LABELS: Record<FlightPhase, string> = {
  ground: 'On Ground',
  departing: 'Departing',
  climbing: 'Climbing',
  cruise: 'Cruising',
  descending: 'Descending',
  approaching: 'Approaching',
};

// AeroDataBox FIDS schedule types (GetAirportFlightsRelative endpoint)

export interface AeroDataBoxSchedule {
  departures: AeroDataBoxFlight[];
  arrivals: AeroDataBoxFlight[];
}

export interface AeroDataBoxFlight {
  departure: AeroDataBoxFlightLeg;
  arrival: AeroDataBoxFlightLeg;
  number: string;
  callSign?: string;
  status: string;
  codeshareStatus: string;
  isCargo: boolean;
  aircraft: AeroDataBoxAircraft;
  airline: AeroDataBoxAirline;
}

export interface AeroDataBoxFlightLeg {
  airport?: AeroDataBoxAirport;
  scheduledTime: AeroDataBoxTimePair;
  revisedTime?: AeroDataBoxTimePair;
  runwayTime?: AeroDataBoxTimePair;
  terminal?: string;
  runway?: string;
  quality: string[];
}

export interface AeroDataBoxAirport {
  icao: string;
  iata: string;
  name: string;
  countryCode: string;
  timeZone: string;
}

export interface AeroDataBoxTimePair {
  utc: string;
  local: string;
}

export interface AeroDataBoxAircraft {
  reg?: string;
  modeS?: string;
  model: string;
}

export interface AeroDataBoxAirline {
  name: string;
  iata: string;
  icao: string;
}
