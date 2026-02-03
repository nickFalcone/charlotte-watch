/**
 * Generic deduplication utility.
 * Removes duplicate items from an array based on a key extraction function.
 */

/**
 * Deduplicates an array of items by a key extracted from each item.
 * Keeps the first occurrence of each unique key.
 *
 * @param items - Array of items to deduplicate
 * @param keyFn - Function that extracts a unique key from each item
 * @returns Array with duplicates removed
 *
 * @example
 * ```typescript
 * const events = [
 *   { eventNo: '1', data: 'a' },
 *   { eventNo: '2', data: 'b' },
 *   { eventNo: '1', data: 'c' }, // duplicate
 * ];
 * const unique = dedupeBy(events, e => e.eventNo);
 * // Returns: [{ eventNo: '1', data: 'a' }, { eventNo: '2', data: 'b' }]
 * ```
 */
export function dedupeBy<T>(items: T[], keyFn: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter(item => {
    const key = keyFn(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
