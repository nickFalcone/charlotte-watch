import { describe, it, expect } from 'vitest';
import { isCFDIncidentTweet } from './cfdFilters';

describe('isCFDIncidentTweet', () => {
  it('accepts structure fire tweets', () => {
    expect(
      isCFDIncidentTweet('STRUCTURE FIRE: 1500 block Dean St. Smoke and fire showing on arrival.')
    ).toBe(true);
  });

  it('accepts tractor trailer fire tweets', () => {
    expect(
      isCFDIncidentTweet(
        'TRACTOR TRAILER FIRE: I-485 outer loop at Rocky River Rd. is closed due to a tractor-trailer fire.'
      )
    ).toBe(true);
  });

  it('accepts apartment fire narrative tweets', () => {
    expect(
      isCFDIncidentTweet(
        'Charlotte Fire received multiple calls at approximately 6:43 a.m. today for a reported apartment fire in the 4400 block of Sharon Chase Drive.'
      )
    ).toBe(true);
  });

  it('rejects job fair and hiring posts', () => {
    expect(isCFDIncidentTweet('Join our team! Job fair next week.')).toBe(false);
  });

  it('rejects community event posts', () => {
    expect(isCFDIncidentTweet('Fire Prevention Week - community event at the station.')).toBe(
      false
    );
  });
});
