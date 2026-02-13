import { describe, it, expect } from 'vitest';
import { firstLine } from './twitterHelpers';

describe('firstLine', () => {
  it('extracts first line from multi-line text', () => {
    expect(firstLine('Line 1\nLine 2\nLine 3')).toBe('Line 1');
  });

  it('handles \\r\\n line endings', () => {
    expect(firstLine('Line 1\r\nLine 2')).toBe('Line 1');
  });

  it('returns full text if single line within limit', () => {
    expect(firstLine('Short text', 80)).toBe('Short text');
  });

  it('truncates with ellipsis when first line exceeds max length', () => {
    const long = 'A'.repeat(100);
    const result = firstLine(long, 80);
    expect(result.length).toBe(80);
    expect(result).toBe('A'.repeat(77) + '...');
  });

  it('does not truncate text at exactly max length', () => {
    const exact = 'C'.repeat(80);
    expect(firstLine(exact, 80)).toBe(exact);
  });

  it('trims whitespace from first line', () => {
    expect(firstLine('  Trimmed  \nLine 2')).toBe('Trimmed');
  });

  it('handles empty string', () => {
    expect(firstLine('')).toBe('');
  });
});
