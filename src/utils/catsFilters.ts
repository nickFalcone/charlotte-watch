/**
 * Shared CATS Twitter filtering utilities.
 * Used by both client code and Cloudflare Functions (via ../../src/utils/ import).
 */

import { isWithinLast12Hours } from './twitterFilters';

/**
 * Keep tweets that mention service status (suspensions, delays, Blue/Gold Line, etc.).
 * Excludes promotional content and non-service announcements.
 */
export function isServiceAlertTweet(text: string): boolean {
  const lower = text.toLowerCase();
  const serviceTerms =
    /suspend|suspended|blue line|gold line|bus service|operational|on schedule|delays?|detour|road closed|no service|micro service|micro |tracks|blocked|ctc|station|route|reopening|winter weather|road conditions|express bus|streetcar/i;
  const excludeTerms =
    /live now|meeting|fare study|fare modernization|hosting a |join us|be there to share|want to learn more about fare|book demo/i;
  return serviceTerms.test(lower) && !excludeTerms.test(lower);
}

// Re-export from shared Twitter filters
export { isWithinLast12Hours };
