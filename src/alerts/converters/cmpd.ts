import type { CMPDTrafficEvent } from '../../types/cmpd';
import type { GenericAlert } from '../../types/alerts';
import { mapCMPDSeverity, ALERT_SEVERITY_CONFIG } from '../../types/alerts';
import { getCMPDIncidentCategory, getCMPDIncidentIcon } from '../../types/cmpd';
import { buildMapUrlIfValid } from '../../utils/mapUrl';

// Format CMPD event time for display
function formatCMPDEventTime(eventDateTime: string): string {
  try {
    const date = new Date(eventDateTime);
    if (isNaN(date.getTime())) return eventDateTime;
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return eventDateTime;
  }
}

// Convert CMPD traffic event to generic alert format
export function convertCMPDEventToGeneric(event: CMPDTrafficEvent): GenericAlert {
  const severity = mapCMPDSeverity({
    typeCode: event.typeCode,
    typeDescription: event.typeDescription,
    typeSubDescription: event.typeSubDescription,
  });
  const icon = getCMPDIncidentIcon(event.typeCode);
  const category = getCMPDIncidentCategory(event.typeCode);
  const timeDisplay = formatCMPDEventTime(event.eventDateTime);

  // Build title with icon and type
  const typeDisplay = event.typeDescription
    .split('-')
    .map(part => part.trim())
    .map(part => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' - ');
  const title = `${icon} ${typeDisplay}`;

  // Build summary with location and status
  const summaryParts: string[] = [];
  if (event.address) {
    summaryParts.push(event.address);
  }
  if (event.typeSubDescription && event.typeSubDescription !== event.typeDescription) {
    const subDesc = event.typeSubDescription
      .split('-')
      .map(part => part.trim())
      .map(part => part.charAt(0) + part.slice(1).toLowerCase())
      .join(' - ');
    summaryParts.push(subDesc);
  }
  summaryParts.push(`Reported: ${timeDisplay}`);
  const summary = summaryParts.join(' • ');

  // Build description
  const descriptionParts: string[] = [];
  descriptionParts.push(`Type: ${event.typeDescription}`);
  if (event.typeSubDescription) {
    descriptionParts.push(`Status: ${event.typeSubDescription}`);
  }
  if (event.address) {
    descriptionParts.push(`Location: ${event.address}`);
  }
  descriptionParts.push(`Division: ${event.division}`);
  descriptionParts.push(`Event #: ${event.eventNo}`);

  // Build instruction based on incident type
  let instruction: string | undefined;
  if (category === 'crash') {
    instruction = 'Expect delays in the area. Consider alternate routes if possible.';
  } else if (category === 'traffic_control') {
    instruction = 'Traffic signal may be malfunctioning. Treat intersection as a 4-way stop.';
  } else if (category === 'obstruction') {
    instruction = 'Roadway obstruction reported. Use caution in the area.';
  }

  return {
    id: `cmpd-${event.eventNo}`,
    source: 'cmpd',
    category: 'traffic',
    severity,
    title,
    summary,
    description: descriptionParts.join('\n'),
    instruction,
    affectedArea: event.address || event.division,
    startTime: new Date(event.eventDateTime),
    updatedAt: new Date(),
    url: buildMapUrlIfValid(event.latitude, event.longitude),
    metadata: {
      source: 'cmpd',
      eventNo: event.eventNo,
      typeCode: event.typeCode,
      typeDescription: event.typeDescription,
      typeSubCode: event.typeSubCode,
      typeSubDescription: event.typeSubDescription,
      division: event.division,
      latitude: event.latitude,
      longitude: event.longitude,
      displaySeverity: ALERT_SEVERITY_CONFIG[severity].label,
    },
  };
}

// Convert all CMPD traffic events to generic format
export function convertCMPDEventsToGeneric(events: CMPDTrafficEvent[]): GenericAlert[] {
  return events.map(convertCMPDEventToGeneric);
}
