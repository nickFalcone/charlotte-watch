import { describe, it, expect, vi, afterEach } from 'vitest';
import { convertCMPDEventToGeneric, convertCMPDEventsToGeneric } from './cmpd';
import type { CMPDTrafficEvent } from '../../types/cmpd';

function makeEvent(overrides: Partial<CMPDTrafficEvent> = {}): CMPDTrafficEvent {
  return {
    eventNo: 'E12345',
    eventDateTime: new Date().toISOString(),
    addedDateTimeString: '20260213120000ES',
    typeCode: 'AC-PI',
    typeDescription: 'ACCIDENT-PERSONAL INJURY',
    typeSubCode: 'JST-OCC',
    typeSubDescription: 'JUST OCCURRED',
    division: 'METRO',
    xCoordinate: undefined,
    yCoordinate: undefined,
    latitude: 35.2271,
    longitude: -80.8431,
    address: '1234 MAIN ST',
    ...overrides,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('convertCMPDEventToGeneric', () => {
  describe('filtering', () => {
    it('excludes property-damage-only accidents', () => {
      expect(convertCMPDEventToGeneric(makeEvent({ typeCode: 'AC-R/PD' }))).toBeNull();
      expect(convertCMPDEventToGeneric(makeEvent({ typeCode: 'HR-R/PD' }))).toBeNull();
    });

    it('includes recent non-excluded events', () => {
      expect(convertCMPDEventToGeneric(makeEvent({ typeCode: 'AC-PI' }))).not.toBeNull();
    });

    it('excludes events older than 3 hours for non-injury types', () => {
      const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
      const event = makeEvent({
        typeCode: 'TC-MAL',
        typeDescription: 'TRAFFIC CONTROL MALFUNCTION',
        eventDateTime: fourHoursAgo,
      });
      expect(convertCMPDEventToGeneric(event)).toBeNull();
    });

    it('includes events within 3 hours for non-injury types', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const event = makeEvent({
        typeCode: 'TC-MAL',
        typeDescription: 'TRAFFIC CONTROL MALFUNCTION',
        eventDateTime: twoHoursAgo,
      });
      expect(convertCMPDEventToGeneric(event)).not.toBeNull();
    });

    it('uses 12-hour window for injury and fatality events', () => {
      const tenHoursAgo = new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString();
      const thirteenHoursAgo = new Date(Date.now() - 13 * 60 * 60 * 1000).toISOString();

      // Within 12h - kept
      expect(
        convertCMPDEventToGeneric(makeEvent({ typeCode: 'AC-PI', eventDateTime: tenHoursAgo }))
      ).not.toBeNull();
      expect(
        convertCMPDEventToGeneric(
          makeEvent({
            typeCode: 'AC-FI',
            typeDescription: 'ACCIDENT-FATALITY INVESTIGATION',
            eventDateTime: tenHoursAgo,
          })
        )
      ).not.toBeNull();

      // Past 12h - filtered
      expect(
        convertCMPDEventToGeneric(makeEvent({ typeCode: 'AC-PI', eventDateTime: thirteenHoursAgo }))
      ).toBeNull();
    });

    it('keeps events with unparseable dates', () => {
      const event = makeEvent({ eventDateTime: 'not-a-date' });
      expect(convertCMPDEventToGeneric(event)).not.toBeNull();
    });
  });

  describe('title formatting', () => {
    it('converts UPPER-CASE type description to title case', () => {
      const alert = convertCMPDEventToGeneric(
        makeEvent({ typeDescription: 'ACCIDENT-PERSONAL INJURY' })
      );
      expect(alert!.title).toBe('Accident - Personal injury');
    });
  });

  describe('summary', () => {
    it('includes address', () => {
      const alert = convertCMPDEventToGeneric(makeEvent({ address: '500 S TRYON ST' }));
      expect(alert!.summary).toContain('500 S TRYON ST');
    });

    it('includes sub-description when different from description', () => {
      const alert = convertCMPDEventToGeneric(
        makeEvent({
          typeDescription: 'ACCIDENT-PERSONAL INJURY',
          typeSubDescription: 'IN PROGRESS',
        })
      );
      expect(alert!.summary).toContain('In progress');
    });

    it('omits sub-description when same as description', () => {
      const alert = convertCMPDEventToGeneric(
        makeEvent({
          typeDescription: 'TRAFFIC STOP',
          typeSubDescription: 'TRAFFIC STOP',
        })
      );
      const parts = alert!.summary.split('Traffic stop');
      expect(parts.length).toBeLessThanOrEqual(2);
    });
  });

  describe('instructions by incident category', () => {
    it('generates crash instruction for AC- type codes', () => {
      const alert = convertCMPDEventToGeneric(makeEvent({ typeCode: 'AC-PI' }));
      expect(alert!.instruction).toContain('alternate routes');
    });

    it('generates traffic control instruction for TC- type codes', () => {
      const alert = convertCMPDEventToGeneric(
        makeEvent({ typeCode: 'TC-MAL', typeDescription: 'TRAFFIC CONTROL MALFUNCTION' })
      );
      expect(alert!.instruction).toContain('4-way stop');
    });

    it('generates obstruction instruction for RO- type codes', () => {
      const alert = convertCMPDEventToGeneric(
        makeEvent({ typeCode: 'RO-DEB', typeDescription: 'ROADWAY OBSTRUCTION-DEBRIS' })
      );
      expect(alert!.instruction).toContain('obstruction');
    });

    it('sets no instruction for unknown categories', () => {
      const alert = convertCMPDEventToGeneric(
        makeEvent({ typeCode: 'XX-YY', typeDescription: 'UNKNOWN TYPE' })
      );
      expect(alert!.instruction).toBeUndefined();
    });
  });
});

describe('convertCMPDEventsToGeneric', () => {
  it('converts events and filters out excluded types', () => {
    const events = [
      makeEvent({ eventNo: 'E1', typeCode: 'AC-PI' }),
      makeEvent({ eventNo: 'E2', typeCode: 'AC-R/PD' }), // filtered
      makeEvent({ eventNo: 'E3', typeCode: 'TC-MAL', typeDescription: 'TRAFFIC CONTROL' }),
    ];
    const alerts = convertCMPDEventsToGeneric(events);
    expect(alerts).toHaveLength(2);
    expect(alerts[0].id).toBe('cmpd-E1');
    expect(alerts[1].id).toBe('cmpd-E3');
  });
});
