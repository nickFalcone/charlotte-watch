import { useEffect, useMemo, useRef, useCallback } from 'react';
import { useTheme } from 'styled-components';
import { useQuery } from '@tanstack/react-query';
import {
  MapContainer as LeafletMapContainer,
  Polyline,
  CircleMarker,
  Marker,
  Tooltip as LeafletTooltip,
  Popup as LeafletPopup,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import blueLineSvgRaw from '../../assets/icons/blue-line.svg?raw';
import goldLineSvgRaw from '../../assets/icons/gold-line.svg?raw';
import type { WidgetProps } from '../../types';
import { queryKeys } from '../../utils/queryKeys';
import { fetchTransitVehicles } from '../../utils/transitApi';
import { fetchCATSTwitter } from '../../utils/catsApi';
import { getDirectionLabel, findNearestStation } from '../../utils/transitHelpers';
import { isServiceAlertTweet } from '../../utils/catsFilters';
import { stripEmojis, stripTcoLinks } from '../../utils/textUtils';
import { useWidgetMetadata } from '../Widget/useWidgetMetadata';
import {
  BLUE_LINE_PATH,
  GOLD_LINE_PATH,
  BLUE_LINE_STATIONS,
  GOLD_LINE_STATIONS,
  type TransitStation,
} from '../../data/transitRoutes';
import { BaseMapTileLayer } from './BaseMapTileLayer';
import {
  TileAccessibilityHandler,
  FitBounds,
  MapRecenterButton,
  MapResizeInvalidator,
} from '../common';
import {
  TransitMapContainer,
  MapControlsOverlay,
  TransitLoadingContainer,
  TransitAlertStrip,
  TransitAlertItem,
  TransitAlertText,
  TransitAlertLink,
} from './TransitWidget.styles';
import type { TransitVehiclePosition } from '../../types/transit';

// ─── TransitlandAttribution ──────────────────────────────────────────────────

const TRANSITLAND_ATTRIBUTION =
  'Powered by <a href="https://www.transit.land/terms" target="_blank" rel="noopener noreferrer">Transitland</a>';

function TransitlandAttribution() {
  const map = useMap();

  // Sync with external system (Leaflet attribution control) — add on mount, remove on unmount
  useEffect(() => {
    map.attributionControl.addAttribution(TRANSITLAND_ATTRIBUTION);
    return () => {
      map.attributionControl.removeAttribution(TRANSITLAND_ATTRIBUTION);
    };
  }, [map]);

  return null;
}

const BLUE = '#0168b3';
const GOLD = '#ffd106';

// All route coordinate points for initial map fit
const ALL_ROUTE_POSITIONS: [number, number][] = [...BLUE_LINE_PATH, ...GOLD_LINE_PATH];

// ─── Helpers ────────────────────────────────────────────────────────────────

function msToMph(ms: number): number {
  return Math.round(ms * 2.237);
}

function secondsAgo(unixSeconds: number): string {
  const s = Math.floor(Date.now() / 1000 - unixSeconds);
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
}

// ─── Vehicle icon ────────────────────────────────────────────────────────────

function createVehicleIcon(color: string, svgRaw: string, bearing?: number): L.DivIcon {
  const coloredSvg = svgRaw
    .replace('fill="#e3e3e3"', `fill="${color}"`)
    .replace(/width="\d+px"/, 'width="22px"')
    .replace(/height="\d+px"/, 'height="22px"');

  // Arrow orbits the circle center. The arrow box sits at top:-7px, left:50% (left edge = 16px).
  // transform-origin: 0px 23px rotates around (16px, 16px) = circle center.
  const arrowHtml =
    bearing !== undefined
      ? `<div style="
          position: absolute;
          top: -7px;
          left: 50%;
          width: 0;
          height: 0;
          border-left: 5px solid transparent;
          border-right: 5px solid transparent;
          border-bottom: 8px solid ${color};
          transform: rotate(${bearing}deg);
          transform-origin: 0px 23px;
        "></div>`
      : '';

  return L.divIcon({
    html: `<div style="
      position: relative;
      width: 32px;
      height: 32px;
      filter: drop-shadow(0 1px 4px rgba(0,0,0,0.6));
    ">
      <div style="
        width: 32px;
        height: 32px;
        background: #ffffff;
        border-radius: 50%;
        border: 2px solid ${color};
        display: flex;
        align-items: center;
        justify-content: center;
      ">${coloredSvg}</div>
      ${arrowHtml}
    </div>`,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

// ─── VehicleMarker ───────────────────────────────────────────────────────────

interface VehicleMarkerProps {
  vehicle: TransitVehiclePosition;
  color: string;
  svgRaw: string;
}

function VehicleMarker({ vehicle, color, svgRaw }: VehicleMarkerProps) {
  const icon = useMemo(
    () => createVehicleIcon(color, svgRaw, vehicle.bearing),
    [color, svgRaw, vehicle.bearing]
  );

  const lineName = vehicle.routeId === '501' ? 'LYNX Blue Line' : 'CityLYNX Gold Line';
  const nearestStation = findNearestStation(vehicle.lat, vehicle.lng, vehicle.routeId);

  const statusText =
    vehicle.currentStatus === 'INCOMING_AT' && nearestStation
      ? `Approaching ${nearestStation.name}`
      : vehicle.currentStatus === 'STOPPED_AT' && nearestStation
        ? `Stopped at ${nearestStation.name}`
        : 'In transit';

  const speedMph =
    vehicle.speed !== undefined && vehicle.speed > 0.5 ? msToMph(vehicle.speed) : null;

  return (
    <Marker position={[vehicle.lat, vehicle.lng]} icon={icon} title={vehicle.label}>
      <LeafletTooltip direction="top" offset={[0, -18]} opacity={0.95}>
        <strong>{vehicle.label}</strong>
      </LeafletTooltip>
      <LeafletPopup>
        <div style={{ minWidth: 170, fontFamily: 'inherit', fontSize: 13 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{vehicle.label}</div>
          <div style={{ fontWeight: 600, color, marginBottom: 8, fontSize: 12 }}>{lineName}</div>
          <div style={{ marginBottom: 3 }}>{statusText}</div>
          {vehicle.bearing !== undefined && (
            <div style={{ marginBottom: 3 }}>{getDirectionLabel(vehicle.bearing)}</div>
          )}
          {speedMph !== null && <div style={{ marginBottom: 3 }}>{speedMph} mph</div>}
          <div style={{ marginTop: 8, fontSize: 11, opacity: 0.6 }}>
            GPS updated {secondsAgo(vehicle.timestamp)}
          </div>
        </div>
      </LeafletPopup>
    </Marker>
  );
}

// ─── StationMarker ───────────────────────────────────────────────────────────

interface StationMarkerProps {
  station: TransitStation;
  routeId: '501' | '510';
  fillColor: string;
  strokeColor: string;
  vehicles: TransitVehiclePosition[];
}

function StationMarker({ station, routeId, fillColor, strokeColor, vehicles }: StationMarkerProps) {
  const lineName = routeId === '501' ? 'LYNX Blue Line' : 'CityLYNX Gold Line';

  const atStation = vehicles.filter(v => {
    if (v.routeId !== routeId) return false;
    if (v.currentStatus !== 'INCOMING_AT' && v.currentStatus !== 'STOPPED_AT') return false;
    return findNearestStation(v.lat, v.lng, routeId)?.name === station.name;
  });

  const approaching = atStation.filter(v => v.currentStatus === 'INCOMING_AT');
  const stopped = atStation.filter(v => v.currentStatus === 'STOPPED_AT');

  return (
    <CircleMarker
      center={[station.lat, station.lng]}
      radius={5}
      pathOptions={{ color: strokeColor, weight: 2, fillColor, fillOpacity: 1 }}
    >
      <LeafletTooltip direction="top" offset={[0, -6]} opacity={0.95}>
        {station.name}
      </LeafletTooltip>
      <LeafletPopup>
        <div style={{ minWidth: 170, fontFamily: 'inherit', fontSize: 13 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{station.name}</div>
          <div style={{ fontWeight: 600, color: fillColor, marginBottom: 8, fontSize: 12 }}>
            {lineName}
          </div>
          {approaching.length > 0 && (
            <div style={{ marginBottom: 6 }}>
              <div style={{ fontWeight: 600, marginBottom: 2 }}>Approaching</div>
              {approaching.map(v => (
                <div key={v.id} style={{ paddingLeft: 8, fontSize: 12 }}>
                  {v.label}
                  {v.bearing !== undefined ? ` · ${getDirectionLabel(v.bearing)}` : ''}
                </div>
              ))}
            </div>
          )}
          {stopped.length > 0 && (
            <div>
              <div style={{ fontWeight: 600, marginBottom: 2 }}>Stopped</div>
              {stopped.map(v => (
                <div key={v.id} style={{ paddingLeft: 8, fontSize: 12 }}>
                  {v.label}
                  {v.bearing !== undefined ? ` · ${getDirectionLabel(v.bearing)}` : ''}
                </div>
              ))}
            </div>
          )}
          {approaching.length === 0 && stopped.length === 0 && (
            <div style={{ fontSize: 12, opacity: 0.6 }}>No vehicles currently here</div>
          )}
        </div>
      </LeafletPopup>
    </CircleMarker>
  );
}

// ─── TransitWidget ───────────────────────────────────────────────────────────

export function TransitWidget(_props: WidgetProps) {
  const { setLastUpdated } = useWidgetMetadata();
  const theme = useTheme();
  const stationStroke = theme.colors.text;
  const mapRef = useRef<L.Map | null>(null);

  const {
    data: vehicles,
    dataUpdatedAt,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.transit.vehiclePositions,
    queryFn: ({ signal }) => fetchTransitVehicles(signal),
    refetchInterval: 60000,
    staleTime: 55000,
    refetchOnWindowFocus: true,
  });

  const { data: tweets } = useQuery({
    queryKey: queryKeys.cats.twitter,
    queryFn: ({ signal }) => fetchCATSTwitter(signal),
    refetchInterval: 2 * 60000,
    staleTime: 90000,
  });

  const serviceAlerts = useMemo(
    () => (tweets ?? []).filter(t => isServiceAlertTweet(t.text)),
    [tweets]
  );

  // Sync last-fetch time to widget header
  useEffect(() => {
    if (dataUpdatedAt > 0) setLastUpdated(dataUpdatedAt);
  }, [dataUpdatedAt, setLastUpdated]);

  const blueVehicles = useMemo(() => vehicles?.filter(v => v.routeId === '501') ?? [], [vehicles]);
  const goldVehicles = useMemo(() => vehicles?.filter(v => v.routeId === '510') ?? [], [vehicles]);

  const handleRecenter = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const bounds = L.latLngBounds(ALL_ROUTE_POSITIONS);
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 14 });
  }, []);

  if (isLoading && !vehicles) {
    return <TransitLoadingContainer>Loading transit data...</TransitLoadingContainer>;
  }

  if (isError) {
    return (
      <TransitLoadingContainer>
        <div>Unable to load transit data.</div>
        <button type="button" onClick={() => refetch()}>
          Retry
        </button>
      </TransitLoadingContainer>
    );
  }
  return (
    <TransitMapContainer>
      <LeafletMapContainer
        center={[35.227, -80.843]}
        zoom={11}
        zoomControl={true}
        scrollWheelZoom={false}
        dragging={true}
        minZoom={11}
        maxZoom={18}
        style={{ flex: 1, minHeight: 0, width: '100%' }}
        ref={mapRef}
        aria-label="LYNX Blue and Gold Line live transit map"
      >
        <TileAccessibilityHandler />
        <MapResizeInvalidator />
        <TransitlandAttribution />
        <BaseMapTileLayer />
        <FitBounds positions={ALL_ROUTE_POSITIONS} />

        {/* Blue Line track */}
        <Polyline
          positions={BLUE_LINE_PATH}
          pathOptions={{ color: BLUE, weight: 4, opacity: 0.9 }}
        />

        {/* Gold Line track */}
        <Polyline
          positions={GOLD_LINE_PATH}
          pathOptions={{ color: GOLD, weight: 4, opacity: 0.9 }}
        />

        {/* Blue Line stations */}
        {BLUE_LINE_STATIONS.map(station => (
          <StationMarker
            key={`blue-${station.name}`}
            station={station}
            routeId="501"
            fillColor={BLUE}
            strokeColor={stationStroke}
            vehicles={blueVehicles}
          />
        ))}

        {/* Gold Line stations */}
        {GOLD_LINE_STATIONS.map(station => (
          <StationMarker
            key={`gold-${station.name}`}
            station={station}
            routeId="510"
            fillColor={GOLD}
            strokeColor={stationStroke}
            vehicles={goldVehicles}
          />
        ))}

        {/* Live Blue Line vehicles */}
        {blueVehicles.map(vehicle => (
          <VehicleMarker key={vehicle.id} vehicle={vehicle} color={BLUE} svgRaw={blueLineSvgRaw} />
        ))}

        {/* Live Gold Line vehicles */}
        {goldVehicles.map(vehicle => (
          <VehicleMarker key={vehicle.id} vehicle={vehicle} color={GOLD} svgRaw={goldLineSvgRaw} />
        ))}
      </LeafletMapContainer>

      {serviceAlerts.length > 0 && (
        <TransitAlertStrip>
          {serviceAlerts.map(tweet => (
            <TransitAlertItem key={tweet.id}>
              <TransitAlertText>{stripTcoLinks(stripEmojis(tweet.text))}</TransitAlertText>
              <TransitAlertLink
                href={`https://x.com/CATSRideTransit/status/${tweet.id}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="View on X"
              >
                View on X
              </TransitAlertLink>
            </TransitAlertItem>
          ))}
        </TransitAlertStrip>
      )}

      <MapControlsOverlay>
        <MapRecenterButton
          onClick={handleRecenter}
          title="Reset map view"
          aria-label="Reset map view"
        />
      </MapControlsOverlay>
    </TransitMapContainer>
  );
}
