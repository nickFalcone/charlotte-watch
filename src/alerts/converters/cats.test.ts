import { describe, it, expect } from 'vitest';
import { convertCATSTweetToGeneric } from './cats';
import type { CATSTweet } from '../../types/cats';

function makeTweet(overrides: Partial<CATSTweet> = {}): CATSTweet {
  return {
    id: 'tweet-123',
    text: 'Blue Line service is suspended between CTC and I-485',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

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
