import L from 'leaflet';
import type { GenericAlert } from '../../types/alerts';

/** Extract displaySeverity from typed metadata */
export function getDisplaySeverity(alert: GenericAlert): string | undefined {
  if (!alert.metadata) return undefined;
  if ('displaySeverity' in alert.metadata && typeof alert.metadata.displaySeverity === 'string') {
    return alert.metadata.displaySeverity;
  }
  return undefined;
}

/** Extract a single coordinate from alert metadata */
export function getAlertCoordinates(alert: GenericAlert): { lat: number; lng: number } | null {
  if (!alert.metadata) return null;

  if (
    (alert.metadata.source === 'ncdot' ||
      alert.metadata.source === 'cmpd' ||
      alert.metadata.source === 'duke' ||
      alert.metadata.source === 'cfd' ||
      alert.metadata.source === 'here-flow') &&
    'latitude' in alert.metadata &&
    'longitude' in alert.metadata &&
    typeof alert.metadata.latitude === 'number' &&
    typeof alert.metadata.longitude === 'number'
  ) {
    return { lat: alert.metadata.latitude, lng: alert.metadata.longitude };
  }

  return null;
}

/**
 * Get separate polyline segments for an alert.
 * Returns an array of polylines (each polyline is [lat, lng][]).
 * For NCDOT consolidated alerts, returns per-segment polylines to avoid
 * straight-line artifacts between non-contiguous segments.
 */
export function getAlertPolylineSegments(alert: GenericAlert): [number, number][][] {
  // Check for per-segment shapePoints (NCDOT consolidated alerts)
  if (alert.metadata && 'segments' in alert.metadata && Array.isArray(alert.metadata.segments)) {
    const segments = alert.metadata.segments as {
      shapePoints?: [number, number][];
    }[];
    const polylines = segments
      .map(seg => seg.shapePoints)
      .filter((pts): pts is [number, number][] => Array.isArray(pts) && pts.length >= 2);
    if (polylines.length > 0) return polylines;
  }

  // Check for top-level shapePoints (single incidents, other sources)
  if (
    alert.metadata &&
    'shapePoints' in alert.metadata &&
    Array.isArray(alert.metadata.shapePoints) &&
    alert.metadata.shapePoints.length >= 2
  ) {
    return [alert.metadata.shapePoints as [number, number][]];
  }

  return [];
}

/** Get polygon vertices for a Duke outage area, or null */
export function getAlertPolygon(alert: GenericAlert): [number, number][] | null {
  if (
    alert.metadata &&
    'polygon' in alert.metadata &&
    Array.isArray(alert.metadata.polygon) &&
    alert.metadata.polygon.length >= 3
  ) {
    return alert.metadata.polygon as [number, number][];
  }
  return null;
}

/**
 * Get coordinates from metadata.segments (NCDOT consolidated alerts).
 * Used when polyline shapePoints fail validation (e.g., I-485 mile marker mismatch).
 */
export function getAlertSegmentCoordinates(alert: GenericAlert): { lat: number; lng: number }[] {
  if (!alert.metadata || !('segments' in alert.metadata) || !Array.isArray(alert.metadata.segments))
    return [];
  const coords: { lat: number; lng: number }[] = [];
  for (const seg of alert.metadata.segments as { latitude?: number; longitude?: number }[]) {
    if (
      typeof seg.latitude === 'number' &&
      typeof seg.longitude === 'number' &&
      Number.isFinite(seg.latitude) &&
      Number.isFinite(seg.longitude)
    ) {
      coords.push({ lat: seg.latitude, lng: seg.longitude });
    }
  }
  return coords;
}

/** Get all coordinates for an alert (polygon, polylines, segment points, or single point) */
export function getAlertCoordinateList(alert: GenericAlert): { lat: number; lng: number }[] {
  // Check polygon vertices (Duke outage areas)
  const polygon = getAlertPolygon(alert);
  if (polygon) {
    return polygon.map(([lat, lng]) => ({ lat, lng }));
  }

  // Try polyline segments (handles both top-level and per-segment shapePoints)
  const polylineSegments = getAlertPolylineSegments(alert);
  if (polylineSegments.length > 0) {
    return polylineSegments.flatMap(seg => seg.map(([lat, lng]) => ({ lat, lng })));
  }

  // Fallback: segment lat/lng (e.g., NCDOT consolidated when shapePoints fail validation)
  const segmentCoords = getAlertSegmentCoordinates(alert);
  if (segmentCoords.length > 0) return segmentCoords;

  const single = getAlertCoordinates(alert);
  return single ? [single] : [];
}

/** Create a severity-colored marker icon for alert location (cached by color) */
const markerIconCache = new Map<string, L.DivIcon>();

export const createAlertMarkerIcon = (color: string): L.DivIcon => {
  const cached = markerIconCache.get(color);
  if (cached) return cached;

  const icon = L.divIcon({
    html: `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32" aria-hidden="true" focusable="false">
        <path
          fill="${color}"
          stroke="#fff"
          stroke-width="2"
          d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
        />
        <circle cx="12" cy="9" r="2.5" fill="#fff"/>
      </svg>
    `,
    className: 'alert-marker-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });

  markerIconCache.set(color, icon);
  return icon;
};
