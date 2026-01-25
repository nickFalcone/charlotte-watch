/**
 * Build a Google Maps URL for a lat/lng.
 * Used by HERE, NCDOT, CMPD, and Duke alert converters.
 */
export function buildMapUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

/** Returns a map URL when both coords are finite, else undefined. */
export function buildMapUrlIfValid(
  lat: number | undefined,
  lng: number | undefined
): string | undefined {
  if (lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)) {
    return buildMapUrl(lat, lng);
  }
  return undefined;
}
