import { describe, it, expect } from 'vitest';
import { stripEmojis } from './textUtils';

describe('stripEmojis', () => {
  it('removes emoji characters from text', () => {
    expect(stripEmojis('\u{1F6A8} Alert: service suspended \u{1F68C}')).toBe(
      'Alert: service suspended'
    );
  });

  it('strips variation selectors', () => {
    expect(stripEmojis('Warning\uFE0F text')).toBe('Warning text');
  });

  it('returns plain text unchanged', () => {
    expect(stripEmojis('Blue Line is running on time')).toBe('Blue Line is running on time');
  });

  it('handles empty string', () => {
    expect(stripEmojis('')).toBe('');
  });
});
