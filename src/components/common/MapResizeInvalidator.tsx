import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

/**
 * Calls map.invalidateSize() whenever the map container is resized.
 * Fixes Leaflet tile and polyline rendering when the widget is resized.
 * Must be rendered inside a react-leaflet MapContainer.
 */
export function MapResizeInvalidator() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);

  return null;
}
