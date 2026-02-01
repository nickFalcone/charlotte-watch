import { describe, it, expect } from 'vitest';
import { computeAlertsHash } from './alertSummaryApi';
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
