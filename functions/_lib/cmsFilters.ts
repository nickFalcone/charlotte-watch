/**
 * Shared CMS Twitter filtering utilities for Cloudflare Pages Functions.
 * NOTE: This file is duplicated from src/utils/cmsFilters.ts for use in the serverless context.
 * Keep both files in sync when making changes.
 */

import { isWithinLast12Hours } from './twitterFilters';

/**
 * Check if tweet is about a U.S. holiday closure (comprehensive filtering).
 * Returns true if the tweet appears to be a routine holiday closure announcement.
 */
export function isHolidayClosure(text: string): boolean {
  // Holiday names (case-insensitive via /i flag)
  const holidayNames =
    /martin luther king|mlk day|christmas|thanksgiving|memorial day|labor day|independence day|july 4th|president'?s day|new year/i;

  // Date patterns for common school breaks (case-insensitive via /i flag)
  const datePatterns = /dec\.? 2[2-6]|dec\.? 24-26|jan\.? 1-2|jan\.? 19/i;

  // Generic closure patterns combined with holiday context (case-insensitive via /i flag)
  const closurePattern =
    /(closed|will be closed|schools closed|schools? and|offices? will be closed)/i;

  // If it mentions a holiday name AND a closure pattern, it's likely a holiday announcement
  if (holidayNames.test(text) && closurePattern.test(text)) {
    return true;
  }

  // If it mentions specific holiday date ranges, it's likely a holiday announcement
  if (datePatterns.test(text)) {
    return true;
  }

  return false;
}

/**
 * Check if tweet is a time-sensitive CMS alert.
 * Must contain relevant keywords AND must NOT be a holiday closure.
 */
export function isCMSAlertTweet(text: string): boolean {
  // Must contain at least one of these keywords (case-insensitive via /i flag)
  const alertKeywords = /emergency|active shooter|lockdown|closed|canceled|delay|remote/i;

  if (!alertKeywords.test(text)) {
    return false;
  }

  // Exclude holiday closures
  if (isHolidayClosure(text)) {
    return false;
  }

  return true;
}

// Re-export from shared Twitter filters
export { isWithinLast12Hours };
