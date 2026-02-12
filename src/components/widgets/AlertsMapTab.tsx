import React, { useEffect, useMemo, useRef, useCallback } from 'react';
import { useTheme } from 'styled-components';
import {
  MapContainer as LeafletMapContainer,
  Marker,
  Polygon,
  Polyline,
  Tooltip as LeafletTooltipPrimitive,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { GenericAlert } from '../../types/alerts';
import { RetryTileLayer } from './RetryTileLayer';
import { MapRecenterButton } from '../common';
import {
  getAlertCoordinateList,
  getAlertPolylineSegments,
  getAlertPolygon,
  getAlertSegmentCoordinates,
  createAlertMarkerIcon,
  FitBounds,
} from './alertsMapUtils';
import {
  AlertsFullMapContainer,
  NoGeoAlertsContainer,
  MapControlsOverlay,
} from './AlertsMapTab.styles';

const CHARLOTTE_CENTER: [number, number] = [35.2271, -80.8431];
const DEFAULT_ZOOM = 11;

// Mark base map tiles as decorative for accessibility
function TileAccessibilityHandler() {
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

// Invalidate map size when it becomes visible (fixes hidden tab sizing)
function MapSizeInvalidator({ active }: { active: boolean }) {
  const map = useMap();

  useEffect(() => {
    if (active) {
      // Delay to allow CSS display change to propagate
      const timer = setTimeout(() => {
        map.invalidateSize();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [active, map]);

  return null;
}

interface AlertWithGeo {
  alert: GenericAlert;
  coordinates: { lat: number; lng: number }[];
  polylineSegments: [number, number][][];
  polygon: [number, number][] | null;
}

export interface AlertsMapTabProps {
  alerts: GenericAlert[];
  alertSeverityConfig: Record<string, { color: string; bgColor: string; label: string }>;
  onAlertSelect: (alert: GenericAlert) => void;
  active: boolean;
}

export function AlertsMapTab({
  alerts,
  alertSeverityConfig,
  onAlertSelect,
  active,
}: AlertsMapTabProps) {
  const theme = useTheme();
  const mapRef = useRef<L.Map | null>(null);

  const mapTileUrl =
    theme.name === 'dark'
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

  // Filter alerts to those with coordinates
  const geoAlerts: AlertWithGeo[] = useMemo(() => {
    const result: AlertWithGeo[] = [];
    for (const alert of alerts) {
      const coordinates = getAlertCoordinateList(alert);
      if (coordinates.length > 0) {
        const polylineSegments = getAlertPolylineSegments(alert);
        const polygon = getAlertPolygon(alert);
        result.push({ alert, coordinates, polylineSegments, polygon });
      }
    }
    return result;
  }, [alerts]);

  // Collect all positions for FitBounds
  const allPositions: [number, number][] = useMemo(() => {
    const positions: [number, number][] = [];
    for (const { coordinates } of geoAlerts) {
      for (const coord of coordinates) {
        positions.push([coord.lat, coord.lng]);
      }
    }
    return positions;
  }, [geoAlerts]);

  const handleRecenter = useCallback(() => {
    if (mapRef.current) {
      if (allPositions.length > 1) {
        const bounds = L.latLngBounds(allPositions);
        mapRef.current.fitBounds(bounds, { padding: [24, 24], maxZoom: 14 });
      } else if (allPositions.length === 1) {
        mapRef.current.setView(allPositions[0], 14);
      } else {
        mapRef.current.setView(CHARLOTTE_CENTER, DEFAULT_ZOOM);
      }
    }
  }, [allPositions]);

  if (geoAlerts.length === 0) {
    return <NoGeoAlertsContainer>No geo-located alerts</NoGeoAlertsContainer>;
  }

  return (
    <AlertsFullMapContainer>
      <LeafletMapContainer
        center={CHARLOTTE_CENTER}
        zoom={DEFAULT_ZOOM}
        zoomControl={true}
        scrollWheelZoom={false}
        dragging={true}
        maxZoom={10}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
        aria-label="Alert locations map for Charlotte area"
      >
        <TileAccessibilityHandler />
        <MapSizeInvalidator active={active} />
        <RetryTileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url={mapTileUrl}
          maxRetries={3}
          retryDelay={1000}
        />

        {allPositions.length > 1 && <FitBounds positions={allPositions} />}

        {geoAlerts.map(({ alert, coordinates, polylineSegments, polygon }) => {
          const severityConfig = alertSeverityConfig[alert.severity];

          // Polygon (Duke outage area)
          if (polygon) {
            return (
              <Polygon
                key={alert.id}
                positions={polygon}
                pathOptions={{
                  color: severityConfig.color,
                  fillColor: severityConfig.color,
                  fillOpacity: 0.25,
                  weight: 2,
                  opacity: 0.8,
                }}
                eventHandlers={{
                  click: () => onAlertSelect(alert),
                }}
              >
                <AlertTooltip alert={alert} />
              </Polygon>
            );
          }

          // Multiple polyline segments (e.g., consolidated NCDOT alerts)
          if (polylineSegments.length > 1) {
            return polylineSegments.map((segment, i) => (
              <Polyline
                key={`${alert.id}-seg-${i}`}
                positions={segment}
                pathOptions={{
                  color: severityConfig.color,
                  weight: 5,
                  opacity: 0.9,
                }}
                eventHandlers={{
                  click: () => onAlertSelect(alert),
                }}
              >
                <AlertTooltip alert={alert} />
              </Polyline>
            ));
          }

          // Single polyline
          if (polylineSegments.length === 1) {
            return (
              <Polyline
                key={alert.id}
                positions={polylineSegments[0]}
                pathOptions={{
                  color: severityConfig.color,
                  weight: 5,
                  opacity: 0.9,
                }}
                eventHandlers={{
                  click: () => onAlertSelect(alert),
                }}
              >
                <AlertTooltip alert={alert} />
              </Polyline>
            );
          }

          // Multiple markers (e.g., NCDOT consolidated when shapePoints fail validation)
          const segmentCoords = getAlertSegmentCoordinates(alert);
          if (segmentCoords.length > 1) {
            const markerIcon = createAlertMarkerIcon(severityConfig.color);
            return (
              <React.Fragment key={alert.id}>
                {segmentCoords.map((coord, i) => (
                  <Marker
                    key={`${alert.id}-seg-${i}`}
                    position={[coord.lat, coord.lng]}
                    icon={markerIcon}
                    eventHandlers={{
                      click: () => onAlertSelect(alert),
                    }}
                  >
                    <AlertTooltip alert={alert} />
                  </Marker>
                ))}
              </React.Fragment>
            );
          }

          // Single point marker
          const position: [number, number] = [coordinates[0].lat, coordinates[0].lng];
          const markerIcon = createAlertMarkerIcon(severityConfig.color);
          return (
            <Marker
              key={alert.id}
              position={position}
              icon={markerIcon}
              eventHandlers={{
                click: () => onAlertSelect(alert),
              }}
            >
              <AlertTooltip alert={alert} />
            </Marker>
          );
        })}
      </LeafletMapContainer>

      <MapControlsOverlay>
        <MapRecenterButton
          onClick={handleRecenter}
          title="Reset map view"
          aria-label="Reset map view"
        />
      </MapControlsOverlay>
    </AlertsFullMapContainer>
  );
}

function AlertTooltip({ alert }: { alert: GenericAlert }) {
  return (
    <LeafletTooltipPrimitive direction="top" offset={[0, -20]} opacity={0.95}>
      <strong>{alert.title}</strong>
      {alert.affectedArea && <br />}
      {alert.affectedArea &&
        (alert.affectedArea.length > 80
          ? `${alert.affectedArea.slice(0, 80)}...`
          : alert.affectedArea)}
    </LeafletTooltipPrimitive>
  );
}
