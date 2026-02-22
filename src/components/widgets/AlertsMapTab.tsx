import React, { useMemo, useRef, useCallback, useEffect } from 'react';
import { useAlertSeverityConfig } from '../../hooks';
import {
  MapContainer as LeafletMapContainer,
  Marker,
  Polygon,
  Polyline,
  Tooltip as LeafletTooltipPrimitive,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { GenericAlert } from '../../types/alerts';
import { BaseMapTileLayer } from './BaseMapTileLayer';
import { MapRecenterButton, TileAccessibilityHandler } from '../common';
import { CHARLOTTE_CENTER } from '../../utils/mapConstants';
import {
  getAlertCoordinateList,
  getAlertPolylineSegments,
  getAlertPolygon,
  getAlertSegmentCoordinates,
  createAlertMarkerIcon,
} from './alertsMapUtils';
import {
  AlertsFullMapContainer,
  NoGeoAlertsContainer,
  MapControlsOverlay,
} from './AlertsMapTab.styles';

const DEFAULT_ZOOM = 11;

interface AlertWithGeo {
  alert: GenericAlert;
  coordinates: { lat: number; lng: number }[];
  polylineSegments: [number, number][][];
  polygon: [number, number][] | null;
}

export interface AlertsMapTabProps {
  alerts: GenericAlert[];
  onAlertSelect: (alert: GenericAlert) => void;
  active: boolean;
}

export function AlertsMapTab({ alerts, onAlertSelect, active }: AlertsMapTabProps) {
  const alertSeverityConfig = useAlertSeverityConfig();
  const mapRef = useRef<L.Map | null>(null);

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

  const fitMapToBounds = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    if (allPositions.length > 1) {
      const bounds = L.latLngBounds(allPositions);
      map.fitBounds(bounds, { padding: [24, 24], maxZoom: 14 });
    } else if (allPositions.length === 1) {
      map.setView(allPositions[0], DEFAULT_ZOOM);
    } else {
      map.setView(CHARLOTTE_CENTER, DEFAULT_ZOOM);
    }
  }, [allPositions]);

  // When the tab becomes visible, invalidate Leaflet's cached size first (the
  // container was display:none), then fit bounds with the correct dimensions.
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => {
      mapRef.current?.invalidateSize();
      fitMapToBounds();
    }, 50);
    return () => clearTimeout(timer);
  }, [active, fitMapToBounds]);

  const handleRecenter = useCallback(() => {
    fitMapToBounds();
  }, [fitMapToBounds]);

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
        maxZoom={18}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
        aria-label="Alert locations map for Charlotte area"
      >
        <TileAccessibilityHandler />
        <BaseMapTileLayer />

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
                    title={alert.title}
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
              title={alert.title}
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
