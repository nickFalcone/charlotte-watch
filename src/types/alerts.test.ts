import { describe, it, expect } from 'vitest';
import { mapNCDOTSeverity } from './alerts';

const base = {
  fatality: false,
  bridgeInvolved: false,
  condition: '',
  incidentType: '',
  lanesClosed: 0,
  lanesTotal: 0,
};

describe('mapNCDOTSeverity', () => {
  it('rates unplanned road closures and accidents as critical', () => {
    expect(mapNCDOTSeverity({ ...base, condition: 'Road closed', incidentType: 'Incident' })).toBe(
      'critical'
    );
    expect(mapNCDOTSeverity({ ...base, incidentType: 'Accident' })).toBe('critical');
  });

  it('keeps fatalities and bridge incidents critical', () => {
    expect(mapNCDOTSeverity({ ...base, fatality: true, incidentType: 'Construction' })).toBe(
      'critical'
    );
    expect(mapNCDOTSeverity({ ...base, bridgeInvolved: true, incidentType: 'Construction' })).toBe(
      'critical'
    );
  });

  it('caps construction and maintenance full closures below critical', () => {
    expect(
      mapNCDOTSeverity({ ...base, condition: 'Road closed', incidentType: 'Construction' })
    ).toBe('high');
    expect(
      mapNCDOTSeverity({ ...base, condition: 'Road closed', incidentType: 'Maintenance' })
    ).toBe('high');
  });

  it('rates construction lane closures moderate', () => {
    expect(
      mapNCDOTSeverity({ ...base, condition: 'Lane closed', incidentType: 'Construction' })
    ).toBe('moderate');
  });
});
