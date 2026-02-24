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
    let frameId: number | null = null;

    const observer = new ResizeObserver(() => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }
      frameId = requestAnimationFrame(() => {
        map.invalidateSize();
      });
    });

    observer.observe(container);

    return () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }
      observer.disconnect();
    };
  }, [map]);

  return null;
}
