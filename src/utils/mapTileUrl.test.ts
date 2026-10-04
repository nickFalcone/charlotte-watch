import { describe, expect, it, vi } from 'vitest';
import { getMapTileUrl } from './mapTileUrl';

describe('getMapTileUrl', () => {
  it('uses the dark style and appends the API key', () => {
    expect(getMapTileUrl('dark', 'abc123')).toBe(
      'https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png?key=abc123'
    );
  });

  it('uses the light style for any non-dark theme', () => {
    expect(getMapTileUrl('light', 'abc123')).toBe(
      'https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png?key=abc123'
    );
  });

  it('URL-encodes the API key', () => {
    expect(getMapTileUrl('light', 'a b&c')).toContain('?key=a%20b%26c');
  });

  it('omits the key and warns once when none is configured', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(getMapTileUrl('dark', '')).toBe(
      'https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png'
    );
    getMapTileUrl('light', '');

    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});
