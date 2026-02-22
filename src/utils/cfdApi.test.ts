import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fetchCFDTwitter } from './cfdApi';
import type { CFDTweet } from '../types/cfd';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('fetchCFDTwitter', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns tweet array on successful response', async () => {
    const tweets: CFDTweet[] = [
      {
        id: '1',
        text: 'Structure fire at 123 Main St',
        createdAt: '2024-02-20T14:00:00Z',
        location: '123 Main St',
        latitude: 35.2271,
        longitude: -80.8431,
      },
    ];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: tweets }),
    });

    const result = await fetchCFDTwitter();

    expect(result).toEqual(tweets);
    expect(mockFetch).toHaveBeenCalledWith('/api/cfd-twitter', expect.any(Object));
  });

  it('returns empty array when response is not ok', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const result = await fetchCFDTwitter();

    expect(result).toEqual([]);
  });

  it('returns empty array when data.data is null', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: null }),
    });

    const result = await fetchCFDTwitter();

    expect(result).toEqual([]);
  });

  it('returns empty array when data.data is undefined', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const result = await fetchCFDTwitter();

    expect(result).toEqual([]);
  });

  it('returns empty array on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await fetchCFDTwitter();

    expect(result).toEqual([]);
  });

  it('returns empty array on invalid JSON', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => {
        throw new SyntaxError('Unexpected token');
      },
    });

    const result = await fetchCFDTwitter();

    expect(result).toEqual([]);
  });

  it('passes AbortSignal to fetch when provided', async () => {
    const controller = new AbortController();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });

    await fetchCFDTwitter(controller.signal);

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/cfd-twitter',
      expect.objectContaining({ signal: controller.signal })
    );
  });
});
