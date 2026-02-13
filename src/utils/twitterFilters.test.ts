import { describe, it, expect } from 'vitest';
import { isWithinLast24Hours } from './twitterFilters';

describe('isWithinLast24Hours', () => {
  it('returns true for a tweet created just now', () => {
    expect(isWithinLast24Hours(new Date().toISOString())).toBe(true);
  });

  it('returns true near the 24-hour boundary', () => {
    const twentyThreeHoursAgo = new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString();
    expect(isWithinLast24Hours(twentyThreeHoursAgo)).toBe(true);
  });

  it('returns false past the 24-hour boundary', () => {
    const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    expect(isWithinLast24Hours(twentyFiveHoursAgo)).toBe(false);
  });

  it('returns false for invalid date strings', () => {
    expect(isWithinLast24Hours('not-a-date')).toBe(false);
  });
});
