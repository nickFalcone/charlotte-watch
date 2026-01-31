/**
 * HERE Traffic Flow to GenericAlert Converter
 *
 * Converts HERE traffic flow data into generic alert format.
 * Alerts only when maxJamFactor > 7 and congestionPercent >= 50. Severity
 * and wording are driven by congestionPercent (not maxJamFactor) so a tiny
 * closed junction doesn’t produce "nearly stopped" when the road is ~free flow.
 * NaN-safe.
 *
 * This file is part of the HERE integration feature and can be
 * safely deleted if the feature is removed.
 */

import type { GenericAlert } from '../../types/alerts';
import type { HereRouteFlow } from '../../types/here';
import { ALERT_SEVERITY_CONFIG } from '../../types';
import { buildMapUrlIfValid } from '../../utils/mapUrl';

const MIN_CONGESTION_PERCENT = 95;

function num(v: number): number {
  return Number.isFinite(v) ? v : 0;
}

/**
 * Get human-readable congestion description. NaN-safe.
 */
function getCongestionDescription(flow: HereRouteFlow): string {
  const mph = num(flow.avgSpeedMph);
  const free = num(flow.freeFlowSpeedMph);
  const maxJam = num(flow.maxJamFactor);
  const jamText = maxJam >= 9 ? ' Worst segments nearly stopped.' : '';
  return `Heavy congestion - traffic slowed significantly. Currently ${mph} mph (normally ${free} mph).${jamText}`;
}

/**
 * Get short summary for alert card. NaN-safe.
 */
function getCongestionSummary(flow: HereRouteFlow): string {
  const p = num(flow.congestionPercent);
  const segments = flow.segmentCount;
  const segmentText = segments > 1 ? ` across ${segments} segments` : '';

  return `Heavy traffic${segmentText} • ${p}% slower than normal`;
}

/**
 * Convert a single route flow to a generic alert.
 * Returns null when the most congested segment is below the threshold.
 * Uses maxCongestionPercent so consolidated routes alert when ANY segment is severely congested.
 */
export function convertHereFlowToGeneric(flow: HereRouteFlow): GenericAlert | null {
  if (num(flow.maxCongestionPercent) < MIN_CONGESTION_PERCENT) return null;

  return {
    id: `here-flow-${flow.routeId}`,
    source: 'here-flow',
    category: 'traffic',
    severity: 'high',
    title: `${flow.routeName} Congestion`,
    summary: getCongestionSummary(flow),
    description: getCongestionDescription(flow),
    instruction: 'Consider alternate routes to avoid delays.',
    affectedArea: `${flow.routeName}, Charlotte`,
    updatedAt: new Date(flow.timestamp),
    url: buildMapUrlIfValid(flow.centerLat, flow.centerLng),
    metadata: {
      source: 'here-flow',
      routeId: flow.routeId,
      jamFactor: flow.maxJamFactor,
      avgJamFactor: flow.avgJamFactor,
      currentSpeedMph: flow.avgSpeedMph,
      freeFlowSpeedMph: flow.freeFlowSpeedMph,
      congestionPercent: flow.congestionPercent,
      maxCongestionPercent: flow.maxCongestionPercent,
      segmentCount: flow.segmentCount,
      displaySeverity: ALERT_SEVERITY_CONFIG['high'].label,
    },
  };
}

/**
 * Convert all route flows to generic alerts.
 * Filters out routes without significant congestion.
 * Sorts by segment count descending (routes with most segments first).
 */
export function convertHereFlowsToGeneric(flows: HereRouteFlow[]): GenericAlert[] {
  const alerts = flows
    .map(convertHereFlowToGeneric)
    .filter((alert): alert is GenericAlert => alert !== null);

  // Sort by segment count (highest impact first)
  return alerts.sort((a, b) => {
    const aSegments = a.metadata?.source === 'here-flow' ? (a.metadata.segmentCount ?? 0) : 0;
    const bSegments = b.metadata?.source === 'here-flow' ? (b.metadata.segmentCount ?? 0) : 0;
    return bSegments - aSegments;
  });
}
