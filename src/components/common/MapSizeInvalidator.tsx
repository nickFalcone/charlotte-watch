import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

/**
 * Invalidates map size when `active` becomes true.
 * Fixes Leaflet sizing issues when a map starts in a hidden tab.
 * Must be rendered inside a react-leaflet MapContainer.
 */
export function MapSizeInvalidator({ active }: { active: boolean }) {
  const map = useMap();

  useEffect(() => {
    if (active) {
      const timer = setTimeout(() => {
        map.invalidateSize();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [active, map]);

  return null;
}
