import type { CMPDTrafficEvent } from '../../types/cmpd';
import type { GenericAlert } from '../../types/alerts';
import { mapCMPDSeverity, ALERT_SEVERITY_CONFIG } from '../../types/alerts';
import { getCMPDIncidentCategory } from '../../types/cmpd';
import { buildMapUrlIfValid } from '../../utils/mapUrl';

// Filter thresholds
const MAX_EVENT_AGE_HOURS = 3;
const EXCLUDED_TYPES = new Set([
  'AC-R/PD', // Property-damage-only accidents
  'HR-R/PD', // Hit & run - property damage
]);

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

// Check if event should be filtered out
function shouldFilterEvent(event: CMPDTrafficEvent): boolean {
  // Filter property-damage-only accidents
  if (EXCLUDED_TYPES.has(event.typeCode)) {
    return true;
  }

  // Filter events older than threshold
  try {
    const eventTime = new Date(event.eventDateTime).getTime();
    const now = Date.now();
    const ageHours = (now - eventTime) / (1000 * 60 * 60);
    if (ageHours > MAX_EVENT_AGE_HOURS) {
      return true;
    }
  } catch {
    // If we can't parse the time, keep the event
    return false;
  }

  return false;
}

// Convert CMPD traffic event to generic alert format
// Returns null for filtered events (property damage, old reports)
export function convertCMPDEventToGeneric(event: CMPDTrafficEvent): GenericAlert | null {
  // Filter out low-priority events
  if (shouldFilterEvent(event)) {
    return null;
  }
  const severity = mapCMPDSeverity({
    typeCode: event.typeCode,
    typeDescription: event.typeDescription,
    typeSubDescription: event.typeSubDescription,
  });
  const category = getCMPDIncidentCategory(event.typeCode);
  const timeDisplay = formatCMPDEventTime(event.eventDateTime);

  // Build title from type (AlertIcon shows source/category icon in the UI)
  const typeDisplay = event.typeDescription
    .split('-')
    .map(part => part.trim())
    .map(part => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' - ');
  const title = typeDisplay;

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
// Filters out property-damage accidents and events older than 3 hours
export function convertCMPDEventsToGeneric(events: CMPDTrafficEvent[]): GenericAlert[] {
  return events
    .map(convertCMPDEventToGeneric)
    .filter((alert): alert is GenericAlert => alert !== null);
}
