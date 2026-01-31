// Generic alert system that can aggregate alerts from multiple sources

import type { Theme } from '../theme/theme';

export type AlertSource =
  | 'nws'
  | 'faa'
  | 'duke'
  | 'ncdot'
  | 'cats'
  | 'cmpd'
  | 'here-flow'
  | 'traffic'
  | 'system'
  | 'custom';
export type AlertSeverity = 'critical' | 'high' | 'moderate' | 'minor';
export type AlertCategory =
  | 'weather'
  | 'aviation'
  | 'power'
  | 'traffic'
  | 'transit'
  | 'system'
  | 'other';

// Source-specific metadata types (discriminated union for type safety)
export type AlertMetadata =
  | {
      source: 'nws';
      certainty: string;
      urgency: string;
      nwsSeverity: string;
      displaySeverity?: string;
    }
  | {
      source: 'faa';
      type: 'ground_delay' | 'ground_stop' | 'delay' | 'closure';
      averageDelay?: string;
      maximumDelay?: string;
      endTime?: string;
      start?: string;
      reopens?: string;
      arrival?: { minimum: string; maximum: string; trend: string };
      departure?: { minimum: string; maximum: string; trend: string };
      displaySeverity?: string;
    }
  | {
      source: 'duke';
      customersAffected: number;
      cause: string;
      planned: boolean;
      eventId: string;
      estimatedRestoration?: Date;
      displaySeverity?: string;
      /** Operation center name, e.g. "Kannapolis", "Charlotte" */
      operationCenter?: string;
    }
  | {
      source: 'ncdot';
      incidentType: string;
      condition: string;
      reason: string;
      road: string;
      direction: string;
      lanesClosed: number;
      lanesTotal: number;
      latitude?: number;
      longitude?: number;
      fatality: boolean;
      bridgeInvolved: boolean;
      inWorkZone: boolean;
      consolidatedCount?: number;
      consolidatedIds?: number[];
      displaySeverity?: string;
    }
  | {
      source: 'cats';
      routes: string[];
      effect: string;
      cause: string;
      displaySeverity?: string;
    }
  | {
      source: 'cmpd';
      eventNo: string;
      typeCode: string;
      typeDescription: string;
      typeSubCode?: string;
      typeSubDescription: string;
      division: string;
      latitude?: number;
      longitude?: number;
      displaySeverity?: string;
    }
  | {
      source: 'here-flow';
      routeId: string;
      jamFactor: number;
      avgJamFactor: number;
      currentSpeedMph: number;
      freeFlowSpeedMph: number;
      congestionPercent: number;
      maxCongestionPercent: number;
      segmentCount: number;
      displaySeverity?: string;
    }
  | {
      source: 'traffic' | 'system' | 'custom';
      // Generic metadata for custom/system alerts
      [key: string]: unknown;
    };

export interface GenericAlert {
  id: string;
  source: AlertSource;
  category: AlertCategory;
  severity: AlertSeverity;
  title: string;
  summary: string;
  description?: string;
  instruction?: string;
  affectedArea?: string;
  startTime?: Date;
  endTime?: Date;
  updatedAt: Date;
  metadata?: AlertMetadata;
  /** Optional link (e.g. "View on map" for traffic, "Read more" for other sources) */
  url?: string;
}

// Alert source configuration
export interface AlertSourceConfig {
  source: AlertSource;
  enabled: boolean;
  label: string;
  icon: string;
}

// Severity styling - theme-aware for WCAG AAA compliance
export const getAlertSeverityConfig = (
  theme: Theme
): Record<AlertSeverity, { color: string; bgColor: string; label: string }> => {
  if (theme.name === 'dark') {
    return {
      critical: { color: '#ffb0b0', bgColor: 'rgba(220, 38, 38, 0.2)', label: 'Critical' }, // 8.02:1 on #2c2c2e
      high: { color: '#fecaca', bgColor: 'rgba(239, 68, 68, 0.2)', label: 'High' }, // ≥7:1 on badge tint over #2c2c2e
      moderate: { color: '#fed7aa', bgColor: 'rgba(234, 88, 12, 0.2)', label: 'Moderate' }, // ≥7:1 on badge tint over #2c2c2e
      minor: { color: '#93c5fd', bgColor: 'rgba(59, 130, 246, 0.2)', label: 'Minor' }, // 7.73:1 on #2c2c2e
    };
  }
  // Light mode - solid backgrounds (no alpha); 7:1 on bgColor for AAA
  return {
    critical: { color: '#991b1b', bgColor: '#fef2f2', label: 'Critical' }, // red-800 on red-50
    high: { color: '#b91c1c', bgColor: '#fee2e2', label: 'High' }, // red-700 on red-100
    moderate: { color: '#7c2d12', bgColor: '#fff7ed', label: 'Moderate' }, // orange-900 on orange-50, 7:1
    minor: { color: '#1d4ed8', bgColor: '#eff6ff', label: 'Minor' }, // blue-700 on blue-50
  };
};

// Legacy export for backwards compatibility - uses dark theme colors
export const ALERT_SEVERITY_CONFIG = getAlertSeverityConfig({ name: 'dark' } as Theme);

// Life-safety NWS event types that should display as critical regardless of NWS severity field
const NWS_CRITICAL_EVENT_PATTERNS = [
  'extreme cold',
  'heat warning',
  'heat advisory',
  'blizzard',
  'ice storm',
  'tornado',
  'hurricane',
  'storm surge',
  'tsunami',
  'flash flood',
  'dust storm',
  'avalanche',
];

// Helper to map NWS severity to generic severity
// event: optional NWS event name (e.g. "Extreme Cold Warning") to elevate life-safety alerts to critical
export function mapNWSSeverity(nwsSeverity: string, event?: string): AlertSeverity {
  const eventLower = (event || '').toLowerCase();
  const isCriticalEvent = NWS_CRITICAL_EVENT_PATTERNS.some(p => eventLower.includes(p));
  if (isCriticalEvent) return 'critical';

  switch (nwsSeverity) {
    case 'Extreme':
      return 'critical';
    case 'Severe':
    case 'Moderate':
      return 'moderate';
    case 'Minor':
    default:
      return 'minor';
  }
}

// Helper to map FAA delay severity based on delay time
export function mapFAADelaySeverity(delayMinutes: number): AlertSeverity {
  if (delayMinutes >= 60) return 'critical';
  if (delayMinutes >= 30) return 'moderate';
  return 'minor';
}

// Helper to map Duke Energy outage severity based on customers affected
export function mapDukeOutageSeverity(customersAffected: number): AlertSeverity {
  if (customersAffected >= 1000) return 'critical';
  if (customersAffected >= 500) return 'high';
  if (customersAffected >= 100) return 'moderate';
  return 'minor';
}

// Helper to map NC DOT incident severity based on actual impact to motorists
export function mapNCDOTSeverity(incident: {
  fatality: boolean;
  bridgeInvolved: boolean;
  condition: string;
  incidentType: string;
  lanesClosed: number;
  lanesTotal: number;
}): AlertSeverity {
  const condition = incident.condition.toLowerCase();
  const incidentType = incident.incidentType.toLowerCase();

  // Critical: fatalities, bridge issues, road closures (not planned maintenance), accidents
  if (incident.fatality) return 'critical';
  if (incident.bridgeInvolved) return 'critical';
  if (condition.includes('road closed')) return 'critical';
  // Moving closure: critical only if not maintenance/construction (planned work)
  const isMaintenance =
    incidentType.includes('maintenance') ||
    incidentType.includes('construction') ||
    condition.includes('maintenance') ||
    condition.includes('construction');
  if (condition.includes('moving closure') && !isMaintenance) return 'critical';
  if (incidentType.includes('accident') || incidentType.includes('collision')) return 'critical';
  if (condition.includes('local traffic only')) return 'critical'; // Effectively road closed

  // Moderate: significant lane closures, major construction
  if (incident.lanesClosed > 0 && incident.lanesTotal > 0) {
    const closureRatio = incident.lanesClosed / incident.lanesTotal;
    if (closureRatio >= 0.5) return 'moderate'; // 50%+ lanes closed
  }
  if (condition.includes('lane closed') || condition.includes('lanes closed')) return 'moderate';

  // Minor: shoulder closures, minor maintenance (but we filter out shoulder closures)
  return 'minor';
}

// Helper to map CATS alert severity based on effect
export function mapCATSSeverity(alert: { effect: string; cause: string }): AlertSeverity {
  const effect = alert.effect.toLowerCase();
  const cause = alert.cause.toLowerCase();

  // Critical: no service, major disruptions
  if (effect.includes('no_service')) return 'critical';

  // Moderate: detours, significant changes
  if (effect.includes('detour')) return 'moderate';
  if (effect.includes('modified_service')) return 'moderate';
  if (cause.includes('accident') || cause.includes('emergency')) return 'moderate';

  // Minor: other alerts
  return 'minor';
}

// Helper to map CMPD traffic event severity based on type and description
export function mapCMPDSeverity(event: {
  typeCode: string;
  typeDescription: string;
  typeSubDescription: string;
}): AlertSeverity {
  const typeCode = event.typeCode.toUpperCase();
  const description = event.typeDescription.toLowerCase();
  const subDescription = event.typeSubDescription.toLowerCase();

  // Critical: fatalities, serious injuries, major accidents
  if (typeCode === 'AC-FI' || description.includes('fatality')) return 'critical';
  if (description.includes('serious') || description.includes('major')) return 'critical';
  if (subDescription.includes('multi') || subDescription.includes('multiple')) return 'critical';

  // Moderate: personal injury accidents, hit and run, signal malfunctions
  if (typeCode === 'AC-PI' || typeCode === 'AC-HR') return 'moderate';
  if (typeCode.startsWith('TC-')) return 'moderate'; // Traffic control issues

  // Minor: property damage only, obstructions, disabled vehicles
  if (typeCode === 'AC-PD') return 'minor';
  if (typeCode.startsWith('RO-')) return 'minor'; // Roadway obstructions

  // Default based on whether it's an accident or not
  if (typeCode.startsWith('AC-')) return 'moderate';
  return 'minor';
}

// Sort alerts by severity
export function sortAlertsBySeverity(alerts: GenericAlert[]): GenericAlert[] {
  const severityOrder: Record<AlertSeverity, number> = {
    critical: 0,
    high: 1,
    moderate: 2,
    minor: 3,
  };
  return [...alerts].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}
