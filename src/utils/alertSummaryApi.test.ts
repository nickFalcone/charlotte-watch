import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  combinePowerAlerts,
  computeAlertsHash,
  fetchAlertSummary,
  filterAlertsForSummary,
  NO_SIGNIFICANT_ALERTS_SUMMARY,
} from './alertSummaryApi';
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

  it('produces different hash when updatedAt changes', () => {
    const alerts1 = [makeAlert({ id: 'a1', updatedAt: new Date('2024-01-15T12:00:00Z') })];
    const alerts2 = [makeAlert({ id: 'a1', updatedAt: new Date('2024-01-15T13:00:00Z') })];

    expect(computeAlertsHash(alerts1)).not.toBe(computeAlertsHash(alerts2));
  });

  it('produces different hash when title changes', () => {
    const alerts1 = [makeAlert({ id: 'a1', title: 'Flood Warning' })];
    const alerts2 = [makeAlert({ id: 'a1', title: 'Flood Watch' })];

    expect(computeAlertsHash(alerts1)).not.toBe(computeAlertsHash(alerts2));
  });

  it('produces different hash when summary changes', () => {
    const alerts1 = [makeAlert({ id: 'a1', summary: 'Service suspended' })];
    const alerts2 = [makeAlert({ id: 'a1', summary: 'Service resumed' })];

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

describe('filterAlertsForSummary thresholds', () => {
  it('drops minor FAA delays but keeps ground stops and closures', () => {
    const minorDelay = makeAlert({ id: 'faa-1', source: 'faa', category: 'aviation' });
    const minor = { ...minorDelay, severity: 'minor' as const };
    const moderate = { ...minorDelay, id: 'faa-2', severity: 'moderate' as const };
    const groundStop = { ...minorDelay, id: 'faa-3', severity: 'critical' as const };
    const ids = filterAlertsForSummary([minor, moderate, groundStop]).map(a => a.id);
    expect(ids).toEqual(['faa-2', 'faa-3']);
  });

  it('keeps only critical CMPD incidents', () => {
    const base = makeAlert({ source: 'cmpd', category: 'traffic' });
    const ids = filterAlertsForSummary([
      { ...base, id: 'c-minor', severity: 'minor' },
      { ...base, id: 'c-moderate', severity: 'moderate' },
      { ...base, id: 'c-critical', severity: 'critical' },
    ]).map(a => a.id);
    expect(ids).toEqual(['c-critical']);
  });

  it('keeps only critical and high CFD incidents', () => {
    const base = makeAlert({ source: 'cfd', category: 'other' });
    const ids = filterAlertsForSummary([
      { ...base, id: 'f-minor', severity: 'minor' },
      { ...base, id: 'f-moderate', severity: 'moderate' },
      { ...base, id: 'f-high', severity: 'high' },
      { ...base, id: 'f-critical', severity: 'critical' },
    ]).map(a => a.id);
    expect(ids).toEqual(['f-high', 'f-critical']);
  });

  it('drops CATS single-station elevator posts but keeps service disruptions', () => {
    const base = makeAlert({ source: 'cats', category: 'transit' });
    const ids = filterAlertsForSummary([
      {
        ...base,
        id: 'cats-elevator',
        title: 'The elevator at Archdale station is out of service',
        summary: 'The elevator at Archdale station is out of service; shuttle from Arrowood',
      },
      {
        ...base,
        id: 'cats-suspended',
        title: 'Blue Line suspended',
        summary: 'Blue Line service suspended; elevator outages at several stations',
      },
      { ...base, id: 'cats-other', title: 'Bus detour', summary: 'Route 11 on detour' },
    ]).map(a => a.id);
    expect(ids).toEqual(['cats-suspended', 'cats-other']);
  });
});

function makeDukeAlert(
  customersAffected: number,
  operationCenter: string | undefined,
  planned = false,
  overrides: Partial<GenericAlert> = {}
): GenericAlert {
  return makeAlert({
    id: `duke-${customersAffected}-${operationCenter ?? 'none'}`,
    source: 'duke',
    category: 'power',
    severity: 'minor',
    metadata: {
      source: 'duke',
      customersAffected,
      cause: planned ? 'planned' : 'unplanned',
      planned,
      eventId: 'e1',
      operationCenter,
    },
    ...overrides,
  });
}

describe('combinePowerAlerts', () => {
  it('returns null when there are no Duke alerts', () => {
    expect(combinePowerAlerts([])).toBeNull();
  });

  it('names the area for a single outage group', () => {
    const result = combinePowerAlerts([makeDukeAlert(150, 'Kannapolis')]);
    expect(result?.summary).toBe('150 Duke Energy customers without power in Kannapolis');
    expect(result?.title).toBe('Power Outages');
  });

  it('adds up customers across areas and lists each area', () => {
    const result = combinePowerAlerts([
      makeDukeAlert(1200, 'Charlotte'),
      makeDukeAlert(650, 'Huntersville'),
    ]);
    expect(result?.summary).toBe(
      '1,850 Duke Energy customers without power (Charlotte 1,200, Huntersville 650)'
    );
  });

  it('does not invent a location when none is provided', () => {
    const result = combinePowerAlerts([makeDukeAlert(300, undefined)]);
    expect(result?.summary).toBe('300 Duke Energy customers without power');
  });

  it('marks planned maintenance only when every outage is planned', () => {
    const allPlanned = combinePowerAlerts([makeDukeAlert(120, 'Matthews', true)]);
    expect(allPlanned?.summary).toContain('planned maintenance');
    expect(allPlanned?.title).toBe('Planned Power Outage');

    const mixed = combinePowerAlerts([
      makeDukeAlert(120, 'Matthews', true),
      makeDukeAlert(200, 'Pineville', false),
    ]);
    expect(mixed?.summary).not.toContain('planned');
  });

  it('uses the highest severity and the latest update time', () => {
    const result = combinePowerAlerts([
      makeDukeAlert(300, 'Charlotte', false, {
        severity: 'moderate',
        updatedAt: new Date('2024-01-15T10:00:00Z'),
      }),
      makeDukeAlert(2500, 'Huntersville', false, {
        severity: 'critical',
        updatedAt: new Date('2024-01-15T14:00:00Z'),
      }),
    ]);
    expect(result?.severity).toBe('critical');
    expect(result?.updatedAt).toBe('2024-01-15T14:00:00.000Z');
  });
});

describe('fetchAlertSummary', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the fixed no-alerts summary without calling the API when nothing is summary-worthy', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchAlertSummary([], 'empty');

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.summary).toBe(NO_SIGNIFICANT_ALERTS_SUMMARY);
    expect(result.hash).toBe('empty');
    expect(result.generatedAt).toBeTruthy();
  });

  it('posts alerts to the summarize endpoint otherwise', async () => {
    const body = { summary: '- Test', hash: 'abc', generatedAt: '2026-02-04T17:00:00.000Z' };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => body });
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchAlertSummary([makeAlert()], 'abc');

    expect(fetchMock).toHaveBeenCalledWith('/api/summarize-alerts', expect.any(Object));
    expect(result).toEqual(body);
  });
});
