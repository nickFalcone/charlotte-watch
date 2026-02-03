/**
 * Shared utilities for Twitter-based alert converters (CATS, CMS).
 */

/** Maximum length for alert titles extracted from tweets */
export const TITLE_MAX_LEN = 80;

/**
 * Extract first line of text, truncate if too long.
 * Used to create concise alert titles from tweets.
 *
 * @param text - Multi-line text to extract from
 * @param maxLen - Maximum length (default: TITLE_MAX_LEN)
 * @returns First line, truncated with "..." if exceeds max length
 *
 * @example
 * ```typescript
 * firstLine("Line 1\nLine 2", 80) // "Line 1"
 * firstLine("Very long text...", 10) // "Very lo..."
 * ```
 */
export function firstLine(text: string, maxLen: number = TITLE_MAX_LEN): string {
  const line = text.split(/\r?\n/)[0]?.trim() ?? text;
  if (line.length <= maxLen) return line;
  return line.slice(0, maxLen - 3) + '...';
}
