import { describe, it, expect } from 'vitest';
import { isHolidayClosure, isCMSAlertTweet } from './cmsFilters';

describe('isHolidayClosure', () => {
  describe('valid holiday closures', () => {
    it('detects Christmas closure with date range', () => {
      expect(isHolidayClosure('Schools will be closed Dec 24-26 for Christmas break')).toBe(true);
    });

    it('detects MLK Day closure', () => {
      expect(isHolidayClosure('Schools will be closed Monday, January 19 for MLK Day')).toBe(true);
    });

    it('detects Thanksgiving closure', () => {
      expect(isHolidayClosure('All schools and offices will be closed for Thanksgiving')).toBe(
        true
      );
    });

    it('detects New Year closure with date', () => {
      expect(isHolidayClosure('Schools closed Jan 1-2 for New Year')).toBe(true);
    });

    it('detects Christmas week closure (Dec 22-26)', () => {
      expect(isHolidayClosure('Closed Dec 22 through Dec 26')).toBe(true);
    });

    it('detects various Dec 22-26 formats', () => {
      expect(isHolidayClosure('Closed Dec. 22')).toBe(true);
      expect(isHolidayClosure('Closed Dec 23')).toBe(true);
      expect(isHolidayClosure('Closed Dec. 24')).toBe(true);
      expect(isHolidayClosure('Closed Dec 25')).toBe(true);
      expect(isHolidayClosure('Closed Dec. 26')).toBe(true);
    });
  });

  describe('false positives - should NOT match', () => {
    it('should NOT match Dec 20 (outside range)', () => {
      expect(isHolidayClosure('Meeting scheduled for Dec 20')).toBe(false);
    });

    it('should NOT match Dec 21 (outside range)', () => {
      expect(isHolidayClosure('Event on Dec 21')).toBe(false);
    });

    it('should NOT match Dec 27 (outside range)', () => {
      expect(isHolidayClosure('Back to school Dec 27')).toBe(false);
    });

    it('should NOT match Dec 28 (outside range)', () => {
      expect(isHolidayClosure('Classes resume Dec 28')).toBe(false);
    });

    it('should NOT match Dec 29 (outside range)', () => {
      expect(isHolidayClosure('Staff meeting Dec 29')).toBe(false);
    });

    it('should NOT match "Dec 202X" patterns (false positive)', () => {
      expect(isHolidayClosure('Updated Dec 2024')).toBe(false);
      expect(isHolidayClosure('Posted Dec 2025')).toBe(false);
      expect(isHolidayClosure('Revised Dec 2023')).toBe(false);
      expect(isHolidayClosure('Dated Dec 2022')).toBe(false);
      expect(isHolidayClosure('From Dec 2026')).toBe(false);
    });

    it('should NOT match "Dec 2nd week" patterns', () => {
      expect(isHolidayClosure('Starting Dec 2nd week of classes')).toBe(false);
    });

    it('should NOT match partial year matches in other contexts', () => {
      expect(isHolidayClosure('December 20th staff development')).toBe(false);
      expect(isHolidayClosure('Planning for December 2025')).toBe(false);
    });

    it('should NOT match when date is followed immediately by digits', () => {
      // These should NOT match because "222" or "223" etc. are not valid dates
      expect(isHolidayClosure('Code 222 alert')).toBe(false);
      expect(isHolidayClosure('Error 223')).toBe(false);
      expect(isHolidayClosure('Room 224')).toBe(false);
    });

    it('should match Dec 22-26 with proper word boundaries', () => {
      expect(isHolidayClosure('Closed Dec 22, returning Dec 27')).toBe(true);
      expect(isHolidayClosure('Break starts Dec. 23')).toBe(true);
      expect(isHolidayClosure('Dec 24 through Dec 26 - schools closed')).toBe(true);
    });
  });

  describe('case sensitivity - testing regex consistency', () => {
    it('matches holiday names case-insensitively', () => {
      expect(isHolidayClosure('Schools will be closed for CHRISTMAS')).toBe(true);
      expect(isHolidayClosure('Schools will be closed for christmas')).toBe(true);
      expect(isHolidayClosure('Schools will be closed for Christmas')).toBe(true);
    });

    it('matches closure patterns case-insensitively', () => {
      expect(isHolidayClosure('SCHOOLS WILL BE CLOSED for Christmas')).toBe(true);
      expect(isHolidayClosure('schools will be closed for Christmas')).toBe(true);
      expect(isHolidayClosure('Schools Will Be Closed for Christmas')).toBe(true);
    });

    it('should handle mixed case consistently without relying on .toLowerCase()', () => {
      // Since all regexes use the /i flag, they should work on original text
      expect(isHolidayClosure('CLOSED DEC 24')).toBe(true);
      expect(isHolidayClosure('closed dec 24')).toBe(true);
      expect(isHolidayClosure('ClOsEd DeC 24')).toBe(true);
    });
  });

  describe('non-holiday closures', () => {
    it('should NOT match emergency closures without holiday context', () => {
      expect(isHolidayClosure('Schools closed due to weather emergency')).toBe(false);
    });

    it('should NOT match lockdown announcements', () => {
      expect(isHolidayClosure('School in lockdown due to threat')).toBe(false);
    });

    it('should NOT match non-closure holiday mentions', () => {
      expect(isHolidayClosure('Christmas concert on December 15')).toBe(false);
    });
  });
});

describe('date pattern regex behavior', () => {
  it('should understand the exact regex matching behavior', () => {
    // The pattern /dec\.? 2[2-6]/i matches "dec" + optional period + space + "2" + [2-6]
    const pattern = /dec\.? 2[2-6]/i;

    // Should match Dec 22-26
    expect(pattern.test('Dec 22')).toBe(true);
    expect(pattern.test('Dec 23')).toBe(true);
    expect(pattern.test('Dec 24')).toBe(true);
    expect(pattern.test('Dec 25')).toBe(true);
    expect(pattern.test('Dec 26')).toBe(true);
    expect(pattern.test('Dec. 22')).toBe(true);

    // Should NOT match Dec 20, 21, 27, 28, 29
    expect(pattern.test('Dec 20')).toBe(false);
    expect(pattern.test('Dec 21')).toBe(false);
    expect(pattern.test('Dec 27')).toBe(false);
    expect(pattern.test('Dec 28')).toBe(false);
    expect(pattern.test('Dec 29')).toBe(false);

    // Should NOT match year patterns
    expect(pattern.test('Dec 2024')).toBe(false);
    expect(pattern.test('Dec 2025')).toBe(false);
    expect(pattern.test('Dec 2022')).toBe(false);
    expect(pattern.test('Dec 2026')).toBe(false);

    // Edge case: what about "Dec22" without space?
    expect(pattern.test('Dec22')).toBe(false); // No space, so won't match
    expect(pattern.test('Dec.22')).toBe(false); // Period but no space
  });
});

describe('isCMSAlertTweet', () => {
  it('detects emergency alerts', () => {
    expect(isCMSAlertTweet('Emergency lockdown at Smith Middle School')).toBe(true);
  });

  it('detects school closures (non-holiday)', () => {
    expect(isCMSAlertTweet('Schools closed today due to weather')).toBe(true);
  });

  it('excludes holiday closures', () => {
    expect(isCMSAlertTweet('Schools will be closed for Christmas Dec 24-26')).toBe(false);
  });

  it('excludes tweets without alert keywords', () => {
    expect(isCMSAlertTweet('Join us for the school fundraiser next week')).toBe(false);
  });

  it('detects delays and cancellations', () => {
    expect(isCMSAlertTweet('2-hour delay due to icy roads')).toBe(true);
    expect(isCMSAlertTweet('After-school activities canceled')).toBe(true);
  });
});
