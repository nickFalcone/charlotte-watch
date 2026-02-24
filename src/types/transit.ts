// GTFS-RT Vehicle Positions types from the Transitland API
// Feed: f-dnq-charlotteareatransitsystem~rt

export interface TransitRawTrip {
  tripId?: string;
  routeId?: string;
  directionId?: number;
  startDate?: string;
}

export interface TransitRawVehicleDescriptor {
  id?: string;
  label?: string;
}

export interface TransitRawPosition {
  latitude: number;
  longitude: number;
  bearing?: number;
  odometer?: number;
  speed?: number;
}

export interface TransitRawVehicle {
  trip?: TransitRawTrip;
  vehicle?: TransitRawVehicleDescriptor;
  position?: TransitRawPosition;
  currentStopSequence?: number;
  stopId?: string;
  currentStatus?: string;
  timestamp?: string;
  occupancyStatus?: string;
}

export interface TransitRawEntity {
  id: string;
  vehicle?: TransitRawVehicle;
}

export interface TransitRawHeader {
  gtfsRealtimeVersion?: string;
  incrementality?: string;
  timestamp?: string;
}

export interface TransitVehiclePositionsResponse {
  header: TransitRawHeader;
  entity: TransitRawEntity[];
}

/**
 * Parsed, normalized vehicle position for rendering on the map.
 */
export interface TransitVehiclePosition {
  id: string;
  routeId: string;
  label: string;
  lat: number;
  lng: number;
  bearing?: number;
  speed?: number;
  stopId?: string;
  currentStatus?: 'INCOMING_AT' | 'STOPPED_AT' | 'IN_TRANSIT_TO';
  timestamp: number;
}

export const LYNX_ROUTE_IDS = ['501', '510'] as const;
export type LynxRouteId = (typeof LYNX_ROUTE_IDS)[number];
