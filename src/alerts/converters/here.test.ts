import { describe, it, expect } from 'vitest';
import { convertHereFlowToGeneric, convertHereFlowsToGeneric } from './here';
import type { HereRouteFlow } from '../../types/here';

function makeFlow(overrides: Partial<HereRouteFlow> = {}): HereRouteFlow {
  return {
    routeId: 'i77-north',
    routeName: 'I-77 North',
    avgJamFactor: 8,
    maxJamFactor: 9.5,
    avgSpeedMph: 15,
    freeFlowSpeedMph: 65,
    congestionPercent: 77,
    maxCongestionPercent: 95,
    segmentCount: 5,
    timestamp: '2026-02-13T12:00:00Z',
    centerLat: 35.3,
    centerLng: -80.85,
    ...overrides,
  };
}

describe('convertHereFlowToGeneric', () => {
  describe('congestion threshold', () => {
    it('returns alert at exactly 90% maxCongestionPercent', () => {
      expect(convertHereFlowToGeneric(makeFlow({ maxCongestionPercent: 90 }))).not.toBeNull();
    });

    it('returns null below 90% maxCongestionPercent', () => {
      expect(convertHereFlowToGeneric(makeFlow({ maxCongestionPercent: 89 }))).toBeNull();
    });
  });

  describe('NaN safety', () => {
    it('treats NaN and Infinity congestion as 0 (filters out)', () => {
      expect(convertHereFlowToGeneric(makeFlow({ maxCongestionPercent: NaN }))).toBeNull();
      expect(convertHereFlowToGeneric(makeFlow({ maxCongestionPercent: Infinity }))).toBeNull();
    });

    it('handles NaN speed values in description without crashing', () => {
      const alert = convertHereFlowToGeneric(
        makeFlow({ avgSpeedMph: NaN, freeFlowSpeedMph: NaN, maxCongestionPercent: 95 })
      );
      expect(alert).not.toBeNull();
      expect(alert!.description).toContain('0 mph');
    });
  });

  describe('user-visible text', () => {
    it('includes route name in title', () => {
      const alert = convertHereFlowToGeneric(makeFlow({ routeName: 'I-85 South' }));
      expect(alert!.title).toBe('I-85 South Congestion');
    });

    it('includes congestion percent in summary', () => {
      const alert = convertHereFlowToGeneric(makeFlow({ congestionPercent: 85 }));
      expect(alert!.summary).toContain('85% slower than normal');
    });

    it('includes segment count in summary when > 1', () => {
      expect(convertHereFlowToGeneric(makeFlow({ segmentCount: 3 }))!.summary).toContain(
        'across 3 segments'
      );
    });

    it('omits segment text in summary when 1 segment', () => {
      expect(convertHereFlowToGeneric(makeFlow({ segmentCount: 1 }))!.summary).not.toContain(
        'across'
      );
    });

    it('includes speed comparison in description', () => {
      const alert = convertHereFlowToGeneric(makeFlow({ avgSpeedMph: 15, freeFlowSpeedMph: 65 }));
      expect(alert!.description).toContain('15 mph');
      expect(alert!.description).toContain('65 mph');
    });

    it('adds "nearly stopped" text for maxJamFactor >= 9', () => {
      expect(convertHereFlowToGeneric(makeFlow({ maxJamFactor: 9.5 }))!.description).toContain(
        'nearly stopped'
      );
    });

    it('omits "nearly stopped" text for maxJamFactor < 9', () => {
      expect(convertHereFlowToGeneric(makeFlow({ maxJamFactor: 7 }))!.description).not.toContain(
        'nearly stopped'
      );
    });
  });
});

describe('convertHereFlowsToGeneric', () => {
  it('filters out low-congestion routes', () => {
    const flows = [
      makeFlow({ routeId: 'high', maxCongestionPercent: 95 }),
      makeFlow({ routeId: 'low', maxCongestionPercent: 50 }),
    ];
    const alerts = convertHereFlowsToGeneric(flows);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].id).toBe('here-flow-high');
  });

  it('sorts by segment count descending', () => {
    const flows = [
      makeFlow({ routeId: 'small', maxCongestionPercent: 95, segmentCount: 2 }),
      makeFlow({ routeId: 'large', maxCongestionPercent: 95, segmentCount: 8 }),
      makeFlow({ routeId: 'medium', maxCongestionPercent: 95, segmentCount: 5 }),
    ];
    const alerts = convertHereFlowsToGeneric(flows);
    expect(alerts.map(a => a.id)).toEqual([
      'here-flow-large',
      'here-flow-medium',
      'here-flow-small',
    ]);
  });

  it('returns empty array when all flows are below threshold', () => {
    const flows = [
      makeFlow({ routeId: 'a', maxCongestionPercent: 50 }),
      makeFlow({ routeId: 'b', maxCongestionPercent: 60 }),
    ];
    expect(convertHereFlowsToGeneric(flows)).toEqual([]);
  });
});
