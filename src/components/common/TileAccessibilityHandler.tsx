import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

/**
 * Marks base map tiles as decorative for accessibility (WCAG 2.2 AAA).
 * Must be rendered inside a react-leaflet MapContainer.
 *
 * Sets alt="", role="presentation", and aria-hidden="true" on tile images
 * so screen readers skip the decorative base map.
 */
export function TileAccessibilityHandler() {
  const map = useMap();

  useEffect(() => {
    const mapContainer = map.getContainer();

    const markTileAsDecorative = (tile: Element) => {
      if (!tile.hasAttribute('alt') || tile.getAttribute('alt') !== '') {
        tile.setAttribute('alt', '');
      }
      if (!tile.hasAttribute('role')) {
        tile.setAttribute('role', 'presentation');
      }
      if (!tile.hasAttribute('aria-hidden')) {
        tile.setAttribute('aria-hidden', 'true');
      }
    };

    const processExistingTiles = () => {
      const tileImages = mapContainer.querySelectorAll('.leaflet-tile-pane img');
      tileImages.forEach(markTileAsDecorative);
    };

    processExistingTiles();

    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node instanceof HTMLImageElement && node.classList.contains('leaflet-tile')) {
            markTileAsDecorative(node);
          }
        });
      });
    });

    const tilePane = mapContainer.querySelector('.leaflet-tile-pane');
    if (tilePane) {
      observer.observe(tilePane, { childList: true, subtree: true });
    }

    const handleTileLoad = (e: L.TileEvent) => {
      const tile = e.tile as HTMLImageElement;
      if (tile) markTileAsDecorative(tile);
    };

    map.eachLayer(layer => {
      if (layer instanceof L.TileLayer) {
        layer.on('tileload', handleTileLoad);
      }
    });

    const reprocessTiles = () => {
      setTimeout(processExistingTiles, 100);
    };

    map.on('moveend', reprocessTiles);
    map.on('zoomend', reprocessTiles);

    return () => {
      observer.disconnect();
      map.eachLayer(layer => {
        if (layer instanceof L.TileLayer) {
          layer.off('tileload', handleTileLoad);
        }
      });
      map.off('moveend', reprocessTiles);
      map.off('zoomend', reprocessTiles);
    };
  }, [map]);

  return null;
}
