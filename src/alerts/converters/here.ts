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

import type { GenericAlert, AlertSeverity } from '../../types/alerts';
import type { HereRouteFlow } from '../../types/here';
import { ALERT_SEVERITY_CONFIG } from '../../types';
import { buildMapUrlIfValid } from '../../utils/mapUrl';

const MIN_JAM_ALERT = 7;
const MIN_CONGESTION_PERCENT = 50;
const CONGESTION_CRITICAL = 70; // "nearly stopped"
const CONGESTION_HEAVY = 40;

function num(v: number): number {
  return Number.isFinite(v) ? v : 0;
}

/** Severity and wording from congestionPercent (not maxJamFactor). */
function getTier(flow: HereRouteFlow): 'critical' | 'high' | 'moderate' {
  const p = num(flow.congestionPercent);
  if (p >= CONGESTION_CRITICAL) return 'critical';
  if (p >= CONGESTION_HEAVY) return 'high';
  return 'moderate';
}

function tierToSeverity(tier: 'critical' | 'high' | 'moderate'): AlertSeverity {
  return tier;
}

/**
 * Get human-readable congestion description. NaN-safe.
 */
function getCongestionDescription(flow: HereRouteFlow): string {
  const p = num(flow.congestionPercent);
  const mph = num(flow.avgSpeedMph);
  const free = num(flow.freeFlowSpeedMph);
  const tier = getTier(flow);

  if (tier === 'critical') {
    return `Severe congestion - traffic nearly stopped. Currently ${mph} mph (normally ${free} mph).`;
  }
  if (tier === 'high') {
    return `Heavy congestion - ${p}% slower than normal. Currently ${mph} mph (normally ${free} mph).`;
  }
  return `Moderate congestion - ${p}% slower than normal. Currently ${mph} mph.`;
}

/**
 * Get short summary for alert card. NaN-safe.
 */
function getCongestionSummary(flow: HereRouteFlow): string {
  const p = num(flow.congestionPercent);
  const tier = getTier(flow);

  if (tier === 'critical') return `Traffic nearly stopped • ${p}% slower than normal`;
  if (tier === 'high') return `Heavy traffic • ${p}% slower than normal`;
  return `Moderate traffic • ${p}% slower than normal`;
}

/**
 * Convert a single route flow to a generic alert.
 * Returns null when maxJamFactor <= 7 or congestionPercent < 50.
 */
export function convertHereFlowToGeneric(flow: HereRouteFlow): GenericAlert | null {
  if (flow.maxJamFactor <= MIN_JAM_ALERT) return null;
  if (num(flow.congestionPercent) < MIN_CONGESTION_PERCENT) return null;

  const tier = getTier(flow);
  const severity = tierToSeverity(tier);

  return {
    id: `here-flow-${flow.routeId}`,
    source: 'here-flow',
    category: 'traffic',
    severity,
    title: `🚗 ${flow.routeName} Congestion`,
    summary: getCongestionSummary(flow),
    description: getCongestionDescription(flow),
    instruction:
      tier === 'critical' || tier === 'high'
        ? 'Consider alternate routes to avoid delays.'
        : 'Allow extra travel time.',
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
      displaySeverity: ALERT_SEVERITY_CONFIG[severity].label,
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
