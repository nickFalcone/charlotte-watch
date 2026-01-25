import { useEffect } from 'react';
import { TileLayer, useMap } from 'react-leaflet';
import type { TileLayer as LeafletTileLayer, TileErrorEvent } from 'leaflet';

interface RetryTileLayerProps {
  url: string;
  attribution: string;
  maxRetries?: number;
  retryDelay?: number;
}

// TileLayer with automatic retry on failed tiles
export function RetryTileLayer({
  url,
  attribution,
  maxRetries = 3,
  retryDelay = 1000,
}: RetryTileLayerProps) {
  const map = useMap();

  // Sync with Leaflet map events (third-party library) to implement tile retry logic.
  // Leaflet's tile loading is imperative, so we need useEffect to attach/detach event handlers.
  // Cleanup: removes event handlers to prevent memory leaks when component unmounts or deps change.
  useEffect(() => {
    // Track retry counts per tile
    const retryCount = new Map<string, number>();

    const handleTileError = (event: TileErrorEvent) => {
      const tile = event.tile as HTMLImageElement;
      const src = tile.src;

      // Get current retry count for this tile
      const currentRetries = retryCount.get(src) || 0;

      if (currentRetries < maxRetries) {
        retryCount.set(src, currentRetries + 1);

        // Retry after delay with cache-busting param
        setTimeout(
          () => {
            const separator = src.includes('?') ? '&' : '?';
            tile.src = `${src}${separator}_retry=${currentRetries + 1}`;
          },
          retryDelay * (currentRetries + 1)
        ); // Exponential backoff
      }
    };

    // Find the tile layer and attach error handler
    map.eachLayer(layer => {
      if ((layer as LeafletTileLayer).getTileUrl) {
        layer.on('tileerror', handleTileError);
      }
    });

    return () => {
      map.eachLayer(layer => {
        if ((layer as LeafletTileLayer).getTileUrl) {
          layer.off('tileerror', handleTileError);
        }
      });
    };
  }, [map, maxRetries, retryDelay]); // Re-attach handlers if map instance or config changes

  return (
    <TileLayer
      attribution={attribution}
      url={url}
      // Additional options to improve reliability
      maxNativeZoom={18}
      maxZoom={19}
      errorTileUrl="" // Prevents broken image icon
      crossOrigin="anonymous"
    />
  );
}
