import { describe, it, expect } from 'vitest';
import { convertDukeOutageToGeneric } from './duke';
import type { DukeOutage } from '../../types/duke';

function makeOutage(overrides: Partial<DukeOutage> = {}): DukeOutage {
  return {
    sourceEventNumber: 'EVT-001',
    deviceLatitudeLocation: 35.2271,
    deviceLongitudeLocation: -80.8431,
    customersAffectedSum: 150,
    outageCause: 'unplanned',
    estimatedRestorationTime: '2026-02-13T18:00:00Z',
    operationCenterName: 'Charlotte',
    ...overrides,
  };
}

describe('convertDukeOutageToGeneric', () => {
  describe('severity by customer count', () => {
    it('maps >= 1000 to critical, >= 500 to high, >= 100 to moderate, < 100 to minor', () => {
      expect(convertDukeOutageToGeneric(makeOutage({ customersAffectedSum: 1500 })).severity).toBe(
        'critical'
      );
      expect(convertDukeOutageToGeneric(makeOutage({ customersAffectedSum: 500 })).severity).toBe(
        'high'
      );
      expect(convertDukeOutageToGeneric(makeOutage({ customersAffectedSum: 150 })).severity).toBe(
        'moderate'
      );
      expect(convertDukeOutageToGeneric(makeOutage({ customersAffectedSum: 50 })).severity).toBe(
        'minor'
      );
    });
  });

  describe('planned vs unplanned', () => {
    it('titles planned outage appropriately', () => {
      expect(convertDukeOutageToGeneric(makeOutage({ outageCause: 'planned' })).title).toBe(
        'Planned Power Outage'
      );
    });

    it('titles unplanned outage appropriately', () => {
      expect(convertDukeOutageToGeneric(makeOutage({ outageCause: 'unplanned' })).title).toBe(
        'Power Outage'
      );
    });

    it('gives planned outage instruction about maintenance', () => {
      expect(
        convertDukeOutageToGeneric(makeOutage({ outageCause: 'planned' })).instruction
      ).toContain('planned outage');
    });

    it('gives unplanned outage instruction with Duke Energy contact', () => {
      expect(
        convertDukeOutageToGeneric(makeOutage({ outageCause: 'unplanned' })).instruction
      ).toContain('duke-energy.com');
    });
  });

  describe('summary content', () => {
    it('formats singular customer correctly', () => {
      expect(convertDukeOutageToGeneric(makeOutage({ customersAffectedSum: 1 })).summary).toContain(
        '1 customer affected'
      );
    });

    it('formats plural customers correctly', () => {
      expect(
        convertDukeOutageToGeneric(makeOutage({ customersAffectedSum: 500 })).summary
      ).toContain('500 customers affected');
    });

    it('marks planned vs unplanned in summary', () => {
      expect(convertDukeOutageToGeneric(makeOutage({ outageCause: 'planned' })).summary).toContain(
        'Planned outage'
      );
      expect(
        convertDukeOutageToGeneric(makeOutage({ outageCause: 'unplanned' })).summary
      ).toContain('Unplanned outage');
    });
  });

  describe('description edge cases', () => {
    it('skips whitespace-only cause description', () => {
      const alert = convertDukeOutageToGeneric(makeOutage({ causeDescription: '  ' }));
      expect(alert.description).not.toContain('Cause:');
    });

    it('skips null crew status', () => {
      const alert = convertDukeOutageToGeneric(makeOutage({ crewStatTxt: null }));
      expect(alert.description).not.toContain('Crew status:');
    });
  });

  describe('affected area fallback', () => {
    it('uses operation center name when present', () => {
      expect(
        convertDukeOutageToGeneric(makeOutage({ operationCenterName: 'Huntersville' })).affectedArea
      ).toBe('Huntersville');
    });

    it('falls back to Mecklenburg County', () => {
      expect(
        convertDukeOutageToGeneric(makeOutage({ operationCenterName: undefined })).affectedArea
      ).toBe('Mecklenburg County');
    });
  });

  describe('polygon metadata', () => {
    it('includes polygon from trfPolygonXyLoc when available', () => {
      const alert = convertDukeOutageToGeneric(
        makeOutage({
          trfPolygonXyLoc: [
            { lat: 35.22, lng: -80.84 },
            { lat: 35.23, lng: -80.85 },
            { lat: 35.24, lng: -80.83 },
          ],
        })
      );
      const meta = alert.metadata as { polygon?: [number, number][] };
      expect(meta.polygon).toBeDefined();
      expect(meta.polygon!.length).toBeGreaterThanOrEqual(3);
    });

    it('creates circular fallback polygon when no polygon data', () => {
      const alert = convertDukeOutageToGeneric(
        makeOutage({
          trfPolygonXyLoc: null,
          convexHull: null,
          deviceLatitudeLocation: 35.22,
          deviceLongitudeLocation: -80.84,
        })
      );
      const meta = alert.metadata as { polygon?: [number, number][] };
      expect(meta.polygon).toBeDefined();
      expect(meta.polygon!.length).toBe(12);
    });

    it('uses larger radius for >= 1000 customers', () => {
      const alert = convertDukeOutageToGeneric(
        makeOutage({
          customersAffectedSum: 1500,
          trfPolygonXyLoc: null,
          convexHull: null,
        })
      );
      const meta = alert.metadata as { polygon?: [number, number][] };
      const latSpread =
        Math.max(...meta.polygon!.map(p => p[0])) - Math.min(...meta.polygon!.map(p => p[0]));
      expect(latSpread).toBeGreaterThan(0.01);
    });
  });
});
