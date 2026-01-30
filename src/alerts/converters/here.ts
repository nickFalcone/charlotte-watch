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

const MIN_JAM_ALERT = 7;
const MIN_CONGESTION_PERCENT = 80;

function num(v: number): number {
  return Number.isFinite(v) ? v : 0;
}

/**
 * Get human-readable congestion description. NaN-safe.
 */
function getCongestionDescription(flow: HereRouteFlow): string {
  const mph = num(flow.avgSpeedMph);
  const free = num(flow.freeFlowSpeedMph);
  return `Heavy congestion - traffic nearly stopped. Currently ${mph} mph (normally ${free} mph).`;
}

/**
 * Get short summary for alert card. NaN-safe.
 */
function getCongestionSummary(flow: HereRouteFlow): string {
  const p = num(flow.congestionPercent);

  return `Heavy traffic • ${p}% slower than normal`;
}

/**
 * Convert a single route flow to a generic alert.
 * Returns null when maxJamFactor <= 7 or congestionPercent < 80.
 */
export function convertHereFlowToGeneric(flow: HereRouteFlow): GenericAlert | null {
  if (flow.maxJamFactor <= MIN_JAM_ALERT) return null;
  if (num(flow.congestionPercent) < MIN_CONGESTION_PERCENT) return null;

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
      segmentCount: flow.segmentCount,
      displaySeverity: ALERT_SEVERITY_CONFIG['high'].label,
    },
  };
}

/**
 * Convert all route flows to generic alerts.
 * Filters out routes without significant congestion.
 */
export function convertHereFlowsToGeneric(flows: HereRouteFlow[]): GenericAlert[] {
  return flows
    .map(convertHereFlowToGeneric)
    .filter((alert): alert is GenericAlert => alert !== null);
}
