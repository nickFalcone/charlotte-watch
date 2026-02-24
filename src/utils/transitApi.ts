import type { TransitVehiclePositionsResponse, TransitVehiclePosition } from '../types/transit';
import { LYNX_ROUTE_IDS } from '../types/transit';

// Use the existing /proxy/cats proxy in dev (same transit.land target)
const TRANSIT_VEHICLE_URL = import.meta.env.DEV
  ? '/proxy/cats/api/v2/rest/feeds/f-dnq-charlotteareatransitsystem~rt/download_latest_rt/vehicle_positions.json'
  : '/api/cats-transit';

/**
 * Fetches live vehicle positions for the LYNX Blue Line (501) and
 * CityLYNX Gold Line (510) from the Transitland GTFS-RT feed.
 */
export async function fetchTransitVehicles(
  signal?: AbortSignal
): Promise<TransitVehiclePosition[]> {
  const response = await fetch(TRANSIT_VEHICLE_URL, { signal });

  if (!response.ok) {
    throw new Error(`Transit API returned ${response.status}: ${response.statusText}`);
  }

  const data: TransitVehiclePositionsResponse = await response.json();

  return data.entity
    .filter(entity => {
      const routeId = entity.vehicle?.trip?.routeId;
      const pos = entity.vehicle?.position;
      return (
        routeId !== undefined &&
        (LYNX_ROUTE_IDS as readonly string[]).includes(routeId) &&
        pos != null &&
        pos.latitude != null &&
        pos.longitude != null
      );
    })
    .map(entity => {
      const v = entity.vehicle!;
      const pos = v.position!;
      const status = v.currentStatus;

      let currentStatus: TransitVehiclePosition['currentStatus'];
      if (status === 'INCOMING_AT') currentStatus = 'INCOMING_AT';
      else if (status === 'STOPPED_AT') currentStatus = 'STOPPED_AT';
      else if (status === 'IN_TRANSIT_TO') currentStatus = 'IN_TRANSIT_TO';

      return {
        id: entity.id,
        routeId: v.trip!.routeId!,
        label: v.vehicle?.label ?? entity.id,
        lat: pos.latitude,
        lng: pos.longitude,
        bearing: pos.bearing,
        speed: pos.speed,
        stopId: v.stopId,
        currentStatus,
        timestamp: v.timestamp !== undefined ? Number(v.timestamp) : Date.now() / 1000,
      };
    });
}
