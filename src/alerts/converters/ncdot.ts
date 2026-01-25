import type { NCDOTIncident } from '../../types/ncdot';
import type { GenericAlert } from '../../types/alerts';
import { mapNCDOTSeverity, ALERT_SEVERITY_CONFIG } from '../../types/alerts';
import { getCharlotteRoadDisplay } from '../../utils/ncdotApi';
import { buildMapUrlIfValid } from '../../utils/mapUrl';

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
export function convertNCDOTIncidentToGeneric(incident: NCDOTIncident): GenericAlert {
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
export function convertNCDOTIncidentsToGeneric(incidents: NCDOTIncident[]): GenericAlert[] {
  return incidents.map(convertNCDOTIncidentToGeneric);
}
