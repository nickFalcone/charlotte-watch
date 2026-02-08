import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
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

/** Get all coordinates for an alert (polygon, polylines, or single point) */
export function getAlertCoordinateList(alert: GenericAlert): { lat: number; lng: number }[] {
  // Check polygon vertices (Duke outage areas)
  const polygon = getAlertPolygon(alert);
  if (polygon) {
    return polygon.map(([lat, lng]) => ({ lat, lng }));
  }

  // Try polyline segments (handles both top-level and per-segment shapePoints)
  const segments = getAlertPolylineSegments(alert);
  if (segments.length > 0) {
    return segments.flatMap(seg => seg.map(([lat, lng]) => ({ lat, lng })));
  }

  const single = getAlertCoordinates(alert);
  return single ? [single] : [];
}

/** Lightweight change-detection key from array length + first/last point */
function boundsKey(positions: [number, number][]): string {
  if (positions.length < 2) return '';
  const f = positions[0];
  const l = positions[positions.length - 1];
  return `${positions.length}:${f[0]},${f[1]}:${l[0]},${l[1]}`;
}

/** Fits the map bounds to include all positions */
export function FitBounds({ positions }: { positions: [number, number][] }): null {
  const map = useMap();
  const key = boundsKey(positions);

  useEffect(() => {
    if (key === '') return;
    const bounds = L.latLngBounds(positions);
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 14 });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- key tracks meaningful changes
  }, [map, key]);
  return null;
}

/** Create a severity-colored marker icon for alert location */
export const createAlertMarkerIcon = (color: string) => {
  return L.divIcon({
    html: `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
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
};
