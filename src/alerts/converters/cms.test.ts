import { describe, it, expect } from 'vitest';
import { convertCMSTweetToGeneric, convertCMSTweetsToGeneric } from './cms';
import type { CMSTweet } from '../../types/cms';

function makeTweet(overrides: Partial<CMSTweet> = {}): CMSTweet {
  return {
    id: 'tweet-100',
    text: 'Schools closed today due to icy roads',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('convertCMSTweetToGeneric', () => {
  it('truncates long text for title to 80 chars', () => {
    const longText = 'Schools closed because ' + 'A'.repeat(100);
    const alert = convertCMSTweetToGeneric(makeTweet({ text: longText }));
    expect(alert.title.length).toBeLessThanOrEqual(80);
    expect(alert.title.endsWith('...')).toBe(true);
  });

  it('falls back to current date when createdAt is empty', () => {
    const before = Date.now();
    const alert = convertCMSTweetToGeneric(makeTweet({ createdAt: '' }));
    const after = Date.now();
    expect(alert.updatedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(alert.updatedAt.getTime()).toBeLessThanOrEqual(after);
  });

  describe('severity mapping', () => {
    it('maps emergency keywords to critical', () => {
      expect(
        convertCMSTweetToGeneric(makeTweet({ text: 'Emergency alert: all schools evacuating' }))
          .severity
      ).toBe('critical');
      expect(
        convertCMSTweetToGeneric(makeTweet({ text: 'Active shooter reported at campus' })).severity
      ).toBe('critical');
      expect(
        convertCMSTweetToGeneric(makeTweet({ text: 'School lockdown in effect' })).severity
      ).toBe('critical');
    });

    it('maps closure/cancellation keywords to high', () => {
      expect(
        convertCMSTweetToGeneric(makeTweet({ text: 'All schools closed tomorrow' })).severity
      ).toBe('high');
      expect(
        convertCMSTweetToGeneric(makeTweet({ text: 'After-school activities canceled' })).severity
      ).toBe('high');
      expect(
        convertCMSTweetToGeneric(makeTweet({ text: '2-hour delay tomorrow morning' })).severity
      ).toBe('high');
    });

    it('maps "remote" to moderate', () => {
      expect(
        convertCMSTweetToGeneric(makeTweet({ text: 'Remote learning day tomorrow' })).severity
      ).toBe('moderate');
    });

    it('defaults to minor for generic text', () => {
      expect(
        convertCMSTweetToGeneric(makeTweet({ text: 'Update from CMS administration' })).severity
      ).toBe('minor');
    });
  });
});

describe('convertCMSTweetsToGeneric', () => {
  it('filters tweets through isCMSAlertTweet before conversion', () => {
    const tweets = [
      makeTweet({ id: 't1', text: 'Schools closed due to weather' }),
      makeTweet({ id: 't2', text: 'Join us for the school fundraiser' }), // no alert keyword
    ];
    const alerts = convertCMSTweetsToGeneric(tweets);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].id).toBe('cms-twitter-t1');
  });

  it('excludes holiday closures', () => {
    const tweets = [
      makeTweet({ id: 't1', text: 'Schools will be closed for Christmas Dec 24-26' }),
    ];
    expect(convertCMSTweetsToGeneric(tweets)).toHaveLength(0);
  });

  it('includes emergency alerts', () => {
    const tweets = [makeTweet({ id: 't1', text: 'Emergency lockdown at West Mecklenburg High' })];
    expect(convertCMSTweetsToGeneric(tweets)).toHaveLength(1);
  });
});
