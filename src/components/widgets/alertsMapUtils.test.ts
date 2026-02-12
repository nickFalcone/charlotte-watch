import { describe, it, expect } from 'vitest';
import type { GenericAlert } from '../../types/alerts';
import {
  getDisplaySeverity,
  getAlertCoordinates,
  getAlertPolylineSegments,
  getAlertPolygon,
  getAlertSegmentCoordinates,
  getAlertCoordinateList,
} from './alertsMapUtils';

function makeAlert(overrides: Partial<GenericAlert> = {}): GenericAlert {
  return {
    id: 'test-1',
    source: 'nws',
    category: 'weather',
    severity: 'moderate',
    title: 'Test Alert',
    summary: 'Test summary',
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

describe('getDisplaySeverity', () => {
  it('returns undefined when no metadata', () => {
    expect(getDisplaySeverity(makeAlert())).toBeUndefined();
  });

  it('returns displaySeverity from metadata', () => {
    const alert = makeAlert({
      metadata: {
        source: 'nws',
        certainty: '',
        urgency: '',
        nwsSeverity: '',
        displaySeverity: 'High',
      },
    });
    expect(getDisplaySeverity(alert)).toBe('High');
  });

  it('returns undefined when displaySeverity is missing', () => {
    const alert = makeAlert({
      metadata: { source: 'nws', certainty: '', urgency: '', nwsSeverity: '' },
    });
    expect(getDisplaySeverity(alert)).toBeUndefined();
  });
});

describe('getAlertCoordinates', () => {
  it('returns null when no metadata', () => {
    expect(getAlertCoordinates(makeAlert())).toBeNull();
  });

  it('returns coordinates from NCDOT metadata', () => {
    const alert = makeAlert({
      source: 'ncdot',
      metadata: {
        source: 'ncdot',
        incidentType: 'Construction',
        condition: 'Lane Closed',
        reason: 'Work zone',
        road: 'I-77',
        direction: 'N',
        lanesClosed: 1,
        lanesTotal: 3,
        fatality: false,
        bridgeInvolved: false,
        inWorkZone: true,
        latitude: 35.2271,
        longitude: -80.8431,
      },
    });
    expect(getAlertCoordinates(alert)).toEqual({ lat: 35.2271, lng: -80.8431 });
  });

  it('returns coordinates from CMPD metadata', () => {
    const alert = makeAlert({
      source: 'cmpd',
      metadata: {
        source: 'cmpd',
        eventNo: '123',
        typeCode: 'AC-PI',
        typeDescription: 'Accident',
        typeSubDescription: 'Personal Injury',
        division: 'Central',
        latitude: 35.2,
        longitude: -80.8,
      },
    });
    expect(getAlertCoordinates(alert)).toEqual({ lat: 35.2, lng: -80.8 });
  });

  it('returns null for NWS (no lat/lng)', () => {
    const alert = makeAlert({
      metadata: { source: 'nws', certainty: '', urgency: '', nwsSeverity: '' },
    });
    expect(getAlertCoordinates(alert)).toBeNull();
  });
});

describe('getAlertPolylineSegments', () => {
  it('returns empty array when no metadata', () => {
    expect(getAlertPolylineSegments(makeAlert())).toEqual([]);
  });

  it('returns top-level shapePoints as single segment', () => {
    const alert = makeAlert({
      source: 'ncdot',
      metadata: {
        source: 'ncdot',
        incidentType: 'Construction',
        condition: 'Lane Closed',
        reason: 'Work zone',
        road: 'I-77',
        direction: 'N',
        lanesClosed: 1,
        lanesTotal: 3,
        fatality: false,
        bridgeInvolved: false,
        inWorkZone: true,
        shapePoints: [
          [35.2, -80.8],
          [35.3, -80.9],
        ],
      },
    });
    expect(getAlertPolylineSegments(alert)).toEqual([
      [
        [35.2, -80.8],
        [35.3, -80.9],
      ],
    ]);
  });

  it('returns per-segment shapePoints for consolidated alerts', () => {
    const alert = makeAlert({
      source: 'ncdot',
      metadata: {
        source: 'ncdot',
        incidentType: 'Construction',
        condition: 'Lane Closed',
        reason: 'Work zone',
        road: 'I-77',
        direction: 'N',
        lanesClosed: 1,
        lanesTotal: 3,
        fatality: false,
        bridgeInvolved: false,
        inWorkZone: true,
        segments: [
          {
            location: 'MM 10-12',
            direction: 'N',
            condition: 'Lane Closed',
            reason: 'Work',
            lanesClosed: 1,
            lanesTotal: 3,
            start: '2024-01-01',
            end: '2024-02-01',
            incidentId: 1,
            shapePoints: [
              [35.2, -80.8],
              [35.25, -80.85],
            ],
          },
          {
            location: 'MM 15-17',
            direction: 'S',
            condition: 'Lane Closed',
            reason: 'Work',
            lanesClosed: 1,
            lanesTotal: 3,
            start: '2024-01-01',
            end: '2024-02-01',
            incidentId: 2,
            shapePoints: [
              [35.3, -80.9],
              [35.35, -80.95],
            ],
          },
        ],
      },
    });
    const segments = getAlertPolylineSegments(alert);
    expect(segments).toHaveLength(2);
    expect(segments[0]).toEqual([
      [35.2, -80.8],
      [35.25, -80.85],
    ]);
    expect(segments[1]).toEqual([
      [35.3, -80.9],
      [35.35, -80.95],
    ]);
  });

  it('ignores segments without shapePoints', () => {
    const alert = makeAlert({
      source: 'ncdot',
      metadata: {
        source: 'ncdot',
        incidentType: 'Construction',
        condition: 'Lane Closed',
        reason: 'Work zone',
        road: 'I-77',
        direction: 'N',
        lanesClosed: 1,
        lanesTotal: 3,
        fatality: false,
        bridgeInvolved: false,
        inWorkZone: true,
        segments: [
          {
            location: 'MM 10-12',
            direction: 'N',
            condition: 'Lane Closed',
            reason: 'Work',
            lanesClosed: 1,
            lanesTotal: 3,
            start: '2024-01-01',
            end: '2024-02-01',
            incidentId: 1,
          },
        ],
      },
    });
    expect(getAlertPolylineSegments(alert)).toEqual([]);
  });
});

describe('getAlertPolygon', () => {
  it('returns null when no metadata', () => {
    expect(getAlertPolygon(makeAlert())).toBeNull();
  });

  it('returns polygon from Duke metadata', () => {
    const polygon: [number, number][] = [
      [35.2, -80.8],
      [35.3, -80.9],
      [35.25, -80.7],
    ];
    const alert = makeAlert({
      source: 'duke',
      metadata: {
        source: 'duke',
        customersAffected: 500,
        cause: 'unplanned',
        planned: false,
        eventId: 'EVT-1',
        polygon,
      },
    });
    expect(getAlertPolygon(alert)).toEqual(polygon);
  });

  it('returns null when polygon has fewer than 3 vertices', () => {
    const alert = makeAlert({
      source: 'duke',
      metadata: {
        source: 'duke',
        customersAffected: 500,
        cause: 'unplanned',
        planned: false,
        eventId: 'EVT-1',
        polygon: [
          [35.2, -80.8],
          [35.3, -80.9],
        ],
      },
    });
    expect(getAlertPolygon(alert)).toBeNull();
  });
});

describe('getAlertSegmentCoordinates', () => {
  it('returns empty array when no segments', () => {
    expect(getAlertSegmentCoordinates(makeAlert())).toEqual([]);
  });

  it('returns lat/lng from segments', () => {
    const alert = makeAlert({
      source: 'ncdot',
      metadata: {
        source: 'ncdot',
        incidentType: 'Construction',
        condition: 'Lane Closed',
        reason: 'Work zone',
        road: 'I-77',
        direction: 'N',
        lanesClosed: 1,
        lanesTotal: 3,
        fatality: false,
        bridgeInvolved: false,
        inWorkZone: true,
        segments: [
          {
            location: 'MM 10',
            direction: 'N',
            condition: 'Lane Closed',
            reason: 'Work',
            lanesClosed: 1,
            lanesTotal: 3,
            start: '2024-01-01',
            end: '2024-02-01',
            incidentId: 1,
            latitude: 35.2,
            longitude: -80.8,
          },
          {
            location: 'MM 15',
            direction: 'S',
            condition: 'Lane Closed',
            reason: 'Work',
            lanesClosed: 1,
            lanesTotal: 3,
            start: '2024-01-01',
            end: '2024-02-01',
            incidentId: 2,
            latitude: 35.3,
            longitude: -80.9,
          },
        ],
      },
    });
    expect(getAlertSegmentCoordinates(alert)).toEqual([
      { lat: 35.2, lng: -80.8 },
      { lat: 35.3, lng: -80.9 },
    ]);
  });

  it('skips segments without coordinates', () => {
    const alert = makeAlert({
      source: 'ncdot',
      metadata: {
        source: 'ncdot',
        incidentType: 'Construction',
        condition: 'Lane Closed',
        reason: 'Work zone',
        road: 'I-77',
        direction: 'N',
        lanesClosed: 1,
        lanesTotal: 3,
        fatality: false,
        bridgeInvolved: false,
        inWorkZone: true,
        segments: [
          {
            location: 'MM 10',
            direction: 'N',
            condition: 'Lane Closed',
            reason: 'Work',
            lanesClosed: 1,
            lanesTotal: 3,
            start: '2024-01-01',
            end: '2024-02-01',
            incidentId: 1,
          },
        ],
      },
    });
    expect(getAlertSegmentCoordinates(alert)).toEqual([]);
  });
});

describe('getAlertCoordinateList', () => {
  it('returns empty array for alert with no coordinates', () => {
    expect(getAlertCoordinateList(makeAlert())).toEqual([]);
  });

  it('returns polygon coordinates first', () => {
    const polygon: [number, number][] = [
      [35.2, -80.8],
      [35.3, -80.9],
      [35.25, -80.7],
    ];
    const alert = makeAlert({
      source: 'duke',
      metadata: {
        source: 'duke',
        customersAffected: 500,
        cause: 'unplanned',
        planned: false,
        eventId: 'EVT-1',
        polygon,
        latitude: 35.22,
        longitude: -80.82,
      },
    });
    const coords = getAlertCoordinateList(alert);
    expect(coords).toHaveLength(3);
    expect(coords[0]).toEqual({ lat: 35.2, lng: -80.8 });
  });

  it('returns polyline coordinates when no polygon', () => {
    const alert = makeAlert({
      source: 'ncdot',
      metadata: {
        source: 'ncdot',
        incidentType: 'Construction',
        condition: 'Lane Closed',
        reason: 'Work zone',
        road: 'I-77',
        direction: 'N',
        lanesClosed: 1,
        lanesTotal: 3,
        fatality: false,
        bridgeInvolved: false,
        inWorkZone: true,
        shapePoints: [
          [35.2, -80.8],
          [35.3, -80.9],
        ],
      },
    });
    const coords = getAlertCoordinateList(alert);
    expect(coords).toHaveLength(2);
    expect(coords[0]).toEqual({ lat: 35.2, lng: -80.8 });
  });

  it('falls back to single coordinate', () => {
    const alert = makeAlert({
      source: 'cmpd',
      metadata: {
        source: 'cmpd',
        eventNo: '123',
        typeCode: 'AC-PI',
        typeDescription: 'Accident',
        typeSubDescription: 'Personal Injury',
        division: 'Central',
        latitude: 35.2,
        longitude: -80.8,
      },
    });
    const coords = getAlertCoordinateList(alert);
    expect(coords).toEqual([{ lat: 35.2, lng: -80.8 }]);
  });
});
