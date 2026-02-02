import { describe, it, expect } from 'vitest';
import { computeAlertsHash, filterAlertsForSummary } from './alertSummaryApi';
import type { GenericAlert } from '../types/alerts';

function makeAlert(overrides: Partial<GenericAlert> = {}): GenericAlert {
  return {
    id: 'test-1',
    source: 'nws',
    category: 'weather',
    severity: 'moderate',
    title: 'Test Alert',
    summary: 'Test summary',
    updatedAt: new Date('2024-01-15T12:00:00Z'),
    ...overrides,
  };
}

describe('computeAlertsHash', () => {
  it('returns "empty" for empty array', () => {
    expect(computeAlertsHash([])).toBe('empty');
  });

  it('returns deterministic hash for same input', () => {
    const alerts = [makeAlert({ id: 'a1', severity: 'moderate' })];
    const hash1 = computeAlertsHash(alerts);
    const hash2 = computeAlertsHash(alerts);
    expect(hash1).toBe(hash2);
  });

  it('produces same hash regardless of input order', () => {
    const alert1 = makeAlert({ id: 'a1', severity: 'moderate' });
    const alert2 = makeAlert({ id: 'b2', severity: 'critical' });

    const hash1 = computeAlertsHash([alert1, alert2]);
    const hash2 = computeAlertsHash([alert2, alert1]);
    expect(hash1).toBe(hash2);
  });

  it('produces different hash when severity changes', () => {
    const alerts1 = [makeAlert({ id: 'a1', severity: 'moderate' })];
    const alerts2 = [makeAlert({ id: 'a1', severity: 'critical' })];

    expect(computeAlertsHash(alerts1)).not.toBe(computeAlertsHash(alerts2));
  });

  it('produces different hash when alert set changes', () => {
    const alert1 = makeAlert({ id: 'a1' });
    const alert2 = makeAlert({ id: 'b2' });

    const hashOne = computeAlertsHash([alert1]);
    const hashTwo = computeAlertsHash([alert1, alert2]);

    expect(hashOne).not.toBe(hashTwo);
  });

  it('returns a base-36 string', () => {
    const hash = computeAlertsHash([makeAlert()]);
    expect(hash).toMatch(/^[0-9a-z]+$/);
  });
});

function makeNCDOTConstructionAlert(updatedAt: Date): GenericAlert {
  return makeAlert({
    id: 'ncdot-123',
    source: 'ncdot',
    category: 'traffic',
    title: 'Construction',
    summary: 'Lane closure',
    updatedAt,
    metadata: {
      source: 'ncdot',
      incidentType: 'Construction',
      condition: 'Lane closed',
      reason: 'Maintenance',
      road: 'I-485',
      direction: 'N',
      lanesClosed: 1,
      lanesTotal: 3,
      fatality: false,
      bridgeInvolved: false,
      inWorkZone: true,
    },
  });
}

function makeNCDOTCrashAlert(updatedAt: Date): GenericAlert {
  return makeAlert({
    id: 'ncdot-456',
    source: 'ncdot',
    category: 'traffic',
    title: 'Crash',
    summary: 'Accident',
    updatedAt,
    metadata: {
      source: 'ncdot',
      incidentType: 'Accident',
      condition: 'Road blocked',
      reason: 'Collision',
      road: 'I-77',
      direction: 'S',
      lanesClosed: 2,
      lanesTotal: 3,
      fatality: false,
      bridgeInvolved: false,
      inWorkZone: false,
    },
  });
}

describe('filterAlertsForSummary', () => {
  const now = Date.now();
  const fortySevenHoursAgo = new Date(now - 47 * 60 * 60 * 1000);
  const fortyNineHoursAgo = new Date(now - 49 * 60 * 60 * 1000);

  it('returns empty array for empty input', () => {
    expect(filterAlertsForSummary([])).toEqual([]);
  });

  it('includes non-construction alerts regardless of age', () => {
    const weather = makeAlert({ id: 'nws-1', source: 'nws', updatedAt: fortyNineHoursAgo });
    expect(filterAlertsForSummary([weather])).toHaveLength(1);
    expect(filterAlertsForSummary([weather])[0].id).toBe('nws-1');
  });

  it('includes NCDOT construction updated within last 48 hours', () => {
    const construction = makeNCDOTConstructionAlert(fortySevenHoursAgo);
    expect(filterAlertsForSummary([construction])).toHaveLength(1);
  });

  it('excludes NCDOT construction not updated in last 48 hours', () => {
    const construction = makeNCDOTConstructionAlert(fortyNineHoursAgo);
    expect(filterAlertsForSummary([construction])).toHaveLength(0);
  });

  it('includes NCDOT non-construction (e.g. crash) regardless of age', () => {
    const crash = makeNCDOTCrashAlert(fortyNineHoursAgo);
    expect(filterAlertsForSummary([crash])).toHaveLength(1);
    expect(filterAlertsForSummary([crash])[0].id).toBe('ncdot-456');
  });

  it('filters mixed list: keeps weather, recent construction, and old crash; drops old construction', () => {
    const weather = makeAlert({ id: 'nws-1', source: 'nws', updatedAt: fortyNineHoursAgo });
    const recentConstruction = makeAlert({
      ...makeNCDOTConstructionAlert(fortySevenHoursAgo),
      id: 'ncdot-recent',
    });
    const staleConstruction = makeAlert({
      ...makeNCDOTConstructionAlert(fortyNineHoursAgo),
      id: 'ncdot-stale',
    });
    const oldCrash = makeNCDOTCrashAlert(fortyNineHoursAgo);

    const result = filterAlertsForSummary([
      weather,
      recentConstruction,
      staleConstruction,
      oldCrash,
    ]);
    expect(result).toHaveLength(3);
    expect(result.map(a => a.id)).toContain('nws-1');
    expect(result.map(a => a.id)).toContain('ncdot-recent');
    expect(result.map(a => a.id)).toContain('ncdot-456');
    expect(result.map(a => a.id)).not.toContain('ncdot-stale');
  });
});
