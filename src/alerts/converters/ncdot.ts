import type { NCDOTIncident } from '../../types/ncdot';
import type { GenericAlert } from '../../types/alerts';
import { mapNCDOTSeverity, ALERT_SEVERITY_CONFIG } from '../../types/alerts';
import { getCharlotteRoadDisplay, extractMileMarkers } from '../../utils/ncdotApi';
import { buildMapUrlIfValid } from '../../utils/mapUrl';
import { formatEndTimeDisplay } from '../../utils/dateFormatting';
import { getPolylineForMileRange, getPolylineForSingleMile } from '../../utils/routeGeometry';

// Earth's radius in miles (for Haversine distance calculation)
const EARTH_RADIUS_MILES = 3959;

// Maximum allowed distance (in miles) between generated polyline and incident coordinates
const MAX_POLYLINE_DISTANCE_MILES = 5;

/** Parse NCDOT WKT LINESTRING (lng lat, ...) into [lat, lng][] for map polyline */
function parseNCDOTPolyline(polyline: string): [number, number][] | null {
  const trimmed = polyline?.trim();
  if (!trimmed || !trimmed.toUpperCase().startsWith('LINESTRING')) return null;
  const match = trimmed.match(/LINESTRING\s*\((.+)\)/i);
  if (!match) return null;
  const pairs = match[1].split(',').map(s => s.trim().split(/\s+/));
  const points: [number, number][] = [];
  for (const p of pairs) {
    if (p.length >= 2) {
      const lng = parseFloat(p[0]);
      const lat = parseFloat(p[1]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        points.push([lat, lng]);
      }
    }
  }
  return points.length >= 2 ? points : null;
}

/**
 * Calculate distance in miles between two lat/lng points using Haversine formula
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_MILES * c;
}

/**
 * Validate that a generated polyline is near the incident's reported coordinates.
 * Returns true if the polyline's start point is within a reasonable distance
 * of the incident location.
 */
function validatePolylineLocation(
  polyline: [number, number][],
  incidentLat: number,
  incidentLng: number
): boolean {
  if (polyline.length === 0) return false;
  const [startLat, startLng] = polyline[0];
  const distance = calculateDistance(incidentLat, incidentLng, startLat, startLng);
  return distance < MAX_POLYLINE_DISTANCE_MILES;
}

/**
 * Generate shapePoints from mile marker data using static route geometry.
 * Returns null if route or mile markers are not available.
 */
function generateShapePointsFromMileMarkers(incident: NCDOTIncident): [number, number][] | null {
  const routeId = getCharlotteRoadDisplay(incident.road);
  const markers = extractMileMarkers(incident.location);
  if (!markers) return null;

  const polyline =
    markers.start === markers.end
      ? getPolylineForSingleMile(routeId, markers.start)
      : getPolylineForMileRange(routeId, markers.start, markers.end);

  // Validate that the generated polyline is near the incident's actual location
  if (polyline && validatePolylineLocation(polyline, incident.latitude, incident.longitude)) {
    return polyline;
  }

  return null;
}

/**
 * Get shapePoints for an incident using fallback chain:
 * 1. API-provided polyline
 * 2. Generated from mile markers via reference route data (with validation)
 * 3. null (caller falls back to single lat/lng marker)
 *
 * Note: Mile marker generation includes validation to ensure the generated polyline
 * is near the incident's actual coordinates. Some routes (e.g., I-485 loop) have
 * mile marker numbering in the API that doesn't match our reference geometry, so
 * validation prevents incorrect polyline rendering.
 */
function getIncidentShapePoints(incident: NCDOTIncident): [number, number][] | null {
  return parseNCDOTPolyline(incident.polyline) ?? generateShapePointsFromMileMarkers(incident);
}

// Nighttime hours (8 PM to 6 AM)
const NIGHTTIME_START_HOUR = 20;
const NIGHTTIME_END_HOUR = 6;
const MIN_LANE_CLOSURE_PERCENT = 0.5;

// Check if current time is nighttime
function isNighttime(): boolean {
  const hour = new Date().getHours();
  return hour >= NIGHTTIME_START_HOUR || hour < NIGHTTIME_END_HOUR;
}

// Check if incident is maintenance or construction
function isMaintenanceOrConstruction(incident: NCDOTIncident): boolean {
  const type = incident.incidentType.toLowerCase();
  const reason = incident.reason.toLowerCase();
  const condition = incident.condition.toLowerCase();

  return (
    type.includes('construction') ||
    type.includes('maintenance') ||
    reason.includes('construction') ||
    reason.includes('maintenance') ||
    condition.includes('construction') ||
    condition.includes('maintenance') ||
    incident.inWorkZone
  );
}

// Check if incident should be filtered out
function shouldFilterIncident(incident: NCDOTIncident): boolean {
  // Never filter crashes, fatalities, or bridge incidents
  const type = incident.incidentType.toLowerCase();
  const isCrash =
    type.includes('accident') ||
    type.includes('collision') ||
    type.includes('crash') ||
    incident.fatality;

  if (isCrash || incident.bridgeInvolved) {
    return false;
  }

  // Check if it's nighttime maintenance/construction with minor lane closures
  if (!isNighttime() || !isMaintenanceOrConstruction(incident)) {
    return false;
  }

  // Filter if less than 50% of lanes are closed
  if (incident.lanesTotal > 0) {
    const closurePercent = incident.lanesClosed / incident.lanesTotal;
    return closurePercent < MIN_LANE_CLOSURE_PERCENT;
  }

  // If we can't determine lane closure percentage, keep it
  return false;
}

/**
 * Determine the highest severity across a group of incidents
 */
function getMaxSeverity(incidents: NCDOTIncident[]): ReturnType<typeof mapNCDOTSeverity> {
  const severityOrder: Record<string, number> = {
    critical: 0,
    high: 1,
    moderate: 2,
    minor: 3,
  };
  let maxSeverity = mapNCDOTSeverity(incidents[0]);
  for (let i = 1; i < incidents.length; i++) {
    const s = mapNCDOTSeverity(incidents[i]);
    if (severityOrder[s] < severityOrder[maxSeverity]) {
      maxSeverity = s;
    }
  }
  return maxSeverity;
}

/**
 * Build a generic title for a consolidated road-level card
 */
function buildConsolidatedTitle(
  incidents: NCDOTIncident[],
  roadDisplay: string,
  count: number
): string {
  // Check what types of incidents are present
  const types = new Set(incidents.map(inc => inc.incidentType.toLowerCase()));
  const hasCrash = [...types].some(
    t => t.includes('accident') || t.includes('collision') || t.includes('crash')
  );
  const hasConstruction = [...types].some(
    t => t.includes('construction') || t.includes('maintenance')
  );

  let label: string;
  if (hasCrash && hasConstruction) {
    label = 'Traffic Incidents';
  } else if (hasCrash) {
    label = 'Traffic Incident';
  } else if (hasConstruction) {
    label = 'Road Work';
  } else {
    label = 'Traffic Incidents';
  }

  return `${label} - ${roadDisplay} (${count} incidents)`;
}

// Convert NC DOT incident to generic alert format
// Returns null for filtered nighttime maintenance/construction with <50% lane closures
export function convertNCDOTIncidentToGeneric(incident: NCDOTIncident): GenericAlert | null {
  // Filter out low-impact nighttime maintenance/construction
  if (shouldFilterIncident(incident)) {
    return null;
  }

  const roadDisplay = getCharlotteRoadDisplay(incident.road);
  const endTimeDisplay = formatEndTimeDisplay(incident.end);

  // Handle consolidated incidents (road-level grouping)
  const isConsolidated = (incident.consolidatedCount || 0) > 1;
  const consolidatedCount = incident.consolidatedCount || 1;
  const members = incident.consolidatedIncidents || [incident];

  // Use max severity across all members for consolidated alerts
  const severity = isConsolidated ? getMaxSeverity(members) : mapNCDOTSeverity(incident);

  const direction = incident.direction ? ` ${incident.direction}` : '';

  // Build title
  const title = isConsolidated
    ? buildConsolidatedTitle(members, roadDisplay, consolidatedCount)
    : `${incident.incidentType || incident.condition || 'Incident'} - ${roadDisplay}${direction}`;

  // Build summary
  const summaryParts: string[] = [];
  if (incident.location) {
    summaryParts.push(incident.location);
  }
  if (incident.lanesClosed > 0 && incident.lanesTotal > 0) {
    summaryParts.push(`Up to ${incident.lanesClosed} of ${incident.lanesTotal} lanes closed`);
  }
  if (endTimeDisplay) {
    summaryParts.push(endTimeDisplay);
  }
  if (isConsolidated) {
    summaryParts.push(`${consolidatedCount} incidents`);
  }
  const summary =
    summaryParts.length > 0 ? summaryParts.join(' • ') : incident.reason || 'Traffic incident';

  // Build description
  const descriptionParts: string[] = [];
  if (incident.reason) {
    descriptionParts.push(`Reason: ${incident.reason}`);
  }
  if (incident.condition) {
    descriptionParts.push(`Condition: ${incident.condition}`);
  }
  if (incident.crossStreetCommonName) {
    descriptionParts.push(`Near: ${incident.crossStreetCommonName}`);
  }
  if (incident.city) {
    descriptionParts.push(`City: ${incident.city}`);
  }
  if (incident.detour) {
    descriptionParts.push(`Detour: ${incident.detour}`);
  }

  // Handle incident ID(s)
  if (isConsolidated && incident.consolidatedIds) {
    descriptionParts.push(`Incident IDs: ${incident.consolidatedIds.join(', ')}`);
    descriptionParts.push(`Consolidated ${consolidatedCount} related incidents`);
  } else {
    descriptionParts.push(`Incident ID: ${incident.id}`);
  }

  // Build instruction based on incident type
  let instruction: string | undefined;
  if (incident.isDetour && incident.detour) {
    instruction = `Detour in effect: ${incident.detour}`;
  } else if (incident.condition.toLowerCase().includes('closed')) {
    instruction = 'Road closed. Seek alternate route.';
  } else if (incident.lanesClosed > 0) {
    instruction = 'Expect delays. Consider alternate routes if possible.';
  }

  // Build segments for consolidated alerts
  const segments = isConsolidated
    ? members.map(inc => {
        const segPoints = getIncidentShapePoints(inc);
        return {
          location: inc.location,
          direction: inc.direction,
          condition: inc.condition,
          reason: inc.reason,
          lanesClosed: inc.lanesClosed,
          lanesTotal: inc.lanesTotal,
          start: inc.start,
          end: inc.end,
          incidentId: inc.id,
          latitude: inc.latitude,
          longitude: inc.longitude,
          ...(segPoints ? { shapePoints: segPoints } : {}),
        };
      })
    : undefined;

  // For single incidents, use fallback chain for top-level shapePoints.
  // For consolidated alerts, per-segment shapePoints are rendered individually
  // by the map (combining them into one polyline creates straight-line artifacts
  // between non-contiguous segments).
  const shapePoints = isConsolidated ? null : getIncidentShapePoints(incident);

  // For consolidated alerts spanning multiple directions, omit direction from affected area
  const affectedArea = isConsolidated
    ? `${roadDisplay}${incident.city ? `, ${incident.city}` : ''}`
    : `${roadDisplay}${direction}${incident.city ? `, ${incident.city}` : ''}`;

  return {
    id:
      isConsolidated && incident.consolidatedIds
        ? `ncdot-consolidated-${incident.consolidatedIds.join('-')}`
        : `ncdot-${incident.id}`,
    source: 'ncdot',
    category: 'traffic',
    severity,
    title,
    summary,
    description: descriptionParts.join('\n'),
    instruction,
    affectedArea,
    startTime: incident.start ? new Date(incident.start) : undefined,
    endTime: incident.end ? new Date(incident.end) : undefined,
    updatedAt: incident.lastUpdate ? new Date(incident.lastUpdate) : new Date(),
    url: buildMapUrlIfValid(incident.latitude, incident.longitude),
    metadata: {
      source: 'ncdot',
      incidentType: incident.incidentType,
      condition: incident.condition,
      reason: incident.reason,
      road: incident.road,
      direction: incident.direction,
      lanesClosed: incident.lanesClosed,
      lanesTotal: incident.lanesTotal,
      latitude: incident.latitude,
      longitude: incident.longitude,
      fatality: incident.fatality,
      bridgeInvolved: incident.bridgeInvolved,
      inWorkZone: incident.inWorkZone,
      consolidatedCount,
      consolidatedIds: incident.consolidatedIds,
      displaySeverity: ALERT_SEVERITY_CONFIG[severity].label,
      ...(shapePoints && shapePoints.length > 0 ? { shapePoints } : {}),
      ...(segments ? { segments } : {}),
    },
  };
}

// Convert all NC DOT incidents to generic format
// Filters out nighttime maintenance/construction with <50% lane closures
export function convertNCDOTIncidentsToGeneric(incidents: NCDOTIncident[]): GenericAlert[] {
  return incidents
    .map(convertNCDOTIncidentToGeneric)
    .filter((alert): alert is GenericAlert => alert !== null);
}
