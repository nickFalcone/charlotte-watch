import { describe, it, expect } from 'vitest';
import { extractLocationFromTweet } from './cfdAddressParser';

describe('extractLocationFromTweet', () => {
  it('extracts "N block STREET" pattern', () => {
    const text = 'STRUCTURE FIRE:  1500 block Dean St. Smoke and fire showing on arrival.';
    expect(extractLocationFromTweet(text)).toContain('1500 block Dean St');
    expect(extractLocationFromTweet(text)).toContain('Charlotte, NC');
  });

  it('extracts "N block of STREET" pattern', () => {
    const text =
      'Structure Fire: 1900 block of Dugan Dr. E39 is on scene with fire showing from the garage.';
    expect(extractLocationFromTweet(text)).toContain('1900 block Dugan Dr');
    expect(extractLocationFromTweet(text)).toContain('Charlotte, NC');
  });

  it('extracts "N block of. STREET" typo pattern', () => {
    const text =
      'Structure Fire. 1800 block of. Camp Greene St. 30 Charlotte firefighters control fire in 15 minutes.';
    expect(extractLocationFromTweet(text)).toContain('1800 block Camp Greene St');
  });

  it('extracts "I-XXX outer loop at ROAD" pattern', () => {
    const text =
      'TRACTOR TRAILER FIRE: I-485 outer loop at Rocky River Rd. is closed due to a tractor-trailer fire. Find an alternate route.';
    expect(extractLocationFromTweet(text)).toContain('I-485 at Rocky River Rd');
    expect(extractLocationFromTweet(text)).toContain('Charlotte, NC');
  });

  it('extracts "in the N block of STREET" from narratives', () => {
    const text =
      'Charlotte Fire received multiple calls at approximately 6:43 a.m. today for a reported apartment fire in the 4400 block of Sharon Chase Drive. The first Charlotte Fire unit arrived on scene at 6:47 a.m.';
    const result = extractLocationFromTweet(text);
    expect(result).toContain('4400 block');
    expect(result).toContain('Sharon Chase Drive');
  });

  it('returns undefined for text without location', () => {
    expect(extractLocationFromTweet('No address here')).toBeUndefined();
    expect(extractLocationFromTweet('')).toBeUndefined();
  });
});
