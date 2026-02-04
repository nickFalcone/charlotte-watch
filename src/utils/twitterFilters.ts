/**
 * Shared Twitter filtering utilities.
 * Used by both client code and Cloudflare Functions (via ../../src/utils/ import).
 */

export const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

/**
 * Check if a tweet was created within the last 24 hours.
 */
export function isWithinLast24Hours(createdAt: string): boolean {
  const ts = new Date(createdAt).getTime();
  return ts > Date.now() - TWENTY_FOUR_HOURS_MS;
}
