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
    minJamFactor: '8', // Jam 8+ approximates heavier congestion; 50% slower enforced by MIN_CONGESTION_PERCENT
  });

  // In production, the Netlify function handles the API key
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

/** Slug for routeId: lowercase, alphanumeric and hyphens only */
function slug(name: string): string {
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
function getEffectiveSpeed(flow: HereFlowResult['currentFlow']): number {
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
function getEffectiveFreeFlow(flow: HereFlowResult['currentFlow']): number {
  if (typeof flow.freeFlow === 'number' && Number.isFinite(flow.freeFlow)) {
    return flow.freeFlow;
  }
  const first = flow.subSegments?.find(
    s => typeof s.freeFlow === 'number' && Number.isFinite(s.freeFlow)
  );
  return first != null ? first.freeFlow! : 0;
}

const MIN_JAM_ALERT = 7; // maxJamFactor > 7
const MIN_CONGESTION_PERCENT = 50; // only alert when at least 50% slower than free flow

/**
 * Group results by location.description, compute per-road stats.
 * Returns one HereRouteFlow per road with maxJamFactor > 7 and congestionPercent >= 50.
 * Uses subSegments when top-level speed is omitted (e.g. closed).
 */
function processFlowResultsByRoad(results: HereFlowResult[], timestamp: string): HereRouteFlow[] {
  const byRoad = new Map<string, HereFlowResult[]>();
  for (const r of results) {
    const name = r.location?.description?.trim() || 'Unnamed';
    if (name === 'Unnamed') continue; // skip segments without a road name — not actionable
    const arr = byRoad.get(name) ?? [];
    arr.push(r);
    byRoad.set(name, arr);
  }

  const out: HereRouteFlow[] = [];
  for (const [routeName, group] of byRoad) {
    let totalJam = 0;
    let maxJam = 0;
    let totalSpeed = 0;
    let totalFree = 0;
    for (const r of group) {
      const flow = r.currentFlow;
      const j =
        typeof flow.jamFactor === 'number' && Number.isFinite(flow.jamFactor) ? flow.jamFactor : 0;
      totalJam += j;
      maxJam = Math.max(maxJam, j);
      totalSpeed += getEffectiveSpeed(flow);
      totalFree += getEffectiveFreeFlow(flow);
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
    if (congestionPercent < MIN_CONGESTION_PERCENT) continue;

    const avgSpeedMph = Number.isFinite(avgSpeed) ? Math.round(metersPerSecToMph(avgSpeed)) : 0;
    const freeFlowMph = Number.isFinite(avgFree) ? Math.round(metersPerSecToMph(avgFree)) : 0;

    const centroid = getGroupCentroid(group);

    out.push({
      routeId: slug(routeName),
      routeName,
      avgJamFactor: Math.round(avgJam * 10) / 10,
      maxJamFactor: Math.round(maxJam * 10) / 10,
      avgSpeedMph,
      freeFlowSpeedMph: freeFlowMph,
      congestionPercent,
      segmentCount: n,
      timestamp,
      ...(centroid ? { centerLat: centroid.lat, centerLng: centroid.lng } : {}),
    });
  }
  return out;
}

/**
 * Fetch traffic flow data for all priority routes.
 * Returns one HereRouteFlow per road with maxJamFactor > 7 (separate alerts per road).
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
