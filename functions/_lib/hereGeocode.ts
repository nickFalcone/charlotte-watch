/**
 * HERE Geocoding API helper.
 * Converts address/intersection strings to coordinates for Charlotte-area locations.
 * Uses the same HERE_API_KEY as traffic flow (if geocoding is included in the plan).
 */

const HERE_GEOCODE_URL = 'https://geocode.search.hereapi.com/v1/geocode';

/** Charlotte, NC bounding box for result biasing */
const CHARLOTTE_AT = '35.2271,-80.8431';

export interface GeocodeResult {
  latitude: number;
  longitude: number;
}

/**
 * Geocode an address or intersection string.
 * Returns null if geocoding fails or no results found.
 */
export async function geocodeAddress(
  address: string,
  apiKey: string
): Promise<GeocodeResult | null> {
  if (!address?.trim()) return null;

  const params = new URLSearchParams({
    q: address.trim(),
    apiKey,
    at: CHARLOTTE_AT,
    limit: '1',
  });

  const url = `${HERE_GEOCODE_URL}?${params.toString()}`;
  const response = await fetch(url, { headers: { Accept: 'application/json' } });

  if (!response.ok) return null;

  const data = (await response.json()) as {
    items?: Array<{ position?: { lat: number; lng: number } }>;
  };
  const item = data.items?.[0];
  const pos = item?.position;
  if (
    !pos ||
    typeof pos.lat !== 'number' ||
    typeof pos.lng !== 'number' ||
    !Number.isFinite(pos.lat) ||
    !Number.isFinite(pos.lng)
  ) {
    return null;
  }

  return { latitude: pos.lat, longitude: pos.lng };
}
