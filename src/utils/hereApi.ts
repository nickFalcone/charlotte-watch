/**
 * HERE Traffic API Client (standard Traffic, not Advanced Traffic)
 *
 * Uses in=circle, locationReferencing=shape, minJamFactor only. We do NOT use
 * advancedFeatures, useRefReplacements, or in=corridor — that would use
 * Advanced Traffic (2,500 free/mo). Standard Traffic: 5,000 free/mo.
 * This file is part of the HERE integration feature and can be
 * safely deleted if the feature is removed.
 */

import type { HereFlowResponse, HereFlowResult, HereRoute, HereRouteFlow } from '../types/here';
import { metersPerSecToMph, JAM_FACTOR_THRESHOLDS } from '../types/here';

/**
 * Charlotte traffic flow coverage.
 *
 * Using a single metro-wide circle (HERE's most reliable format per docs).
 * bbox repeatedly returned empty; circle works in other regions. If this
 * still returns empty, the HERE project may not include Traffic Flow, or
 * the area has no coverage.
 */
export const CHARLOTTE_PRIORITY_ROUTES: HereRoute[] = [
  {
    id: 'charlotte-metro',
    name: 'Charlotte metro',
    in: 'circle:35.22,-80.86;r=20000', // 20 km around Uptown
  },
];

/**
 * Fetch traffic flow data for a single route bounding box.
 * Uses the Vite proxy in development to protect the API key.
 */
async function fetchRouteFlow(route: HereRoute, signal?: AbortSignal): Promise<HereFlowResponse> {
  // Use proxy in development, Pages Function in production
  const baseUrl = import.meta.env.DEV ? '/proxy/here/v7/flow' : '/api/here-flow';

  const params = new URLSearchParams({
    in: route.in,
    locationReferencing: 'shape',
    minJamFactor: '8', // Jam 8+ approximates heavier congestion; 80% slower enforced by MIN_CONGESTION_PERCENT
  });

  // In production, the Cloudflare Function handles the API key
  // In dev, the Vite proxy injects it
  const url = `${baseUrl}?${params}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(`HERE API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

const MAX_SHAPE_POINTS = 200; // Cap for map polyline to avoid huge payloads

/** All shape points in order (for polyline). Capped at MAX_SHAPE_POINTS. */
function getGroupShapePoints(group: HereFlowResult[]): [number, number][] {
  const points: [number, number][] = [];
  for (const r of group) {
    const shape = r.location?.shape;
    if (!shape?.links) continue;
    for (const link of shape.links) {
      for (const p of link.points ?? []) {
        if (points.length >= MAX_SHAPE_POINTS) return points;
        if (
          typeof p.lat !== 'number' ||
          typeof p.lng !== 'number' ||
          !Number.isFinite(p.lat) ||
          !Number.isFinite(p.lng)
        )
          continue;
        points.push([p.lat, p.lng]);
      }
    }
  }
  return points;
}

/** Centroid of all points in a group's location.shape. For map link. */
function getGroupCentroid(group: HereFlowResult[]): { lat: number; lng: number } | null {
  let sumLat = 0;
  let sumLng = 0;
  let n = 0;
  for (const r of group) {
    const shape = r.location?.shape;
    if (!shape?.links) continue;
    for (const link of shape.links) {
      for (const p of link.points ?? []) {
        if (
          typeof p.lat === 'number' &&
          typeof p.lng === 'number' &&
          Number.isFinite(p.lat) &&
          Number.isFinite(p.lng)
        ) {
          sumLat += p.lat;
          sumLng += p.lng;
          n++;
        }
      }
    }
  }
  return n > 0 ? { lat: sumLat / n, lng: sumLng / n } : null;
}

/** Normalize road name to group major routes together (e.g., "I-77 N" -> "I-77", "I-77/US-21" -> "I-77") */
export function normalizeRoadName(name: string): string {
  const cleaned = name.trim();

  // Only keep multi-interstate junctions separate (e.g., "I-85/I-77")
  // But normalize concurrent routes like "I-77/US-21" to just "I-77"
  const interstateCount = (cleaned.match(/I-?\d+/g) || []).length;
  if (interstateCount > 1) {
    // Multiple interstates - keep separate (it's a junction)
    return cleaned;
  }

  // Extract and normalize to the first interstate found
  const interstateMatch = cleaned.match(/I-?\s*(\d+)/i);
  if (interstateMatch) {
    return `I-${interstateMatch[1]}`;
  }

  // No interstate - try US routes
  const usRouteMatch = cleaned.match(/(?:US|U\.S\.)\s*(?:Highway|Route|Hwy)?\s*-?\s*(\d+)/i);
  if (usRouteMatch) {
    return `US-${usRouteMatch[1]}`;
  }

  // No US route - try NC routes
  const ncRouteMatch = cleaned.match(/(?:NC|Highway|Hwy|State Route|SR)\s*-?\s*(\d+)/i);
  if (ncRouteMatch) {
    return `NC-${ncRouteMatch[1]}`;
  }

  // Not a numbered highway - strip directional suffixes from regular roads
  return cleaned.replace(
    /\s+(NORTHBOUND|SOUTHBOUND|EASTBOUND|WESTBOUND|[NSEW](?:ORTH|OUTH|AST|EST)?)$/i,
    ''
  );
}

/** Slug for routeId: lowercase, alphanumeric and hyphens only */
export function slug(name: string): string {
  const s = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return s || 'unnamed';
}

/**
 * Effective speed in m/s. HERE omits top-level speed when traversability is "closed";
 * derive from subSegments (length-weighted, 0 for closed subSegments).
 */
export function getEffectiveSpeed(flow: HereFlowResult['currentFlow']): number {
  if (typeof flow.speed === 'number' && Number.isFinite(flow.speed)) {
    return flow.speed;
  }
  const subs = flow.subSegments;
  if (subs?.length) {
    let total = 0;
    let len = 0;
    for (const s of subs) {
      const L = typeof s.length === 'number' && s.length >= 0 ? s.length : 0;
      len += L;
      const v = typeof s.speed === 'number' && Number.isFinite(s.speed) ? s.speed : 0;
      total += v * L;
    }
    return len > 0 ? total / len : 0;
  }
  return 0;
}

/**
 * Effective free-flow speed in m/s. Prefer top-level; fallback to first subSegment with freeFlow.
 */
export function getEffectiveFreeFlow(flow: HereFlowResult['currentFlow']): number {
  if (typeof flow.freeFlow === 'number' && Number.isFinite(flow.freeFlow)) {
    return flow.freeFlow;
  }
  const first = flow.subSegments?.find(
    s => typeof s.freeFlow === 'number' && Number.isFinite(s.freeFlow)
  );
  return first != null ? first.freeFlow! : 0;
}

const MIN_JAM_ALERT = 7; // maxJamFactor > 7
const MIN_CONGESTION_PERCENT = 90; // only alert when at least one segment is 90%+ slower than free flow
const MIN_AVG_CONGESTION_PERCENT = 50; // road-wide average must be at least 50% slower (avoids "16% slower" from one bad segment)
const MIN_SEGMENT_COUNT = 1; // API returns one result per segment; group by road can yield 1 segment per road
const MIN_OPEN_ROAD_PERCENT = 50; // require at least 50% of road to be open (not closed for construction, etc.)
const MIN_OPEN_ROAD_METERS = 100; // or at least 100m of open road

/** Charlotte arterials to include in traffic alerts (HERE may return "Rd" or "Road", "Blvd" or "Boulevard") */
const MAJOR_ARTERIALS = new Set(['park rd', 'park road', 'south blvd', 'south boulevard']);

/**
 * Check if a result has sufficient open road to generate a congestion alert.
 * Returns true if the road has at least MIN_OPEN_ROAD_PERCENT open OR MIN_OPEN_ROAD_METERS open.
 */
export function hasSufficientOpenRoad(result: HereFlowResult): boolean {
  const subs = result.currentFlow.subSegments;

  // No subsegments - check top-level traversability
  if (!subs || subs.length === 0) {
    return result.currentFlow.traversability !== 'closed';
  }

  // Calculate total and open lengths
  let totalLength = 0;
  let openLength = 0;

  for (const sub of subs) {
    const len = typeof sub.length === 'number' && sub.length >= 0 ? sub.length : 0;
    totalLength += len;
    // Subsegments are open unless explicitly marked closed
    if (sub.traversability !== 'closed') {
      openLength += len;
    }
  }

  // Require minimum open road (percentage OR absolute)
  if (totalLength === 0) return false;
  const openPercent = (openLength / totalLength) * 100;
  return openPercent >= MIN_OPEN_ROAD_PERCENT || openLength >= MIN_OPEN_ROAD_METERS;
}

/**
 * Get jam factor and speed statistics from open subsegments only.
 * Returns { jamFactor, speed, freeFlow } considering only open portions of the road.
 */
export function getOpenSubsegmentStats(flow: HereFlowResult['currentFlow']): {
  jamFactor: number;
  speed: number;
  freeFlow: number;
} {
  const subs = flow.subSegments;

  // No subsegments - use top-level values
  if (!subs || subs.length === 0) {
    return {
      jamFactor:
        typeof flow.jamFactor === 'number' && Number.isFinite(flow.jamFactor) ? flow.jamFactor : 0,
      speed: getEffectiveSpeed(flow),
      freeFlow: getEffectiveFreeFlow(flow),
    };
  }

  // Calculate length-weighted averages from open subsegments only
  let totalJam = 0;
  let totalSpeed = 0;
  let totalFree = 0;
  let totalLength = 0;

  for (const sub of subs) {
    // Skip closed subsegments
    if (sub.traversability === 'closed') continue;

    const len = typeof sub.length === 'number' && sub.length >= 0 ? sub.length : 0;
    if (len === 0) continue;

    const jam =
      typeof sub.jamFactor === 'number' && Number.isFinite(sub.jamFactor) ? sub.jamFactor : 0;
    const speed = typeof sub.speed === 'number' && Number.isFinite(sub.speed) ? sub.speed : 0;
    const free =
      typeof sub.freeFlow === 'number' && Number.isFinite(sub.freeFlow) ? sub.freeFlow : 0;

    totalJam += jam * len;
    totalSpeed += speed * len;
    totalFree += free * len;
    totalLength += len;
  }

  // Return length-weighted averages
  if (totalLength === 0) {
    return { jamFactor: 0, speed: 0, freeFlow: 0 };
  }

  return {
    jamFactor: totalJam / totalLength,
    speed: totalSpeed / totalLength,
    freeFlow: totalFree / totalLength,
  };
}

/**
 * Group results by location.description, compute per-road stats.
 * Returns one HereRouteFlow per road with maxJamFactor > 7, maxCongestionPercent >= 90, and avg congestion >= 50%.
 * Only considers open subsegments to avoid false alerts on road closures.
 * Road names are normalized to consolidate major routes (e.g., "I-77 N" and "I-77 S" -> "I-77").
 */
function processFlowResultsByRoad(results: HereFlowResult[], timestamp: string): HereRouteFlow[] {
  const byRoad = new Map<string, HereFlowResult[]>();
  const originalNames = new Map<string, Set<string>>(); // Track original names per normalized name
  for (const r of results) {
    const name = r.location?.description?.trim() || 'Unnamed';
    if (name === 'Unnamed') continue; // skip segments without a road name — not actionable
    // Skip segments without sufficient open road (mostly closed for construction, etc.)
    if (!hasSufficientOpenRoad(r)) continue;
    const normalizedName = normalizeRoadName(name);
    const arr = byRoad.get(normalizedName) ?? [];
    arr.push(r);
    byRoad.set(normalizedName, arr);
    // Track original names
    const names = originalNames.get(normalizedName) ?? new Set<string>();
    names.add(name);
    originalNames.set(normalizedName, names);
  }

  const out: HereRouteFlow[] = [];
  for (const [routeName, group] of byRoad) {
    let totalJam = 0;
    let maxJam = 0;
    let totalSpeed = 0;
    let totalFree = 0;
    let maxCongestion = 0;

    for (const r of group) {
      // Get statistics from open subsegments only
      const stats = getOpenSubsegmentStats(r.currentFlow);
      totalJam += stats.jamFactor;
      maxJam = Math.max(maxJam, stats.jamFactor);
      totalSpeed += stats.speed;
      totalFree += stats.freeFlow;
      // Calculate congestion percent for this segment (from open portions only)
      if (stats.freeFlow > 0 && Number.isFinite(stats.speed)) {
        const segmentCongestion = ((stats.freeFlow - stats.speed) / stats.freeFlow) * 100;
        maxCongestion = Math.max(maxCongestion, segmentCongestion);
      }
    }
    if (maxJam <= MIN_JAM_ALERT) continue;

    const n = group.length;
    const avgJam = n > 0 ? totalJam / n : 0;
    const avgSpeed = n > 0 ? totalSpeed / n : 0;
    const avgFree = n > 0 ? totalFree / n : 0;

    let congestionPercent = 0;
    if (avgFree > 0 && Number.isFinite(avgSpeed)) {
      const p = ((avgFree - avgSpeed) / avgFree) * 100;
      congestionPercent = Math.round(Math.max(0, Math.min(100, p)));
    }
    // When jam factor is 10 (road blocked), treat as severe congestion even if effective speed is high from open subSegments
    const maxCongestionPercent =
      maxJam >= 9 ? 100 : Math.round(Math.max(0, Math.min(100, maxCongestion)));
    if (maxCongestionPercent < MIN_CONGESTION_PERCENT) continue;

    // Require road-wide average slowdown so we don't alert on "one bad segment" (e.g. 16% slower overall)
    if (congestionPercent < MIN_AVG_CONGESTION_PERCENT) continue;

    // Only alert on major routes (interstates, US highways, major NC routes, key Charlotte arterials)
    // Skip minor roads, residential streets, etc. to reduce noise
    const routeLower = routeName.toLowerCase().trim();
    const isMajorRoute =
      routeName.startsWith('I-') ||
      routeName.startsWith('US-') ||
      routeName.startsWith('NC-') ||
      MAJOR_ARTERIALS.has(routeLower);
    if (!isMajorRoute) {
      continue;
    }

    if (n < MIN_SEGMENT_COUNT) continue;

    const avgSpeedMph = Number.isFinite(avgSpeed) ? Math.round(metersPerSecToMph(avgSpeed)) : 0;
    const freeFlowMph = Number.isFinite(avgFree) ? Math.round(metersPerSecToMph(avgFree)) : 0;

    const centroid = getGroupCentroid(group);
    const shapePoints = getGroupShapePoints(group);

    out.push({
      routeId: slug(routeName),
      routeName,
      avgJamFactor: Math.round(avgJam * 10) / 10,
      maxJamFactor: Math.round(maxJam * 10) / 10,
      avgSpeedMph,
      freeFlowSpeedMph: freeFlowMph,
      congestionPercent,
      maxCongestionPercent,
      segmentCount: n,
      timestamp,
      ...(centroid ? { centerLat: centroid.lat, centerLng: centroid.lng } : {}),
      ...(shapePoints.length > 0 ? { shapePoints } : {}),
    });
  }
  return out;
}

/**
 * Fetch traffic flow data for all priority routes.
 * Returns one HereRouteFlow per road where: (1) at least one segment has congestionPercent >= 90%, AND (2) road-wide average congestion >= 50%.
 */
export async function fetchAllRoutesFlow(signal?: AbortSignal): Promise<HereRouteFlow[]> {
  const routeFlows: HereRouteFlow[] = [];
  for (const route of CHARLOTTE_PRIORITY_ROUTES) {
    try {
      const response = await fetchRouteFlow(route, signal);
      const ts = response.sourceUpdated ?? new Date().toISOString();
      const flows = processFlowResultsByRoad(response.results ?? [], ts);
      routeFlows.push(...flows);
    } catch (error) {
      console.error(`Failed to fetch flow for ${route.name}:`, error);
    }
  }
  return routeFlows;
}

/**
 * Filter to only routes with significant congestion.
 * Returns routes where jam factor exceeds the threshold.
 */
export function filterCongestedRoutes(
  flows: HereRouteFlow[],
  minJamFactor: number = JAM_FACTOR_THRESHOLDS.MODERATE
): HereRouteFlow[] {
  return flows.filter(flow => flow.maxJamFactor >= minJamFactor);
}

/**
 * Get congestion severity level based on jam factor.
 */
export function getCongestionSeverity(
  jamFactor: number
): 'normal' | 'moderate' | 'heavy' | 'severe' {
  if (jamFactor >= JAM_FACTOR_THRESHOLDS.SEVERE) return 'severe';
  if (jamFactor >= JAM_FACTOR_THRESHOLDS.HEAVY) return 'heavy';
  if (jamFactor >= JAM_FACTOR_THRESHOLDS.MODERATE) return 'moderate';
  return 'normal';
}
