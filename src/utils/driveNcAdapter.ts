import type { DriveNCEvent } from '../types/drivenc';
import type { NCDOTIncident } from '../types/ncdot';

/**
 * Decode a Google Encoded Polyline (precision 5) into [lat, lng] pairs.
 */
export function decodeEncodedPolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  const readValue = (): number | null => {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      if (index >= encoded.length) return null;
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    return result & 1 ? ~(result >> 1) : result >> 1;
  };

  while (index < encoded.length) {
    const dLat = readValue();
    const dLng = readValue();
    if (dLat === null || dLng === null) break;
    lat += dLat;
    lng += dLng;
    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

/** Convert an encoded polyline into a WKT LINESTRING (lng lat, ...), or '' if unusable. */
export function encodedPolylineToWkt(encoded: string | null | undefined): string {
  if (!encoded) return '';
  const points = decodeEncodedPolyline(encoded);
  if (points.length < 2) return '';
  return `LINESTRING (${points.map(([lat, lng]) => `${lng} ${lat}`).join(', ')})`;
}

function unixToIso(seconds: number | null | undefined): string {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds)) return '';
  return new Date(seconds * 1000).toISOString();
}

/** "vehicleCrash" -> "Vehicle crash" */
function humanize(value: string | null | undefined): string {
  if (!value) return '';
  const spaced = value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function mapDirection(direction: string | undefined): string {
  if (!direction) return '';
  const unspecified = ['unknown', 'all directions', 'both directions'];
  return unspecified.includes(direction.toLowerCase()) ? '' : direction;
}

function mapIncidentType(event: DriveNCEvent): string {
  const type = event.OriginalEventType || event.EventType || '';
  if (type === 'roadwork') return 'Construction';
  if (type === 'accidentsAndIncidents') {
    const subType = humanize(event.EventSubType);
    return /crash|collision|accident/i.test(subType) ? 'Accident' : subType || 'Incident';
  }
  return humanize(event.EventSubType) || humanize(type) || 'Incident';
}

function mapCondition(event: DriveNCEvent): string {
  if (event.IsFullClosure) return 'Road closed';
  const lanes = event.LanesAffected?.trim() ?? '';
  if (/shoulder/i.test(lanes)) return 'Shoulder closed';
  if (lanes) return 'Lane closed';
  return humanize(event.EventSubType);
}

function mapDetour(instructions: DriveNCEvent['DetourInstructions']): string {
  if (Array.isArray(instructions)) return instructions.join('; ');
  return instructions?.trim() ?? '';
}

/**
 * Adapt a DriveNC event to the NCDOTIncident shape used by the alert pipeline.
 * DriveNC has no lane counts, mile markers or city, so those fields are left empty.
 */
export function driveNCEventToIncident(event: DriveNCEvent): NCDOTIncident {
  const detour = mapDetour(event.DetourInstructions);
  const text = `${event.Description ?? ''} ${event.Comment ?? ''}`;
  const start = unixToIso(event.StartDate ?? event.Reported);

  return {
    id: event.ID,
    latitude: event.Latitude,
    longitude: event.Longitude,
    commonName: event.RoadwayName ?? '',
    reason: event.Description ?? '',
    condition: mapCondition(event),
    incidentType: mapIncidentType(event),
    severity: 0,
    direction: mapDirection(event.DirectionOfTravel),
    location: '',
    countyId: 0,
    countyName: event.County ?? '',
    city: '',
    start,
    end: unixToIso(event.PlannedEndDate),
    lastUpdate: unixToIso(event.LastUpdated) || start,
    road: event.RoadwayName ?? '',
    routeId: 0,
    isDetour: detour !== '',
    detour,
    lanesClosed: 0,
    lanesTotal: 0,
    weightLimit: 0,
    widthLimit: 0,
    heightChange: { feet: 0, inches: 0 },
    bridgeInvolved: false,
    inWorkZone: (event.OriginalEventType || event.EventType) === 'roadwork',
    fatality: /fatal/i.test(text),
    hazardousMaterials: false,
    commercialVehicle: false,
    overturnedCommercialVehicle: false,
    creationDate: unixToIso(event.Reported),
    crossStreetPrefix: '',
    crossStreetNumber: 0,
    crossStreetSuffix: '',
    crossStreetCommonName: '',
    eventId: 0,
    event: '',
    constructionDateTime: '',
    constructionContactNumber: '',
    link: '',
    polyline: encodedPolylineToWkt(event.EncodedPolyline),
    createdFromConcurrent: false,
    movableConstruction: '',
    workZoneSpeedLimit: 0,
    icmProject: false,
  };
}
