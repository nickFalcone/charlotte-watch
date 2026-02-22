import { describe, it, expect } from 'vitest';
import { convertCFDTweetToGeneric, convertCFDTweetsToGeneric } from './cfd';
import type { CFDTweet } from '../../types/cfd';

describe('convertCFDTweetToGeneric', () => {
  const baseTweet: CFDTweet = {
    id: '123',
    text: 'STRUCTURE FIRE: 1500 block Dean St. Smoke and fire showing on arrival.',
    createdAt: '2025-02-21T12:00:00Z',
    author: { id: '23398654' },
    type: 'tweet',
  };

  it('converts tweet to generic alert', () => {
    const alert = convertCFDTweetToGeneric(baseTweet);
    expect(alert.id).toBe('cfd-twitter-123');
    expect(alert.source).toBe('cfd');
    expect(alert.category).toBe('other');
    expect(alert.title).toContain('STRUCTURE FIRE');
    expect(alert.summary).toBe(baseTweet.text);
    expect(alert.metadata?.source).toBe('cfd');
    expect(alert.metadata && 'tweetId' in alert.metadata && alert.metadata.tweetId).toBe('123');
  });

  it('includes location in metadata when present', () => {
    const tweet: CFDTweet = {
      ...baseTweet,
      location: '1500 block Dean St, Charlotte, NC',
    };
    const alert = convertCFDTweetToGeneric(tweet);
    expect(alert.metadata && 'location' in alert.metadata && alert.metadata.location).toBe(
      '1500 block Dean St, Charlotte, NC'
    );
    expect(alert.affectedArea).toBe('1500 block Dean St, Charlotte, NC');
  });

  it('includes coordinates in metadata when present', () => {
    const tweet: CFDTweet = {
      ...baseTweet,
      latitude: 35.2,
      longitude: -80.8,
    };
    const alert = convertCFDTweetToGeneric(tweet);
    expect(alert.metadata && 'latitude' in alert.metadata && alert.metadata.latitude).toBe(35.2);
    expect(alert.metadata && 'longitude' in alert.metadata && alert.metadata.longitude).toBe(-80.8);
  });

  it('assigns critical severity for structure fire', () => {
    const alert = convertCFDTweetToGeneric(baseTweet);
    expect(alert.severity).toBe('critical');
  });

  it('assigns high severity for tractor trailer fire', () => {
    const tweet: CFDTweet = {
      ...baseTweet,
      text: 'TRACTOR TRAILER FIRE: I-485 outer loop at Rocky River Rd. is closed.',
    };
    const alert = convertCFDTweetToGeneric(tweet);
    expect(alert.severity).toBe('high');
  });
});

describe('convertCFDTweetsToGeneric', () => {
  it('converts array of tweets', () => {
    const tweets: CFDTweet[] = [
      {
        id: '1',
        text: 'Structure Fire: 1900 block of Dugan Dr.',
        createdAt: '2025-02-21T12:00:00Z',
      },
      {
        id: '2',
        text: 'Road closed due to incident.',
        createdAt: '2025-02-21T13:00:00Z',
      },
    ];
    const alerts = convertCFDTweetsToGeneric(tweets);
    expect(alerts).toHaveLength(2);
    expect(alerts[0].id).toBe('cfd-twitter-1');
    expect(alerts[1].id).toBe('cfd-twitter-2');
  });
});
