/**
 * HERE Traffic API v7 Types
 *
 * Types for real-time traffic flow data from HERE Traffic API.
 * This file is part of the HERE integration feature and can be
 * safely deleted if the feature is removed.
 */

/**
 * A point on the map with latitude and longitude
 */
export interface HerePoint {
  lat: number;
  lng: number;
}

/**
 * A link in a road segment shape
 */
export interface HereShapeLink {
  points: HerePoint[];
  length: number;
}

/**
 * Shape of a road segment
 */
export interface HereShape {
  links: HereShapeLink[];
}

/**
 * Location information for a road segment
 */
export interface HereLocation {
  description?: string;
  length: number;
  shape: HereShape;
}

/**
 * Traffic traversability status
 */
export type HereTraversability = 'open' | 'closed' | 'reversibleNotRoutable';

/**
 * Sub-segment flow (when segment has mixed open/closed parts)
 */
export interface HereSubSegment {
  length: number;
  speed?: number;
  speedUncapped?: number;
  freeFlow?: number;
  jamFactor?: number;
  traversability?: HereTraversability;
  junctionTraversability?: string;
  confidence?: number;
}

/**
 * Current traffic flow data for a road segment.
 * When traversability is "closed", HERE omits speed; use subSegments to derive.
 */
export interface HereCurrentFlow {
  /** Current speed in m/s (omitted when closed) */
  speed?: number;
  /** Current speed without capping in m/s */
  speedUncapped?: number;
  /** Free flow (uncongested) speed in m/s */
  freeFlow?: number;
  /** Jam factor from 0 (free flow) to 10 (road blocked) */
  jamFactor: number;
  /** Confidence level 0-1 */
  confidence?: number;
  /** Road traversability status */
  traversability?: HereTraversability;
  junctionTraversability?: string;
  /** Finer-grained open/closed; some entries omit speed when closed */
  subSegments?: HereSubSegment[];
}

/**
 * A single traffic flow result
 */
export interface HereFlowResult {
  location: HereLocation;
  currentFlow: HereCurrentFlow;
}

/**
 * Response from HERE Traffic Flow API
 */
export interface HereFlowResponse {
  sourceUpdated: string;
  results: HereFlowResult[];
}

/**
 * Route definition for traffic monitoring
 */
export interface HereRoute {
  id: string;
  name: string;
  /** HERE "in" geospatial filter: "circle:lat,lng;r=radius_m" or "bbox:south,west,north,east" */
  in: string;
}

/**
 * Processed flow data for a route
 */
export interface HereRouteFlow {
  routeId: string;
  routeName: string;
  /** Average jam factor across all segments (0-10) */
  avgJamFactor: number;
  /** Maximum jam factor found */
  maxJamFactor: number;
  /** Average speed in mph */
  avgSpeedMph: number;
  /** Free flow speed in mph */
  freeFlowSpeedMph: number;
  /** Average percentage slower than free flow */
  congestionPercent: number;
  /** Maximum congestion percent from any single segment */
  maxCongestionPercent: number;
  /** Number of road segments analyzed */
  segmentCount: number;
  /** Timestamp of data */
  timestamp: string;
  /** Centroid of segment shapes (for map link); from location.shape.links[].points */
  centerLat?: number;
  centerLng?: number;
}

/**
 * Jam factor severity thresholds
 */
export const JAM_FACTOR_THRESHOLDS = {
  /** Below this is considered normal traffic */
  NORMAL: 3,
  /** Above this is moderate congestion */
  MODERATE: 5,
  /** Above this is heavy congestion */
  HEAVY: 7,
  /** Above this is severe congestion */
  SEVERE: 9,
} as const;

/**
 * Convert meters per second to miles per hour
 */
export function metersPerSecToMph(mps: number): number {
  return mps * 2.237;
}
