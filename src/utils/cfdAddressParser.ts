/**
 * Extract addresses and intersections from CFD (Charlotte Fire Department) tweet text.
 * Used to populate location metadata and for geocoding.
 *
 * Common patterns in CFD tweets:
 * - "1500 block Dean St"
 * - "4300 block Saxonbury Wy"
 * - "I-485 outer loop at Rocky River Rd"
 * - "1800 block of Camp Greene St"
 * - "4400 block of Sharon Chase Drive"
 */

/** Normalize extracted location for geocoding (append Charlotte, NC for better results) */
const CHARLOTTE_SUFFIX = ', Charlotte, NC';

/**
 * Extract address/intersection from tweet text.
 * Returns the best match or undefined if no location found.
 */
export function extractLocationFromTweet(text: string): string | undefined {
  const trimmed = text.trim();
  if (!trimmed) return undefined;

  // Pattern 1: "I-XXX [inner|outer] loop at ROAD" - highway intersection
  const highwayAtMatch = trimmed.match(
    /\b(I-\d{2,3})\s+(?:inner|outer)\s+loop\s+at\s+([^.]+?)(?:\.|$|is closed|due to)/i
  );
  if (highwayAtMatch) {
    const road = highwayAtMatch[2].trim();
    if (road.length > 2) {
      return `${highwayAtMatch[1]} at ${road}${CHARLOTTE_SUFFIX}`;
    }
  }

  // Pattern 2: "I-XXX at ROAD" (shorter form)
  const highwayShortMatch = trimmed.match(
    /\b(I-\d{2,3})\s+at\s+([^.]+?)(?:\.|$|is closed|due to)/i
  );
  if (highwayShortMatch) {
    const road = highwayShortMatch[2].trim();
    if (road.length > 2) {
      return `${highwayShortMatch[1]} at ${road}${CHARLOTTE_SUFFIX}`;
    }
  }

  // Pattern 3: "N block of STREET" or "N block STREET" (with optional "of" and possible typo "of.")
  const blockMatch = trimmed.match(
    /\b(\d{3,5})\s+block\s+(?:of\.?\s+)?([A-Za-z\s]{1,50}(?:St|Street|Dr|Drive|Ave|Avenue|Wy|Way|Rd|Road|Blvd|Ln|Lane|Ct|Court|Pl|Place)\.?)(?:\s|$|\.|,|30 |E39|BC07)/i
  );
  if (blockMatch) {
    const street = blockMatch[2].trim().replace(/\.$/, '');
    if (street.length > 3) {
      return `${blockMatch[1]} block ${street}${CHARLOTTE_SUFFIX}`;
    }
  }

  // Pattern 4: "in the N block of STREET" (from longer narratives)
  const blockOfMatch = trimmed.match(
    /\b(?:in the |in )(\d{3,5})\s+block\s+of\s+([A-Za-z\s]{1,50}(?:Drive|St|Street|Avenue|Rd|Road|Way)\.?)(?:\s|$|\.|,)/i
  );
  if (blockOfMatch) {
    const street = blockOfMatch[2].trim().replace(/\.$/, '');
    if (street.length > 3) {
      return `${blockOfMatch[1]} block of ${street}${CHARLOTTE_SUFFIX}`;
    }
  }

  return undefined;
}
