import { describe, it, expect } from 'vitest';
import {
  normalizeRoadName,
  slug,
  getEffectiveSpeed,
  getEffectiveFreeFlow,
  getCongestionSeverity,
  filterCongestedRoutes,
} from './hereApi';
import type { HereCurrentFlow, HereRouteFlow } from '../types/here';
import { JAM_FACTOR_THRESHOLDS } from '../types/here';

describe('normalizeRoadName', () => {
  it('normalizes interstate with direction to base route', () => {
    expect(normalizeRoadName('I-77 N')).toBe('I-77');
    expect(normalizeRoadName('I-77 S')).toBe('I-77');
    expect(normalizeRoadName('I-485 E')).toBe('I-485');
  });

  it('normalizes interstate with concurrent US route', () => {
    expect(normalizeRoadName('I-77/US-21')).toBe('I-77');
  });

  it('keeps multi-interstate junctions separate', () => {
    expect(normalizeRoadName('I-85/I-77')).toBe('I-85/I-77');
  });

  it('normalizes various interstate formats', () => {
    expect(normalizeRoadName('I77')).toBe('I-77');
    expect(normalizeRoadName('I 77')).toBe('I-77');
    expect(normalizeRoadName('I-77')).toBe('I-77');
  });

  it('normalizes US routes', () => {
    expect(normalizeRoadName('US Highway 74')).toBe('US-74');
    expect(normalizeRoadName('US-74')).toBe('US-74');
    expect(normalizeRoadName('U.S. Route 21')).toBe('US-21');
  });

  it('normalizes NC routes', () => {
    expect(normalizeRoadName('NC-16')).toBe('NC-16');
    expect(normalizeRoadName('Highway 49')).toBe('NC-49');
    expect(normalizeRoadName('SR 51')).toBe('NC-51');
  });

  it('strips directional suffixes from regular roads', () => {
    expect(normalizeRoadName('Independence Blvd NORTHBOUND')).toBe('Independence Blvd');
    expect(normalizeRoadName('Trade St EASTBOUND')).toBe('Trade St');
  });

  it('handles whitespace', () => {
    expect(normalizeRoadName('  I-77  ')).toBe('I-77');
  });
});

describe('slug', () => {
  it('converts to lowercase with hyphens', () => {
    expect(slug('I-77')).toBe('i-77');
  });

  it('replaces spaces and special chars', () => {
    expect(slug('US Highway 74')).toBe('us-highway-74');
  });

  it('strips leading/trailing hyphens', () => {
    expect(slug('-hello-')).toBe('hello');
  });

  it('returns unnamed for empty string', () => {
    expect(slug('')).toBe('unnamed');
    expect(slug('   ')).toBe('unnamed');
  });
});

describe('getEffectiveSpeed', () => {
  it('returns top-level speed when available', () => {
    const flow = { speed: 25, jamFactor: 3 } as HereCurrentFlow;
    expect(getEffectiveSpeed(flow)).toBe(25);
  });

  it('derives speed from subSegments when top-level is missing', () => {
    const flow = {
      jamFactor: 9,
      subSegments: [
        { length: 100, speed: 10 },
        { length: 200, speed: 20 },
      ],
    } as HereCurrentFlow;
    // Length-weighted average: (100*10 + 200*20) / (100+200) = 5000/300 = 16.67
    expect(getEffectiveSpeed(flow)).toBeCloseTo(16.67, 1);
  });

  it('returns 0 when no speed data available', () => {
    const flow = { jamFactor: 10 } as HereCurrentFlow;
    expect(getEffectiveSpeed(flow)).toBe(0);
  });

  it('treats closed subSegments (no speed) as 0 speed', () => {
    const flow = {
      jamFactor: 10,
      subSegments: [
        { length: 100, speed: 10 },
        { length: 100 }, // closed, no speed
      ],
    } as HereCurrentFlow;
    // (100*10 + 100*0) / 200 = 5
    expect(getEffectiveSpeed(flow)).toBe(5);
  });

  it('handles NaN/Infinity speed gracefully', () => {
    const flow = { speed: NaN, jamFactor: 5 } as HereCurrentFlow;
    // NaN is not finite, so falls through to subSegments
    expect(getEffectiveSpeed(flow)).toBe(0);
  });
});

describe('getEffectiveFreeFlow', () => {
  it('returns top-level freeFlow when available', () => {
    const flow = { freeFlow: 30, jamFactor: 3 } as HereCurrentFlow;
    expect(getEffectiveFreeFlow(flow)).toBe(30);
  });

  it('falls back to first subSegment freeFlow', () => {
    const flow = {
      jamFactor: 5,
      subSegments: [{ length: 100, freeFlow: 28 }, { length: 200 }],
    } as HereCurrentFlow;
    expect(getEffectiveFreeFlow(flow)).toBe(28);
  });

  it('returns 0 when no freeFlow data', () => {
    const flow = { jamFactor: 10 } as HereCurrentFlow;
    expect(getEffectiveFreeFlow(flow)).toBe(0);
  });
});

describe('getCongestionSeverity', () => {
  it('returns normal below moderate threshold', () => {
    expect(getCongestionSeverity(2)).toBe('normal');
    expect(getCongestionSeverity(JAM_FACTOR_THRESHOLDS.MODERATE - 0.1)).toBe('normal');
  });

  it('returns moderate at moderate threshold', () => {
    expect(getCongestionSeverity(JAM_FACTOR_THRESHOLDS.MODERATE)).toBe('moderate');
  });

  it('returns heavy at heavy threshold', () => {
    expect(getCongestionSeverity(JAM_FACTOR_THRESHOLDS.HEAVY)).toBe('heavy');
  });

  it('returns severe at severe threshold', () => {
    expect(getCongestionSeverity(JAM_FACTOR_THRESHOLDS.SEVERE)).toBe('severe');
    expect(getCongestionSeverity(10)).toBe('severe');
  });
});

describe('filterCongestedRoutes', () => {
  const routes: HereRouteFlow[] = [
    {
      routeId: 'i-77',
      routeName: 'I-77',
      avgJamFactor: 3,
      maxJamFactor: 4,
      avgSpeedMph: 50,
      freeFlowSpeedMph: 65,
      congestionPercent: 23,
      maxCongestionPercent: 30,
      segmentCount: 20,
      timestamp: '2024-01-15T12:00:00Z',
    },
    {
      routeId: 'i-85',
      routeName: 'I-85',
      avgJamFactor: 7,
      maxJamFactor: 9,
      avgSpeedMph: 15,
      freeFlowSpeedMph: 65,
      congestionPercent: 77,
      maxCongestionPercent: 90,
      segmentCount: 15,
      timestamp: '2024-01-15T12:00:00Z',
    },
  ];

  it('filters by default moderate threshold', () => {
    const result = filterCongestedRoutes(routes);
    expect(result).toHaveLength(1);
    expect(result[0].routeName).toBe('I-85');
  });

  it('filters by custom threshold', () => {
    const result = filterCongestedRoutes(routes, 3);
    expect(result).toHaveLength(2);
  });

  it('returns empty when no routes exceed threshold', () => {
    const result = filterCongestedRoutes(routes, 10);
    expect(result).toHaveLength(0);
  });
});
