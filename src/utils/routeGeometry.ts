/**
 * Utility for generating polylines from NCDOT mile marker data
 * using static reference route geometry.
 */

import {
  CHARLOTTE_ROUTE_GEOMETRY,
  type RouteGeometry,
  type RoutePoint,
} from '../data/charlotteRouteGeometry';

/** Lazy-built lookup map for O(1) route access */
let routeMap: Map<string, RouteGeometry> | null = null;

function getRouteMap(): Map<string, RouteGeometry> {
  if (!routeMap) {
    routeMap = new Map();
    for (const route of CHARLOTTE_ROUTE_GEOMETRY) {
      routeMap.set(route.routeId, route);
    }
  }
  return routeMap;
}

/**
 * Look up a route's geometry by its normalized display name
 * (must match getCharlotteRoadDisplay() output).
 */
export function getRouteGeometry(routeId: string): RouteGeometry | null {
  return getRouteMap().get(routeId) ?? null;
}

/**
 * Binary search for the insertion index where `mile` would fit
 * in the sorted points array.
 */
function findInsertionIndex(points: RoutePoint[], mile: number): number {
  let lo = 0;
  let hi = points.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (points[mid].mile < mile) {
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return lo;
}

/**
 * Linearly interpolate a point at a given mile marker between
 * two adjacent reference points.
 */
function interpolateAt(p1: RoutePoint, p2: RoutePoint, mile: number): [number, number] {
  const segLen = p2.mile - p1.mile;
  if (segLen <= 0) return [p1.lat, p1.lng];
  const t = (mile - p1.mile) / segLen;
  return [p1.lat + t * (p2.lat - p1.lat), p1.lng + t * (p2.lng - p1.lng)];
}

/**
 * Extract the polyline segment between two mile markers.
 *
 * Returns [lat, lng][] array suitable for shapePoints, or null if the
 * route is not found or the mile marker range is invalid.
 *
 * Handles reversed mile markers (start > end) by normalizing internally.
 * Out-of-range values are clamped to route bounds.
 */
export function getPolylineForMileRange(
  routeId: string,
  startMile: number,
  endMile: number
): [number, number][] | null {
  const route = getRouteGeometry(routeId);
  if (!route || route.points.length < 2) return null;

  // Normalize: ensure low <= high
  const low = Math.min(startMile, endMile);
  const high = Math.max(startMile, endMile);

  // Clamp to route bounds
  const clampedLow = Math.max(low, route.minMile);
  const clampedHigh = Math.min(high, route.maxMile);
  if (clampedLow >= clampedHigh) return null;

  const result: [number, number][] = [];

  // Find start position
  const startIdx = findInsertionIndex(route.points, clampedLow);

  // Interpolate start point if it falls between reference points
  if (startIdx > 0 && startIdx < route.points.length) {
    const prev = route.points[startIdx - 1];
    const next = route.points[startIdx];
    if (clampedLow > prev.mile && clampedLow < next.mile) {
      result.push(interpolateAt(prev, next, clampedLow));
    }
  }

  // Add all reference points within the range
  for (let i = startIdx; i < route.points.length; i++) {
    const p = route.points[i];
    if (p.mile > clampedHigh) break;
    if (p.mile >= clampedLow) {
      result.push([p.lat, p.lng]);
    }
  }

  // Interpolate end point if it falls between reference points
  const endIdx = findInsertionIndex(route.points, clampedHigh);
  if (endIdx > 0 && endIdx < route.points.length) {
    const prev = route.points[endIdx - 1];
    const next = route.points[endIdx];
    if (clampedHigh > prev.mile && clampedHigh < next.mile) {
      result.push(interpolateAt(prev, next, clampedHigh));
    }
  }

  return result.length >= 2 ? result : null;
}

/**
 * Generate a short polyline segment around a single mile marker.
 * Creates a visible line +/- 0.3 miles around the point.
 *
 * Returns [lat, lng][] or null if the route is not found.
 */
export function getPolylineForSingleMile(routeId: string, mile: number): [number, number][] | null {
  const padding = 0.3;
  return getPolylineForMileRange(routeId, mile - padding, mile + padding);
}
