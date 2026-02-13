import { describe, it, expect } from 'vitest';
import { isServiceAlertTweet } from './catsFilters';

describe('isServiceAlertTweet', () => {
  it('matches service disruption terms', () => {
    expect(isServiceAlertTweet('CATS will suspend Blue Line service at 8pm')).toBe(true);
    expect(isServiceAlertTweet('Expect a 15-minute delay on Route 9')).toBe(true);
    expect(isServiceAlertTweet('Detour in effect near CTC')).toBe(true);
    expect(isServiceAlertTweet('Road closed near station, bus rerouted')).toBe(true);
    expect(isServiceAlertTweet('No service on route 51 today')).toBe(true);
  });

  it('matches transit line and infrastructure terms', () => {
    expect(isServiceAlertTweet('Blue Line running on schedule today')).toBe(true);
    expect(isServiceAlertTweet('Gold Line on schedule')).toBe(true);
    expect(isServiceAlertTweet('JW Clay station elevator out of service')).toBe(true);
    expect(isServiceAlertTweet('Streetcar operating on modified schedule')).toBe(true);
  });

  it('matches weather and operational terms', () => {
    expect(isServiceAlertTweet('Winter weather affecting transit')).toBe(true);
    expect(isServiceAlertTweet('Route 7 is back on schedule')).toBe(true);
  });

  describe('exclusion terms override service terms', () => {
    it('excludes promotional and event content', () => {
      expect(isServiceAlertTweet('Live now: Blue Line ribbon cutting ceremony')).toBe(false);
      expect(isServiceAlertTweet('Board meeting to discuss route changes')).toBe(false);
      expect(isServiceAlertTweet('Join the fare study for route improvements')).toBe(false);
      expect(isServiceAlertTweet('CATS is hosting a route info session')).toBe(false);
      expect(isServiceAlertTweet('Join us at the station grand opening')).toBe(false);
    });
  });

  it('rejects tweets without any service terms', () => {
    expect(isServiceAlertTweet('Happy holidays from CATS!')).toBe(false);
    expect(isServiceAlertTweet('New CATS merchandise available online')).toBe(false);
  });
});
