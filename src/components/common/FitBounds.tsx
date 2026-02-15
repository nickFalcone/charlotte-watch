import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

/** Lightweight change-detection key from array length + first/last point */
function boundsKey(positions: [number, number][]): string {
  if (positions.length < 2) return '';
  const f = positions[0];
  const l = positions[positions.length - 1];
  return `${positions.length}:${f[0]},${f[1]}:${l[0]},${l[1]}`;
}

/**
 * Fits the map bounds to include all positions.
 * Must be rendered inside a react-leaflet MapContainer.
 */
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
