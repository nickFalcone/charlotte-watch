import { describe, it, expect } from 'vitest';
import { convertCATSAlertToGeneric, convertCATSTweetToGeneric } from './cats';
import type { CATSEntity, CATSTweet } from '../../types/cats';

function makeCATSEntity(overrides: Partial<CATSEntity> = {}): CATSEntity {
  return {
    id: 'alert-001',
    alert: {
      activePeriod: [{ start: 1707840000, end: 1707926400 }],
      informedEntity: [{ routeId: '501' }],
      cause: 'CONSTRUCTION',
      effect: 'DETOUR',
      headerText: {
        translation: [{ text: 'Blue Line detour in effect', language: 'en' }],
      },
      descriptionText: {
        translation: [{ text: 'Service detour due to track construction', language: 'en' }],
      },
      ...overrides.alert,
    },
    ...overrides,
  };
}

function makeTweet(overrides: Partial<CATSTweet> = {}): CATSTweet {
  return {
    id: 'tweet-123',
    text: 'Blue Line service is suspended between CTC and I-485',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('convertCATSAlertToGeneric', () => {
  it('uses effectDetail/causeDetail translations when available, falls back to raw fields', () => {
    const withDetail = convertCATSAlertToGeneric(
      makeCATSEntity({
        alert: {
          activePeriod: [{}],
          informedEntity: [{ routeId: '501' }],
          cause: 'CONSTRUCTION',
          effect: 'DETOUR',
          effectDetail: { translation: [{ text: 'Temporary reroute', language: 'en' }] },
          causeDetail: { translation: [{ text: 'Track repair', language: 'en' }] },
        },
      })
    );
    expect(withDetail.title).toBe('Temporary reroute - Track repair');

    // Without detail translations, uses raw effect/cause
    const withoutDetail = convertCATSAlertToGeneric(makeCATSEntity());
    expect(withoutDetail.title).toContain('detour');
    expect(withoutDetail.title).toContain('construction');
  });

  it('parses Unix timestamp active periods to Date objects', () => {
    const alert = convertCATSAlertToGeneric(
      makeCATSEntity({
        alert: {
          activePeriod: [{ start: 1707840000, end: 1707926400 }],
          informedEntity: [],
          cause: 'OTHER_CAUSE',
          effect: 'OTHER_EFFECT',
        },
      })
    );
    expect(alert.startTime).toEqual(new Date(1707840000 * 1000));
    expect(alert.endTime).toEqual(new Date(1707926400 * 1000));
  });

  it('handles missing active period timestamps', () => {
    const alert = convertCATSAlertToGeneric(
      makeCATSEntity({
        alert: {
          activePeriod: [{}],
          informedEntity: [],
          cause: 'OTHER_CAUSE',
          effect: 'OTHER_EFFECT',
        },
      })
    );
    expect(alert.startTime).toBeUndefined();
    expect(alert.endTime).toBeUndefined();
  });

  describe('severity mapping', () => {
    it('maps NO_SERVICE to critical, DETOUR to moderate, other to minor', () => {
      const make = (effect: string) =>
        convertCATSAlertToGeneric(
          makeCATSEntity({
            alert: {
              activePeriod: [{}],
              informedEntity: [],
              cause: 'CONSTRUCTION',
              effect,
            },
          })
        );

      expect(make('NO_SERVICE').severity).toBe('critical');
      expect(make('DETOUR').severity).toBe('moderate');
      expect(make('OTHER_EFFECT').severity).toBe('minor');
    });
  });
});

describe('convertCATSTweetToGeneric', () => {
  it('truncates long text for title', () => {
    const longText = 'A'.repeat(100);
    const alert = convertCATSTweetToGeneric(makeTweet({ text: longText }));
    expect(alert.title.length).toBeLessThanOrEqual(80);
    expect(alert.title.endsWith('...')).toBe(true);
  });

  describe('tweet severity', () => {
    it('detects suspension keywords as critical', () => {
      expect(
        convertCATSTweetToGeneric(makeTweet({ text: 'Blue Line service is suspended' })).severity
      ).toBe('critical');
      expect(
        convertCATSTweetToGeneric(makeTweet({ text: 'No service on Gold Line today' })).severity
      ).toBe('critical');
    });

    it('detects disruption keywords as moderate', () => {
      expect(
        convertCATSTweetToGeneric(makeTweet({ text: 'Detour in effect for Route 9' })).severity
      ).toBe('moderate');
      expect(
        convertCATSTweetToGeneric(makeTweet({ text: 'Expect 15 minute delay on Blue Line' }))
          .severity
      ).toBe('moderate');
      expect(
        convertCATSTweetToGeneric(makeTweet({ text: 'Road closed near CTC station' })).severity
      ).toBe('moderate');
    });

    it('defaults to minor for generic text', () => {
      expect(
        convertCATSTweetToGeneric(makeTweet({ text: 'Service update from CATS' })).severity
      ).toBe('minor');
    });
  });
});
