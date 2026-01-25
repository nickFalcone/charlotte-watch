// OpenSky Network ADS-B Types

export interface OpenSkyStateVector {
  icao24: string;
  callsign: string | null;
  originCountry: string;
  timePosition: number | null;
  lastContact: number;
  longitude: number | null;
  latitude: number | null;
  baroAltitude: number | null;
  onGround: boolean;
  velocity: number | null;
  trueTrack: number | null;
  verticalRate: number | null;
  sensors: number[] | null;
  geoAltitude: number | null;
  squawk: string | null;
  spi: boolean;
  positionSource: number;
  category: number;
}

export interface OpenSkyResponse {
  time: number;
  states: (string | number | boolean | null | number[])[][] | null;
}

export interface Aircraft {
  icao24: string;
  callsign: string;
  originCountry: string;
  latitude: number;
  longitude: number;
  altitude: number;
  velocity: number;
  heading: number;
  verticalRate: number;
  onGround: boolean;
  squawk: string | null;
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
  boundingBox: {
    lamin: number;
    lamax: number;
    lomin: number;
    lomax: number;
  };
}

// KCLT - Charlotte Douglas International Airport
export const KCLT_AIRPORT: AirportConfig = {
  code: 'CLT',
  name: 'Charlotte Douglas International',
  latitude: 35.214,
  longitude: -80.9431,
  boundingBox: {
    // Maximum 1-credit bounding box (exactly 25 sq degrees)
    // Covers ~278km x 228km at 35° latitude
    // Includes: CLT, GSO, RDU airports + regional coverage
    lamin: 32.714, // 2.5° south of CLT (35.214 - 2.5 = 32.714)
    lamax: 37.714, // 2.5° north of CLT (35.214 + 2.5 = 37.714)
    lomin: -83.4431, // 2.5° west of CLT (-80.9431 - 2.5 = -83.4431)
    lomax: -78.4431, // 2.5° east of CLT (-80.9431 + 2.5 = -78.4431)
  },
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
