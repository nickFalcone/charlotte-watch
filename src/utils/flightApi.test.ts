import { describe, it, expect } from 'vitest';
import {
  formatVelocity,
  formatAltitude,
  formatHeading,
  formatVerticalRate,
  lastContactToMs,
  convertFAAStatusToAlerts,
  parseAdsbAircraft,
} from './flightApi';
import type { AdsbAircraft, FAAStatusResponse } from '../types';

describe('formatVelocity', () => {
  it('converts m/s to knots', () => {
    expect(formatVelocity(100)).toBe('194 kts');
  });

  it('rounds to nearest knot', () => {
    expect(formatVelocity(1)).toBe('2 kts');
  });

  it('handles zero', () => {
    expect(formatVelocity(0)).toBe('0 kts');
  });
});

describe('formatAltitude', () => {
  it('formats low altitude in feet', () => {
    expect(formatAltitude(100)).toBe('328 ft');
  });

  it('formats high altitude with k suffix', () => {
    expect(formatAltitude(10000)).toBe('32.8k ft');
  });

  it('threshold between feet and k ft is 1000 feet (~304.8m)', () => {
    // 304m = 997 ft -> should use plain feet
    expect(formatAltitude(304)).toBe('997 ft');
    // 305m = 1000.4 ft -> should use k ft
    expect(formatAltitude(305)).toBe('1.0k ft');
  });

  it('handles zero', () => {
    expect(formatAltitude(0)).toBe('0 ft');
  });
});

describe('formatHeading', () => {
  it('formats north (0 degrees)', () => {
    expect(formatHeading(0)).toBe('0\u00B0 N');
  });

  it('formats east (90 degrees)', () => {
    expect(formatHeading(90)).toBe('90\u00B0 E');
  });

  it('formats south (180 degrees)', () => {
    expect(formatHeading(180)).toBe('180\u00B0 S');
  });

  it('formats west (270 degrees)', () => {
    expect(formatHeading(270)).toBe('270\u00B0 W');
  });

  it('formats intercardinal directions', () => {
    expect(formatHeading(45)).toBe('45\u00B0 NE');
    expect(formatHeading(135)).toBe('135\u00B0 SE');
    expect(formatHeading(225)).toBe('225\u00B0 SW');
    expect(formatHeading(315)).toBe('315\u00B0 NW');
  });

  it('wraps 360 degrees to N', () => {
    expect(formatHeading(360)).toBe('360\u00B0 N');
  });
});

describe('formatVerticalRate', () => {
  it('shows Level for small vertical rates', () => {
    expect(formatVerticalRate(0)).toBe('Level');
    expect(formatVerticalRate(0.25)).toBe('Level'); // ~49 fpm
  });

  it('shows positive fpm for climbing', () => {
    expect(formatVerticalRate(5)).toBe('+984 fpm');
  });

  it('shows negative fpm for descending', () => {
    expect(formatVerticalRate(-5)).toBe('-984 fpm');
  });

  it('threshold is ~100 fpm (~0.508 m/s)', () => {
    // 0.508 m/s = 100 fpm -> Level
    expect(formatVerticalRate(0.508)).toBe('Level');
    // 0.51 m/s = 100.4 fpm -> shows rate
    expect(formatVerticalRate(0.51)).toBe('+100 fpm');
  });
});

describe('lastContactToMs', () => {
  it('handles Date object', () => {
    const date = new Date('2024-01-15T12:00:00Z');
    expect(lastContactToMs(date)).toBe(date.getTime());
  });

  it('handles Unix seconds (< 1e12)', () => {
    const unixSeconds = 1705320000; // 2024-01-15T12:00:00Z
    expect(lastContactToMs(unixSeconds)).toBe(unixSeconds * 1000);
  });

  it('handles Unix milliseconds (>= 1e12)', () => {
    const unixMs = 1705320000000;
    expect(lastContactToMs(unixMs)).toBe(unixMs);
  });
});

describe('convertFAAStatusToAlerts', () => {
  const baseFAAStatus: FAAStatusResponse = {
    airport_status_information: {
      update_time: '2024-01-15T12:00:00Z',
      delay_types: [],
    },
  };

  it('returns empty array when no delays', () => {
    const alerts = convertFAAStatusToAlerts(baseFAAStatus, 'CLT');
    expect(alerts).toEqual([]);
  });

  it('creates alert for ground delay program', () => {
    const status: FAAStatusResponse = {
      airport_status_information: {
        update_time: '2024-01-15T12:00:00Z',
        delay_types: [
          {
            name: 'Ground Delay Programs',
            ground_delay_list: [
              {
                airportCode: 'CLT',
                reason: 'Weather / Thunderstorms',
                averageDelay: '45 minutes',
                maximumDelay: '1 hour 30 minutes',
              },
            ],
          },
        ],
      },
    };

    const alerts = convertFAAStatusToAlerts(status, 'CLT');
    expect(alerts).toHaveLength(1);
    expect(alerts[0].source).toBe('faa');
    expect(alerts[0].category).toBe('aviation');
    expect(alerts[0].severity).toBe('moderate'); // 45 min -> moderate
    expect(alerts[0].title).toContain('Ground Delay Program');
    expect(alerts[0].affectedArea).toBe('CLT');
  });

  it('filters to requested airport only', () => {
    const status: FAAStatusResponse = {
      airport_status_information: {
        update_time: '2024-01-15T12:00:00Z',
        delay_types: [
          {
            name: 'Ground Delay Programs',
            ground_delay_list: [
              {
                airportCode: 'CLT',
                reason: 'Weather',
                averageDelay: '30 minutes',
                maximumDelay: '45 minutes',
              },
              {
                airportCode: 'ATL',
                reason: 'Volume',
                averageDelay: '20 minutes',
                maximumDelay: '30 minutes',
              },
            ],
          },
        ],
      },
    };

    const alerts = convertFAAStatusToAlerts(status, 'CLT');
    expect(alerts).toHaveLength(1);
    expect(alerts[0].affectedArea).toBe('CLT');
  });

  it('creates critical alert for ground stop', () => {
    const status: FAAStatusResponse = {
      airport_status_information: {
        update_time: '2024-01-15T12:00:00Z',
        delay_types: [
          {
            name: 'Ground Stops',
            ground_stop_list: [
              {
                airportCode: 'CLT',
                reason: 'Weather / Thunderstorms',
                endTime: '3:00 PM EST',
              },
            ],
          },
        ],
      },
    };

    const alerts = convertFAAStatusToAlerts(status, 'CLT');
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe('critical');
    expect(alerts[0].title).toContain('Ground Stop');
  });

  it('creates critical alert for airport closure', () => {
    const status: FAAStatusResponse = {
      airport_status_information: {
        update_time: '2024-01-15T12:00:00Z',
        delay_types: [
          {
            name: 'Airport Closures',
            closures: [
              {
                airportCode: 'CLT',
                start: '2024-01-15T10:00:00Z',
                reopens: '2024-01-15T18:00:00Z',
              },
            ],
          },
        ],
      },
    };

    const alerts = convertFAAStatusToAlerts(status, 'CLT');
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe('critical');
    expect(alerts[0].title).toContain('Airport Closure');
  });

  it('maps delay severity by minutes (critical >= 120, high >= 60, moderate >= 30, minor < 30)', () => {
    const status: FAAStatusResponse = {
      airport_status_information: {
        update_time: '2024-01-15T12:00:00Z',
        delay_types: [
          {
            name: 'Ground Delay Programs',
            ground_delay_list: [
              {
                airportCode: 'CLT',
                reason: 'Volume',
                averageDelay: '1 hour 15 minutes',
                maximumDelay: '2 hours',
              },
            ],
          },
        ],
      },
    };

    const alerts = convertFAAStatusToAlerts(status, 'CLT');
    expect(alerts[0].severity).toBe('high'); // 75 min is high (>= 60, < 120)
  });
});

describe('parseAdsbAircraft', () => {
  const NOW_MS = 1_760_000_000_000;
  const base: AdsbAircraft = {
    hex: 'A75B65',
    flight: 'AAL2981 ',
    r: 'N573UW',
    t: 'A321',
    ownOp: 'AMERICAN AIRLINES INC',
    lat: 35.5,
    lon: -80.9,
    alt_baro: 23775,
    gs: 415.7,
    track: 286.78,
    baro_rate: 1088,
    squawk: '7106',
    emergency: 'none',
    seen: 0.4,
    seen_pos: 1.2,
  };

  it('converts feet, knots and fpm to meters and m/s', () => {
    const ac = parseAdsbAircraft(base, NOW_MS)!;
    expect(ac.altitude).toBeCloseTo(23775 * 0.3048, 3);
    expect(ac.velocity).toBeCloseTo(415.7 * 0.514444, 3);
    expect(ac.verticalRate).toBeCloseTo(1088 * 0.00508, 3);
    expect(ac.heading).toBe(286.78);
  });

  it('normalizes identifiers and metadata', () => {
    const ac = parseAdsbAircraft(base, NOW_MS)!;
    expect(ac.icao24).toBe('a75b65');
    expect(ac.callsign).toBe('AAL2981');
    expect(ac.registration).toBe('N573UW');
    expect(ac.aircraftType).toBe('A321');
    expect(ac.operator).toBe('AMERICAN AIRLINES INC');
    expect(ac.squawk).toBe('7106');
  });

  it('treats the "none" emergency status as no emergency', () => {
    expect(parseAdsbAircraft(base, NOW_MS)!.emergency).toBeNull();
    expect(parseAdsbAircraft({ ...base, emergency: 'general' }, NOW_MS)!.emergency).toBe('general');
  });

  it('derives position and contact times from the provider timestamp', () => {
    const ac = parseAdsbAircraft(base, NOW_MS)!;
    expect(ac.timePosition).toBeCloseTo(NOW_MS / 1000 - 1.2, 3);
    expect(ac.lastContact.getTime()).toBeCloseTo(NOW_MS - 400, 0);
  });

  it('handles aircraft on the ground', () => {
    const ac = parseAdsbAircraft({ ...base, alt_baro: 'ground' }, NOW_MS)!;
    expect(ac.onGround).toBe(true);
    expect(ac.altitude).toBe(0);
  });

  it('falls back to geometric vertical rate and defaults for missing fields', () => {
    const ac = parseAdsbAircraft(
      { hex: 'abc123', lat: 35, lon: -81, baro_rate: undefined, geom_rate: -640 },
      NOW_MS
    )!;
    expect(ac.verticalRate).toBeCloseTo(-640 * 0.00508, 3);
    expect(ac.callsign).toBe('N/A');
    expect(ac.velocity).toBe(0);
    expect(ac.heading).toBe(0);
    expect(ac.squawk).toBeNull();
    expect(ac.registration).toBeNull();
    expect(ac.timePosition).toBeNull();
  });

  it('skips aircraft without a position', () => {
    expect(parseAdsbAircraft({ hex: 'abc123' }, NOW_MS)).toBeNull();
    expect(parseAdsbAircraft({ hex: 'abc123', lat: 35 }, NOW_MS)).toBeNull();
  });
});
