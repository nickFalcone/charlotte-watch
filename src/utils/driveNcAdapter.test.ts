import { describe, it, expect } from 'vitest';
import {
  decodeEncodedPolyline,
  encodedPolylineToWkt,
  driveNCEventToIncident,
} from './driveNcAdapter';
import type { DriveNCEvent } from '../types/drivenc';

// Reference example from Google's polyline algorithm documentation
const GOOGLE_EXAMPLE = '_p~iF~ps|U_ulLnnqC_mqNvxq`@';

const baseEvent: DriveNCEvent = {
  ID: 42179,
  RoadwayName: 'I-85',
  DirectionOfTravel: 'Southbound',
  Description: 'Crash blocking lanes',
  Reported: 1733249520,
  LastUpdated: 1742324386,
  StartDate: 1733249520,
  PlannedEndDate: null,
  Latitude: 35.76,
  Longitude: -80.34,
  EventType: 'accidentsAndIncidents',
  EventSubType: 'vehicleCrash',
  IsFullClosure: false,
  County: 'Mecklenburg',
};

describe('decodeEncodedPolyline', () => {
  it('decodes the reference polyline', () => {
    expect(decodeEncodedPolyline(GOOGLE_EXAMPLE)).toEqual([
      [38.5, -120.2],
      [40.7, -120.95],
      [43.252, -126.453],
    ]);
  });

  it('returns an empty array for an empty string', () => {
    expect(decodeEncodedPolyline('')).toEqual([]);
  });
});

describe('encodedPolylineToWkt', () => {
  it('emits lng lat order', () => {
    expect(encodedPolylineToWkt(GOOGLE_EXAMPLE)).toBe(
      'LINESTRING (-120.2 38.5, -120.95 40.7, -126.453 43.252)'
    );
  });

  it('returns empty string for missing or single-point input', () => {
    expect(encodedPolylineToWkt(null)).toBe('');
    expect(encodedPolylineToWkt('_p~iF~ps|U')).toBe('');
  });
});

describe('driveNCEventToIncident', () => {
  it('maps a crash', () => {
    const incident = driveNCEventToIncident(baseEvent);
    expect(incident.id).toBe(42179);
    expect(incident.road).toBe('I-85');
    expect(incident.direction).toBe('Southbound');
    expect(incident.incidentType).toBe('Accident');
    expect(incident.start).toBe(new Date(1733249520 * 1000).toISOString());
    expect(incident.end).toBe('');
    expect(incident.inWorkZone).toBe(false);
  });

  it('treats full closures as road closed', () => {
    expect(driveNCEventToIncident({ ...baseEvent, IsFullClosure: true }).condition).toBe(
      'Road closed'
    );
  });

  it('classifies lane and shoulder closures from LanesAffected', () => {
    expect(driveNCEventToIncident({ ...baseEvent, LanesAffected: 'Right lane' }).condition).toBe(
      'Lane closed'
    );
    expect(
      driveNCEventToIncident({ ...baseEvent, LanesAffected: 'Right shoulder' }).condition
    ).toBe('Shoulder closed');
  });

  it('uses the original event type for closures and flags roadwork', () => {
    const closure = driveNCEventToIncident({
      ...baseEvent,
      EventType: 'closures',
      OriginalEventType: 'roadwork',
    });
    expect(closure.incidentType).toBe('Construction');
    expect(closure.inWorkZone).toBe(true);
  });

  it('clears unspecified directions', () => {
    expect(
      driveNCEventToIncident({ ...baseEvent, DirectionOfTravel: 'All Directions' }).direction
    ).toBe('');
  });

  it('joins detour instructions from arrays or strings', () => {
    const fromArray = driveNCEventToIncident({
      ...baseEvent,
      DetourInstructions: ['Exit 5', 'Turn left'],
    });
    expect(fromArray.detour).toBe('Exit 5; Turn left');
    expect(fromArray.isDetour).toBe(true);
    expect(driveNCEventToIncident(baseEvent).isDetour).toBe(false);
  });

  it('detects fatalities from description text', () => {
    expect(
      driveNCEventToIncident({ ...baseEvent, Description: 'Fatal crash, road closed' }).fatality
    ).toBe(true);
  });
});
