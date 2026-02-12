import type { DukeOutage } from '../../types/duke';
import { getDukeCustomersAffected } from '../../types/duke';
import type { GenericAlert } from '../../types/alerts';
import { mapDukeOutageSeverity, ALERT_SEVERITY_CONFIG } from '../../types/alerts';
import { buildMapUrlIfValid } from '../../utils/mapUrl';
import { formatTimeDisplay } from '../../utils/dateFormatting';

/** Parse a point from Duke API: supports { lat, lng } or { x, y } (x=lng, y=lat) */
function parsePoint(p: {
  lat?: number;
  lng?: number;
  x?: number;
  y?: number;
}): [number, number] | null {
  if (Number.isFinite(p.lat) && Number.isFinite(p.lng)) {
    return [p.lat as number, p.lng as number];
  }
  if (Number.isFinite(p.y) && Number.isFinite(p.x)) {
    return [p.y as number, p.x as number];
  }
  return null;
}

/**
 * Reorder polygon vertices into proper perimeter order using convex hull.
 * Duke API may return vertices in arbitrary order, causing self-intersecting shapes.
 */
function reorderPolygonVertices(points: [number, number][]): [number, number][] {
  if (points.length < 3) return points;

  const cross = (o: [number, number], a: [number, number], b: [number, number]) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

  const bottom = points.reduce((min, p) => (p[0] < min[0] ? p : min));
  const byAngle = [...points].sort((a, b) => {
    const angleA = Math.atan2(a[0] - bottom[0], a[1] - bottom[1]);
    const angleB = Math.atan2(b[0] - bottom[0], b[1] - bottom[1]);
    if (angleA !== angleB) return angleA - angleB;
    const da = (a[0] - bottom[0]) ** 2 + (a[1] - bottom[1]) ** 2;
    const db = (b[0] - bottom[0]) ** 2 + (b[1] - bottom[1]) ** 2;
    return da - db;
  });

  const hull: [number, number][] = [];
  for (const p of byAngle) {
    while (hull.length >= 2 && cross(hull[hull.length - 2], hull[hull.length - 1], p) <= 0) {
      hull.pop();
    }
    hull.push(p);
  }
  return hull;
}

/** Create a circular polygon around a point; ~0.5 km radius by default */
function createCirclePolygon(
  centerLat: number,
  centerLng: number,
  radiusDegrees = 0.0045
): [number, number][] {
  const points: [number, number][] = [];
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * 2 * Math.PI;
    points.push([
      centerLat + radiusDegrees * Math.cos(angle),
      centerLng + radiusDegrees * Math.sin(angle),
    ]);
  }
  return points;
}

/**
 * Extract outage area polygon from trfPolygonXyLoc or convexHull.
 * When no polygon data exists, creates a circular buffer around the device location.
 */
function extractOutagePolygon(outage: DukeOutage): { polygon: [number, number][] } | object {
  const points = outage.trfPolygonXyLoc ?? outage.convexHull;
  if (Array.isArray(points) && points.length >= 3) {
    const raw: [number, number][] = [];
    for (const p of points) {
      const pt = parsePoint(p as { lat?: number; lng?: number; x?: number; y?: number });
      if (pt) raw.push(pt);
    }
    if (raw.length >= 3) {
      const polygon = reorderPolygonVertices(raw);
      if (polygon.length >= 3) return { polygon };
    }
  }

  const lat = outage.deviceLatitudeLocation;
  const lng = outage.deviceLongitudeLocation;
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    const customers = getDukeCustomersAffected(outage);
    const radius = customers >= 1000 ? 0.008 : customers >= 100 ? 0.006 : 0.0045;
    return { polygon: createCirclePolygon(lat, lng, radius) };
  }
  return {};
}

// Convert Duke Energy outage to generic alert format
export function convertDukeOutageToGeneric(outage: DukeOutage): GenericAlert {
  const customersAffected = getDukeCustomersAffected(outage);
  const severity = mapDukeOutageSeverity(customersAffected);
  const estimatedRestoration = formatTimeDisplay(outage.estimatedRestorationTime);
  const isPlanned = outage.outageCause === 'planned';

  // Build summary
  const summaryParts: string[] = [
    `${customersAffected.toLocaleString()} customer${customersAffected === 1 ? '' : 's'} affected`,
  ];
  if (outage.operationCenterName) {
    summaryParts.push(`Location: ${outage.operationCenterName}`);
  }
  if (estimatedRestoration) {
    summaryParts.push(`Est. restoration: ${estimatedRestoration}`);
  }
  if (outage.outageCause) {
    summaryParts.push(isPlanned ? 'Planned outage' : 'Unplanned outage');
  }

  // Build description with additional details
  const descriptionParts: string[] = [];
  descriptionParts.push(`Type: ${isPlanned ? 'Planned maintenance' : 'Unplanned outage'}`);
  descriptionParts.push(`Customers affected: ${customersAffected.toLocaleString()}`);
  if (estimatedRestoration) {
    descriptionParts.push(`Estimated restoration: ${estimatedRestoration}`);
  }
  descriptionParts.push(`Event ID: ${outage.sourceEventNumber}`);
  if (outage.causeDescription?.trim()) {
    descriptionParts.push(`Cause: ${outage.causeDescription.trim()}`);
  }
  if (outage.crewStatTxt?.trim()) {
    descriptionParts.push(`Crew status: ${outage.crewStatTxt.trim()}`);
  }

  // Build instruction based on outage type
  const instruction = isPlanned
    ? 'This is a planned outage for maintenance. Power should be restored by the estimated time.'
    : 'Duke Energy is aware of this outage and working to restore power. For updates, visit duke-energy.com/outages or call 1-800-769-3766.';

  return {
    id: `duke-${outage.sourceEventNumber}`,
    source: 'duke',
    category: 'power',
    severity,
    title: isPlanned ? 'Planned Power Outage' : 'Power Outage',
    summary: summaryParts.join(' • '),
    description: descriptionParts.join('\n'),
    instruction,
    affectedArea: outage.operationCenterName || 'Mecklenburg County',
    endTime: outage.estimatedRestorationTime
      ? new Date(outage.estimatedRestorationTime)
      : undefined,
    updatedAt: new Date(),
    url: buildMapUrlIfValid(outage.deviceLatitudeLocation, outage.deviceLongitudeLocation),
    metadata: {
      source: 'duke',
      customersAffected,
      cause: outage.outageCause ?? 'unplanned',
      planned: isPlanned,
      eventId: outage.sourceEventNumber,
      displaySeverity: ALERT_SEVERITY_CONFIG[severity].label,
      operationCenter: outage.operationCenterName,
      latitude:
        outage.deviceLatitudeLocation != null && Number.isFinite(outage.deviceLatitudeLocation)
          ? outage.deviceLatitudeLocation
          : undefined,
      longitude:
        outage.deviceLongitudeLocation != null && Number.isFinite(outage.deviceLongitudeLocation)
          ? outage.deviceLongitudeLocation
          : undefined,
      ...extractOutagePolygon(outage),
    },
  };
}

// Convert all Duke outages to generic format
export function convertDukeOutagesToGeneric(outages: DukeOutage[]): GenericAlert[] {
  return outages.map(convertDukeOutageToGeneric);
}
