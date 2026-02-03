/**
 * Shared Twitter filtering utilities.
 * NOTE: This file is duplicated in functions/_lib/twitterFilters.ts for the Cloudflare Pages Function.
 * Keep both files in sync when making changes.
 */

export const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

/**
 * Check if a tweet was created within the last 12 hours.
 */
export function isWithinLast12Hours(createdAt: string): boolean {
  const ts = new Date(createdAt).getTime();
  return ts > Date.now() - TWELVE_HOURS_MS;
}
