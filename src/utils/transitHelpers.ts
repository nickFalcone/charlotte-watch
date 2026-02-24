import { BLUE_LINE_STATIONS, GOLD_LINE_STATIONS, type TransitStation } from '../data/transitRoutes';

/**
 * Converts a compass bearing in degrees to a cardinal direction label.
 * N: 315-360 and 0-44, E: 45-134, S: 135-224, W: 225-314
 */
export function getDirectionLabel(bearing: number): string {
  if (bearing >= 315 || bearing < 45) return 'Northbound';
  if (bearing < 135) return 'Eastbound';
  if (bearing < 225) return 'Southbound';
  return 'Westbound';
}

/** Finds the closest station to the given coordinates on a specific route. */
export function findNearestStation(
  lat: number,
  lng: number,
  routeId: string
): TransitStation | null {
  const stations = routeId === '501' ? BLUE_LINE_STATIONS : GOLD_LINE_STATIONS;
  let nearest: TransitStation | null = null;
  let minDist = Infinity;
  for (const station of stations) {
    const d = (station.lat - lat) ** 2 + (station.lng - lng) ** 2;
    if (d < minDist) {
      minDist = d;
      nearest = station;
    }
  }
  return nearest;
}
