/**
 * CFD (Charlotte Fire Department) Twitter filtering utilities.
 * Used by both client code and Cloudflare Functions (via ../../src/utils/ import).
 */

import { isWithinLast24Hours } from './twitterFilters';

/**
 * Keep tweets that describe fire incidents or emergency responses.
 * Excludes promotional content, community events, and non-incident posts.
 */
export function isCFDIncidentTweet(text: string): boolean {
  const lower = text.toLowerCase();
  const incidentTerms =
    /structure fire|tractor trailer fire|apartment fire|fire showing|fire department|charlotte fire|engine \d|bc\d|battalion|on scene|smoke and fire|control fire|under investigation|find an alternate route|road closed|emergency vehicles/i;
  const excludeTerms =
    /job fair|career|hiring|join our team|community event|open house|fire prevention week|thank you for|retirement|promotion|meet our|spotlight on/i;
  return incidentTerms.test(lower) && !excludeTerms.test(lower);
}

// Re-export from shared Twitter filters
export { isWithinLast24Hours };
