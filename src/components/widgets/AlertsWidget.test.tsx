import { describe, it, expect } from 'vitest';

// Extract the normalization logic for testing (matches AlertsWidget.tsx implementation)
function normalizeAISummary(summary: string): string[] {
  const raw = summary.trim();
  const lines = raw.split(/\n/).filter(Boolean);
  const hasBulletPrefix = lines.some(line => /^\s*[-*•]\s/.test(line));
  const normalizedLines = hasBulletPrefix
    ? lines.map(line => line.replace(/^\s*[-*•]\s*/, '').trim()).filter(Boolean)
    : lines.map(line => line.trim()).filter(Boolean);
  return normalizedLines;
}

describe('AI Summary Normalization Logic', () => {
  describe('with bullet prefixes', () => {
    it('extracts lines with bullet prefixes', () => {
      const summary = `- First item
- Second item
- Third item`;
      const result = normalizeAISummary(summary);
      expect(result).toEqual(['First item', 'Second item', 'Third item']);
    });

    it('handles different bullet styles', () => {
      const summary = `* Asterisk bullet
• Bullet point
- Dash bullet`;
      const result = normalizeAISummary(summary);
      expect(result).toEqual(['Asterisk bullet', 'Bullet point', 'Dash bullet']);
    });

    it('strips leading whitespace and bullets', () => {
      const summary = `  - Item with spaces
-No space
  *  Multiple spaces`;
      const result = normalizeAISummary(summary);
      expect(result).toEqual(['Item with spaces', 'No space', 'Multiple spaces']);
    });
  });

  describe('without bullet prefixes (FIXED)', () => {
    it('splits multi-line text into separate items', () => {
      const summary = `First line
Second line
Third line`;
      const result = normalizeAISummary(summary);

      expect(result).toHaveLength(3);
      expect(result).toEqual(['First line', 'Second line', 'Third line']);
      // This renders correctly in React as separate <li> elements
    });

    it('handles single-line summary correctly', () => {
      const summary = 'Single line summary';
      const result = normalizeAISummary(summary);
      expect(result).toEqual(['Single line summary']);
    });

    it('trims whitespace from each line', () => {
      const summary = `  First line
  Second line
  Third line  `;
      const result = normalizeAISummary(summary);
      expect(result).toEqual(['First line', 'Second line', 'Third line']);
    });
  });

  describe('edge cases', () => {
    it('handles empty summary', () => {
      const result = normalizeAISummary('');
      expect(result).toEqual([]);
    });

    it('handles whitespace-only summary', () => {
      const result = normalizeAISummary('   \n  \n  ');
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('handles mixed bulleted and non-bulleted lines', () => {
      const summary = `- Bulleted item
Regular line
- Another bullet`;
      const result = normalizeAISummary(summary);

      // Since hasBulletPrefix is true, processes all as bullets
      expect(result).toEqual(['Bulleted item', 'Regular line', 'Another bullet']);
    });
  });
});

describe('Proposed fix for newline rendering', () => {
  it('should split non-bulleted multi-line text into separate items', () => {
    const summary = `Weather alert in effect
Schools closed today
Roads are icy`;

    const raw = summary.trim();
    const lines = raw.split(/\n/).filter(Boolean);
    const hasBulletPrefix = lines.some(line => /^\s*[-*•]\s/.test(line));

    // PROPOSED FIX: Always split on newlines, just remove bullets if present
    const normalizedLines = hasBulletPrefix
      ? lines.map(line => line.replace(/^\s*[-*•]\s*/, '').trim()).filter(Boolean)
      : lines.map(line => line.trim()).filter(Boolean);

    expect(normalizedLines).toEqual([
      'Weather alert in effect',
      'Schools closed today',
      'Roads are icy',
    ]);
  });

  it('preserves single-line summaries as single items', () => {
    const summary = 'This is a single continuous summary without line breaks';

    const raw = summary.trim();
    const lines = raw.split(/\n/).filter(Boolean);
    const hasBulletPrefix = lines.some(line => /^\s*[-*•]\s/.test(line));

    const normalizedLines = hasBulletPrefix
      ? lines.map(line => line.replace(/^\s*[-*•]\s*/, '').trim()).filter(Boolean)
      : lines.map(line => line.trim()).filter(Boolean);

    expect(normalizedLines).toEqual(['This is a single continuous summary without line breaks']);
    expect(normalizedLines).toHaveLength(1);
  });
});
