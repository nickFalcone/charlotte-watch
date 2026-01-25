import { useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from 'styled-components';
import { useIntersectionObserver } from '../../hooks';
import {
  MapContainer as LeafletMapContainer,
  Marker,
  Tooltip,
  Circle,
  useMap,
} from 'react-leaflet';
import { RetryTileLayer } from './RetryTileLayer';
import L from 'leaflet';
import type { Map as LeafletMap } from 'leaflet';
import type { WidgetProps, Aircraft } from '../../types';
import {
  KCLT_AIRPORT,
  getFlightPhase,
  FLIGHT_PHASE_COLORS,
  FLIGHT_PHASE_LABELS,
} from '../../types/flight';
import {
  fetchAircraftInBoundingBox,
  formatVelocity,
  formatAltitude,
  formatHeading,
  formatVerticalRate,
  formatPositionAge,
  lastContactToMs,
} from '../../utils/flightApi';
import { queryKeys } from '../../utils/queryKeys';
import { useWidgetMetadata } from '../Widget';
import 'leaflet/dist/leaflet.css';
import {
  FlightContainer,
  FlightHeader,
  AirportInfo,
  AirportCode,
  FlightCount,
  StatsRow,
  StatBadge,
  StatValue,
  MapContainer,
  MapOverlay,
  MapControls,
  ResetButton,
  LegendItem,
  LegendPlane,
  LoadingContainer,
  RadarIcon,
  LoadingText,
  ErrorContainer,
  ErrorIcon,
  ErrorText,
  RetryButton,
  CreditIndicator,
  CreditBar,
} from './FlightTrackerWidget.styles';
import { getCreditStats } from '../../utils/openSkyCredits';

const DEFAULT_ZOOM = 7;
const DEFAULT_CENTER: [number, number] = [KCLT_AIRPORT.latitude, KCLT_AIRPORT.longitude];

// Sanitize strings for safe HTML interpolation (prevent XSS)
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// Validate callsign format (alphanumeric, 1-8 chars) for safe URL construction
function isValidCallsign(callsign: string): boolean {
  return /^[A-Z0-9]{1,8}$/i.test(callsign);
}

// Calculate 3 o'clock positions for range ring labels
// At latitude ~35°, 1 degree longitude ≈ 91 km
const KM_TO_DEG_LNG = 1 / 91; // ~0.011 degrees per km longitude
const RANGE_100KM_POS: [number, number] = [
  KCLT_AIRPORT.latitude,
  KCLT_AIRPORT.longitude + 100 * KM_TO_DEG_LNG,
];
const RANGE_200KM_POS: [number, number] = [
  KCLT_AIRPORT.latitude,
  KCLT_AIRPORT.longitude + 200 * KM_TO_DEG_LNG,
];

// Range label icons with accessible names
const createRangeLabelIcon = (text: string, color: string) => {
  const safeText = escapeHtml(text);
  const safeColor = escapeHtml(color);
  return L.divIcon({
    html: `<span role="img" aria-label="${safeText} range ring" style="font-size: 9px; color: ${safeColor}; font-weight: 500; white-space: nowrap;">${safeText}</span>`,
    className: 'range-label',
    iconSize: [30, 12],
    iconAnchor: [0, 6],
  });
};

// SVG plane icon pointing up (north) - top-down airplane silhouette
const createPlaneIcon = (color: string, heading: number, callsign: string, size: number = 20) => {
  // Sanitize inputs to prevent XSS via API response manipulation
  const safeCallsign = escapeHtml(callsign);
  const safeColor = escapeHtml(color);
  const safeHeading = Number.isFinite(heading) ? heading : 0;
  const safeSize = Number.isFinite(size) ? size : 20;

  // Top-down airplane: fuselage, wings, and tail
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="${safeSize}" height="${safeSize}"
         style="transform: rotate(${safeHeading}deg); filter: drop-shadow(0 0 3px ${safeColor});"
         role="img" aria-label="Aircraft ${safeCallsign}">
      <title>Aircraft ${safeCallsign}</title>
      <!-- Fuselage -->
      <path fill="${safeColor}" d="M16 1 L18 8 L18 22 L16 28 L14 22 L14 8 Z"/>
      <!-- Wings -->
      <path fill="${safeColor}" d="M16 10 L28 16 L28 18 L18 15 L18 15 L14 15 L4 18 L4 16 Z"/>
      <!-- Tail -->
      <path fill="${safeColor}" d="M16 22 L22 26 L22 28 L16 25 L10 28 L10 26 Z"/>
      <!-- Engine pods (optional detail) -->
      <ellipse fill="${safeColor}" cx="10" cy="14" rx="1.5" ry="2" opacity="0.8"/>
      <ellipse fill="${safeColor}" cx="22" cy="14" rx="1.5" ry="2" opacity="0.8"/>
    </svg>
  `;

  return L.divIcon({
    html: svg,
    className: 'aircraft-icon',
    iconSize: [safeSize, safeSize],
    iconAnchor: [safeSize / 2, safeSize / 2],
  });
};

// Airport icon with accessible name
const createAirportIcon = () =>
  L.divIcon({
    html: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" role="img" aria-label="Charlotte Douglas International Airport">
      <title>Charlotte Douglas International Airport</title>
      <circle cx="12" cy="12" r="8" fill="#f59e0b" stroke="#fbbf24" stroke-width="2"/>
      <circle cx="12" cy="12" r="3" fill="#1a1a2e"/>
    </svg>
  `,
    className: 'airport-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

// Component to handle map reset
function MapController({ mapRef }: { mapRef: React.MutableRefObject<LeafletMap | null> }) {
  const map = useMap();
  mapRef.current = map;
  return null;
}

// Build tooltip HTML for imperative Leaflet marker (escapes all dynamic content)
function buildAircraftTooltipHtml(aircraft: Aircraft): string {
  const phase = getFlightPhase(aircraft);
  const color = FLIGHT_PHASE_COLORS[phase];
  const isOnGround = phase === 'ground';
  const c = escapeHtml(aircraft.callsign);
  const p = escapeHtml(FLIGHT_PHASE_LABELS[phase]);
  return `<div class="aircraft-tooltip" style="font-size:11px;min-width:120px;line-height:1.5;">
    <div style="font-weight:700;margin-bottom:4px;">${c} <span style="color:${color}">${p}</span></div>
    <div>Alt: ${isOnGround ? 'Ground' : formatAltitude(aircraft.altitude)}</div>
    <div>Speed: ${formatVelocity(aircraft.velocity)} | Hdg: ${formatHeading(aircraft.heading)}</div>
    <div>V/S: ${formatVerticalRate(aircraft.verticalRate)} | Position: ${formatPositionAge(aircraft)}</div>
  </div>`;
}

// Imperative layer: add/remove Leaflet markers when flights changes. Bypasses
// react-leaflet's declarative Marker so the map reliably updates after refetch.
function AircraftMarkersLayer({ flights }: { flights: Aircraft[] }) {
  const map = useMap();
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    // Remove previous aircraft layer so we never stack stale layers
    if (layerRef.current && map.hasLayer(layerRef.current)) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }

    const group = L.layerGroup();
    flights.forEach(aircraft => {
      const phase = getFlightPhase(aircraft);
      const color = FLIGHT_PHASE_COLORS[phase];
      const isOnGround = phase === 'ground';
      const altitudeFeet = aircraft.altitude * 3.28084;
      const size = isOnGround ? 16 : Math.min(24, Math.max(18, 18 + altitudeFeet / 8000));
      const icon = createPlaneIcon(color, aircraft.heading, aircraft.callsign, size);
      const marker = L.marker([aircraft.latitude, aircraft.longitude], { icon });
      marker.bindTooltip(buildAircraftTooltipHtml(aircraft), {
        direction: 'top',
        offset: [0, -12],
        opacity: 0.95,
        className: 'aircraft-tooltip',
      });
      marker.on('click', () => {
        if (aircraft.callsign && isValidCallsign(aircraft.callsign)) {
          window.open(
            `https://www.flightaware.com/live/flight/${encodeURIComponent(aircraft.callsign)}`,
            '_blank',
            'noopener,noreferrer'
          );
        }
      });
      marker.addTo(group);
    });
    group.addTo(map);
    layerRef.current = group;
    map.invalidateSize();

    return () => {
      if (layerRef.current && map.hasLayer(layerRef.current)) {
        map.removeLayer(layerRef.current);
      }
      layerRef.current = null;
    };
  }, [map, flights]);

  return null;
}

// Plane icon for legend - matching top-down silhouette
const PlaneSvg = ({ color }: { color: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="14" height="14">
    <path fill={color} d="M16 1 L18 8 L18 22 L16 28 L14 22 L14 8 Z" />
    <path fill={color} d="M16 10 L28 16 L28 18 L18 15 L14 15 L4 18 L4 16 Z" />
    <path fill={color} d="M16 22 L22 26 L22 28 L16 25 L10 28 L10 26 Z" />
  </svg>
);

export function FlightTrackerWidget(_props: WidgetProps) {
  const mapRef = useRef<LeafletMap | null>(null);
  const theme = useTheme();
  const { setLastUpdated } = useWidgetMetadata();
  const [widgetRef, isWidgetVisible] = useIntersectionObserver<HTMLDivElement>();

  // Use different map tiles based on theme
  const mapTileUrl =
    theme.name === 'dark'
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

  const {
    data: aircraft,
    isLoading,
    isError,
    error,
    refetch,
    dataUpdatedAt,
  } = useQuery({
    queryKey: queryKeys.flight.aircraft(KCLT_AIRPORT.code),
    queryFn: ({ signal }) => fetchAircraftInBoundingBox(KCLT_AIRPORT, signal),
    staleTime: 1000 * 15,
    refetchInterval: isWidgetVisible ? 1000 * 15 : false,
    refetchIntervalInBackground: false,
    enabled: isWidgetVisible,
    structuralSharing: false, // Always new reference so AircraftMarkersLayer effect runs on refetch
  });

  // Use the actual freshness of position data for the "Updated" label, not the
  // fetch time. OpenSky's last_contact/time_position can be much older than
  // when we requested the data (e.g. delayed/cached upstream), so we take the newest
  // position report in the payload. When there are no aircraft, fall back to
  // dataUpdatedAt (when we last successfully fetched).
  useEffect(() => {
    let ts: number | null = null;
    if (aircraft && aircraft.length > 0) {
      const toMs = (a: Aircraft) =>
        a.timePosition != null ? a.timePosition * 1000 : lastContactToMs(a.lastContact);
      ts = Math.max(...aircraft.map(toMs));
    } else {
      ts = dataUpdatedAt || null;
    }
    setLastUpdated(ts);
  }, [aircraft, dataUpdatedAt, setLastUpdated]);

  const handleResetView = () => {
    if (mapRef.current) {
      mapRef.current.setView(DEFAULT_CENTER, DEFAULT_ZOOM, { animate: true });
    }
  };

  if (isLoading) {
    return (
      <LoadingContainer>
        <RadarIcon />
        <LoadingText>Scanning airspace...</LoadingText>
      </LoadingContainer>
    );
  }

  if (isError) {
    return (
      <ErrorContainer>
        <ErrorIcon>📡</ErrorIcon>
        <ErrorText>
          {error instanceof Error ? error.message : 'Failed to fetch aircraft data'}
        </ErrorText>
        <RetryButton onClick={() => refetch()}>Retry</RetryButton>
      </ErrorContainer>
    );
  }

  const flights = aircraft || [];

  // Calculate stats
  const onGround = flights.filter(f => getFlightPhase(f) === 'ground');
  const airborne = flights.filter(f => getFlightPhase(f) !== 'ground');
  const departing = flights.filter(f => getFlightPhase(f) === 'departing');
  const approaching = flights.filter(f => getFlightPhase(f) === 'approaching');

  return (
    <FlightContainer ref={widgetRef}>
      <FlightHeader>
        <AirportInfo>
          <AirportCode>KCLT Radar</AirportCode>
        </AirportInfo>
        <FlightCount $hasFlights={flights.length > 0}>{flights.length} aircraft</FlightCount>
      </FlightHeader>

      <StatsRow>
        <StatBadge $color={FLIGHT_PHASE_COLORS.departing}>
          <span>↑</span>
          <StatValue>{departing.length}</StatValue>
        </StatBadge>
        <StatBadge $color={FLIGHT_PHASE_COLORS.approaching}>
          <span>↓</span>
          <StatValue>{approaching.length}</StatValue>
        </StatBadge>
        <StatBadge $color={FLIGHT_PHASE_COLORS.cruise}>
          <span>✈</span>
          <StatValue>{airborne.length}</StatValue>
        </StatBadge>
        <StatBadge $color={FLIGHT_PHASE_COLORS.ground}>
          <span>⬤</span>
          <StatValue>{onGround.length}</StatValue>
        </StatBadge>
      </StatsRow>

      <MapContainer>
        <LeafletMapContainer
          center={DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          zoomControl={true}
          scrollWheelZoom={true}
          wheelPxPerZoomLevel={100}
          wheelDebounceTime={100}
          minZoom={DEFAULT_ZOOM}
          maxZoom={10}
        >
          <MapController mapRef={mapRef} />
          <RetryTileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url={mapTileUrl}
            maxRetries={3}
            retryDelay={1000}
          />

          {/* 100km range ring */}
          <Circle
            center={DEFAULT_CENTER}
            radius={100000}
            pathOptions={{
              color: '#4b5563',
              weight: 1,
              fillOpacity: 0,
              dashArray: '6, 6',
            }}
          />
          <Marker position={RANGE_100KM_POS} icon={createRangeLabelIcon('100km', '#9ca3af')} />

          {/* 200km range ring */}
          <Circle
            center={DEFAULT_CENTER}
            radius={200000}
            pathOptions={{
              color: '#374151',
              weight: 1,
              fillOpacity: 0,
              dashArray: '6, 6',
            }}
          />
          <Marker position={RANGE_200KM_POS} icon={createRangeLabelIcon('200km', '#6b7280')} />

          {/* Airport marker */}
          <Marker position={DEFAULT_CENTER} icon={createAirportIcon()}>
            <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
              Charlotte Douglas International Airport (KCLT)
            </Tooltip>
          </Marker>

          <AircraftMarkersLayer key={dataUpdatedAt ?? 0} flights={flights} />
        </LeafletMapContainer>

        <MapOverlay>
          <LegendItem $color={FLIGHT_PHASE_COLORS.departing}>
            <LegendPlane $color={FLIGHT_PHASE_COLORS.departing}>
              <PlaneSvg color={FLIGHT_PHASE_COLORS.departing} />
            </LegendPlane>
            Departing
          </LegendItem>
          <LegendItem $color={FLIGHT_PHASE_COLORS.climbing}>
            <LegendPlane $color={FLIGHT_PHASE_COLORS.climbing}>
              <PlaneSvg color={FLIGHT_PHASE_COLORS.climbing} />
            </LegendPlane>
            Climbing
          </LegendItem>
          <LegendItem $color={FLIGHT_PHASE_COLORS.cruise}>
            <LegendPlane $color={FLIGHT_PHASE_COLORS.cruise}>
              <PlaneSvg color={FLIGHT_PHASE_COLORS.cruise} />
            </LegendPlane>
            Cruising
          </LegendItem>
          <LegendItem $color={FLIGHT_PHASE_COLORS.descending}>
            <LegendPlane $color={FLIGHT_PHASE_COLORS.descending}>
              <PlaneSvg color={FLIGHT_PHASE_COLORS.descending} />
            </LegendPlane>
            Descending
          </LegendItem>
          <LegendItem $color={FLIGHT_PHASE_COLORS.approaching}>
            <LegendPlane $color={FLIGHT_PHASE_COLORS.approaching}>
              <PlaneSvg color={FLIGHT_PHASE_COLORS.approaching} />
            </LegendPlane>
            Approaching
          </LegendItem>
          <LegendItem $color={FLIGHT_PHASE_COLORS.ground}>
            <LegendPlane $color={FLIGHT_PHASE_COLORS.ground}>
              <PlaneSvg color={FLIGHT_PHASE_COLORS.ground} />
            </LegendPlane>
            Ground
          </LegendItem>
        </MapOverlay>

        <MapControls>
          <ResetButton onClick={handleResetView} title="Reset view">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="3" />
              <line x1="12" y1="2" x2="12" y2="6" />
              <line x1="12" y1="18" x2="12" y2="22" />
              <line x1="2" y1="12" x2="6" y2="12" />
              <line x1="18" y1="12" x2="22" y2="12" />
            </svg>
          </ResetButton>
        </MapControls>

        <CreditIndicator
          $percentUsed={getCreditStats().percentUsed}
          title={`${getCreditStats().used}/${getCreditStats().limit} API credits used today`}
        >
          <CreditBar $percentUsed={getCreditStats().percentUsed} />
          <span>
            {getCreditStats().used.toLocaleString()}/{getCreditStats().limit.toLocaleString()}{' '}
            credits
          </span>
        </CreditIndicator>
      </MapContainer>
    </FlightContainer>
  );
}
