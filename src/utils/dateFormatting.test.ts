import { describe, it, expect } from 'vitest';
import { formatTimeDisplay, formatEndTimeDisplay } from './dateFormatting';

describe('formatTimeDisplay', () => {
  it('returns undefined for undefined input', () => {
    expect(formatTimeDisplay(undefined)).toBeUndefined();
  });

  it('formats a valid ISO date string as a time', () => {
    const result = formatTimeDisplay('2026-02-13T15:45:00Z');
    expect(result).toBeDefined();
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });

  it('returns descriptive text as-is', () => {
    expect(formatTimeDisplay('Assessing')).toBe('Assessing');
  });

  it('returns invalid date strings as-is', () => {
    expect(formatTimeDisplay('not-a-date')).toBe('not-a-date');
  });

  it('returns empty string as undefined', () => {
    expect(formatTimeDisplay('')).toBeUndefined();
  });
});

describe('formatEndTimeDisplay', () => {
  it('returns undefined for undefined input', () => {
    expect(formatEndTimeDisplay(undefined)).toBeUndefined();
  });

  it('returns undefined for invalid date strings', () => {
    expect(formatEndTimeDisplay('not-a-date')).toBeUndefined();
  });

  it('formats a same-day end time with "today"', () => {
    const laterToday = new Date();
    laterToday.setHours(laterToday.getHours() + 3);
    const result = formatEndTimeDisplay(laterToday.toISOString());
    expect(result).toContain('Until');
    expect(result).toContain('today');
  });

  it('formats a different-day end time with weekday and date', () => {
    const futureDate = new Date('2027-06-15T10:30:00Z');
    const result = formatEndTimeDisplay(futureDate.toISOString());
    expect(result).toContain('Until');
    expect(result).not.toContain('today');
    expect(result).toMatch(/Mon|Tue|Wed|Thu|Fri|Sat|Sun/);
  });
});
