import { describe, it, expect } from 'vitest';
import { stripEmojis, stripTcoLinks } from './textUtils';

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

describe('stripTcoLinks', () => {
  it('removes a trailing t.co link', () => {
    expect(stripTcoLinks('Blue Line delays in effect https://t.co/ABC123xyz')).toBe(
      'Blue Line delays in effect'
    );
  });

  it('removes a mid-sentence t.co link', () => {
    expect(stripTcoLinks('Details here https://t.co/ABC123 and more info')).toBe(
      'Details here  and more info'
    );
  });

  it('removes multiple t.co links', () => {
    expect(stripTcoLinks('See https://t.co/ABC and https://t.co/DEF for info')).toBe(
      'See  and  for info'
    );
  });

  it('leaves non-t.co URLs untouched', () => {
    expect(stripTcoLinks('Visit https://ridetransit.com for info')).toBe(
      'Visit https://ridetransit.com for info'
    );
  });

  it('handles text with no links', () => {
    expect(stripTcoLinks('Blue Line is running on time')).toBe('Blue Line is running on time');
  });
});
