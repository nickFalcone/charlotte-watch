import type { NCDOTIncident } from '../../types/ncdot';
import type { GenericAlert } from '../../types/alerts';
import { mapNCDOTSeverity, ALERT_SEVERITY_CONFIG } from '../../types/alerts';
import { getCharlotteRoadDisplay } from '../../utils/ncdotApi';
import { buildMapUrlIfValid } from '../../utils/mapUrl';

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

// Format incident end time for display
function formatIncidentEndTime(endTime: string | undefined): string | undefined {
  if (!endTime) return undefined;

  try {
    const date = new Date(endTime);
    if (isNaN(date.getTime())) return undefined;

    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return `Until ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} today`;
    }
    return `Until ${date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  } catch {
    return undefined;
  }
}

// Convert NC DOT incident to generic alert format
// Returns null for filtered nighttime maintenance/construction with <50% lane closures
export function convertNCDOTIncidentToGeneric(incident: NCDOTIncident): GenericAlert | null {
  // Filter out low-impact nighttime maintenance/construction
  if (shouldFilterIncident(incident)) {
    return null;
  }
  const severity = mapNCDOTSeverity({
    fatality: incident.fatality,
    bridgeInvolved: incident.bridgeInvolved,
    condition: incident.condition,
    incidentType: incident.incidentType,
    lanesClosed: incident.lanesClosed,
    lanesTotal: incident.lanesTotal,
  });
  const roadDisplay = getCharlotteRoadDisplay(incident.road);
  const direction = incident.direction ? ` ${incident.direction}` : '';
  const endTimeDisplay = formatIncidentEndTime(incident.end);

  // Handle consolidated incidents
  const isConsolidated = (incident.consolidatedCount || 0) > 1;
  const consolidatedCount = incident.consolidatedCount || 1;

  // Build title - add consolidation info for consolidated incidents
  const incidentTypeDisplay = incident.incidentType || incident.condition || 'Incident';
  const title = isConsolidated
    ? `${incidentTypeDisplay} - ${roadDisplay}${direction} (${consolidatedCount} incidents)`
    : `${incidentTypeDisplay} - ${roadDisplay}${direction}`;

  // Build summary
  const summaryParts: string[] = [];
  if (incident.location) {
    summaryParts.push(incident.location);
  }
  if (incident.lanesClosed > 0 && incident.lanesTotal > 0) {
    summaryParts.push(`${incident.lanesClosed} of ${incident.lanesTotal} lanes closed`);
  }
  if (endTimeDisplay) {
    summaryParts.push(endTimeDisplay);
  }
  if (isConsolidated) {
    summaryParts.push(`${consolidatedCount} related incidents`);
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
    affectedArea: `${roadDisplay}${direction}${incident.city ? `, ${incident.city}` : ''}`,
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
