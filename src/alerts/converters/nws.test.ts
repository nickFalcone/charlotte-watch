import { describe, it, expect } from 'vitest';
import { convertNWSAlertToGeneric, convertNWSAlertsToGeneric } from './nws';
import type { NWSAlertProperties, NWSAlertsResponse } from '../../types/weather';

function makeNWSAlert(
  overrides: {
    id?: string;
    type?: string;
    properties?: Partial<NWSAlertProperties>;
  } = {}
) {
  const { properties: propOverrides, ...rest } = overrides;
  return {
    id: 'urn:nws:alert:123',
    type: 'Feature',
    properties: {
      id: 'urn:nws:alert:123',
      areaDesc: 'Mecklenburg County',
      headline: 'Severe Thunderstorm Warning',
      severity: 'Severe' as const,
      certainty: 'Observed' as const,
      urgency: 'Immediate' as const,
      event: 'Severe Thunderstorm Warning',
      effective: '2026-02-13T12:00:00Z',
      expires: '2026-02-13T15:00:00Z',
      description: 'A severe thunderstorm is approaching the area.',
      instruction: 'Seek shelter immediately.',
      ...propOverrides,
    },
    ...rest,
  };
}

describe('convertNWSAlertToGeneric', () => {
  it('uses headline as summary, falls back to event name', () => {
    const withHeadline = convertNWSAlertToGeneric(
      makeNWSAlert({ properties: { headline: 'Wind advisory in effect until 6 PM' } })
    );
    expect(withHeadline.summary).toBe('Wind advisory in effect until 6 PM');

    const withoutHeadline = convertNWSAlertToGeneric(
      makeNWSAlert({ properties: { headline: '', event: 'Frost Advisory' } })
    );
    expect(withoutHeadline.summary).toBe('Frost Advisory');
  });

  it('converts null instruction to undefined', () => {
    const alert = convertNWSAlertToGeneric(makeNWSAlert({ properties: { instruction: null } }));
    expect(alert.instruction).toBeUndefined();
  });

  describe('severity mapping', () => {
    it('maps Extreme to critical', () => {
      const alert = convertNWSAlertToGeneric(makeNWSAlert({ properties: { severity: 'Extreme' } }));
      expect(alert.severity).toBe('critical');
    });

    it('maps Severe to moderate', () => {
      const alert = convertNWSAlertToGeneric(makeNWSAlert({ properties: { severity: 'Severe' } }));
      expect(alert.severity).toBe('moderate');
    });

    it('maps Minor to minor', () => {
      const alert = convertNWSAlertToGeneric(makeNWSAlert({ properties: { severity: 'Minor' } }));
      expect(alert.severity).toBe('minor');
    });

    it('elevates life-safety events to critical regardless of severity field', () => {
      expect(
        convertNWSAlertToGeneric(
          makeNWSAlert({ properties: { severity: 'Moderate', event: 'Tornado Warning' } })
        ).severity
      ).toBe('critical');

      expect(
        convertNWSAlertToGeneric(
          makeNWSAlert({ properties: { severity: 'Minor', event: 'Flash Flood Warning' } })
        ).severity
      ).toBe('critical');

      expect(
        convertNWSAlertToGeneric(
          makeNWSAlert({ properties: { severity: 'Moderate', event: 'Ice Storm Warning' } })
        ).severity
      ).toBe('critical');
    });
  });
});

describe('convertNWSAlertsToGeneric', () => {
  it('filters out NOAA radio maintenance alerts', () => {
    const response: NWSAlertsResponse = {
      features: [
        makeNWSAlert({ id: 'weather-alert' }),
        makeNWSAlert({
          id: 'maintenance-alert',
          properties: {
            description:
              'The NOAA Weather Radio transmitter in Charlotte will be off the air for routine maintenance.',
            event: 'Special Weather Statement',
          },
        }),
      ],
    };
    const alerts = convertNWSAlertsToGeneric(response);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].id).toBe('weather-alert');
  });

  it('filters NOAA maintenance with "broadcasting" + "out of service"', () => {
    const response: NWSAlertsResponse = {
      features: [
        makeNWSAlert({
          id: 'maint',
          properties: {
            description:
              'NOAA Weather Radio broadcasting equipment is out of service until further notice.',
          },
        }),
      ],
    };
    expect(convertNWSAlertsToGeneric(response)).toHaveLength(0);
  });

  it('keeps actual weather alerts that mention NOAA without maintenance context', () => {
    const response: NWSAlertsResponse = {
      features: [
        makeNWSAlert({
          id: 'real-weather',
          properties: {
            description: 'Tune to NOAA Weather Radio for the latest forecast. Heavy rain expected.',
          },
        }),
      ],
    };
    expect(convertNWSAlertsToGeneric(response)).toHaveLength(1);
  });
});
