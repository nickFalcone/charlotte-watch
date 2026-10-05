import { describe, it, expect } from 'vitest';
import { convertFAAStatusToAlerts } from './faaApi';
import type { FAAStatusResponse } from '../types';

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
