import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { TimeUpdated } from './TimeUpdated';
import { lightTheme } from '../../theme/theme';

// Helper to render with theme context
function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={lightTheme}>{ui}</ThemeProvider>);
}

describe('TimeUpdated', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows paused reason when provided', () => {
    const getPausedReason = () => 'Widget paused';
    renderWithTheme(<TimeUpdated timestamp={Date.now()} getPausedReason={getPausedReason} />);
    expect(screen.getByText('Widget paused')).toBeInTheDocument();
  });

  it('shows "Timestamp unavailable" when timestamp is null', () => {
    const getPausedReason = () => null;
    renderWithTheme(<TimeUpdated timestamp={null} getPausedReason={getPausedReason} />);
    expect(screen.getByText('Timestamp unavailable')).toBeInTheDocument();
  });

  it('shows "just now" for timestamps less than 10 seconds ago', () => {
    const now = Date.now();
    vi.setSystemTime(now);

    const getPausedReason = () => null;
    // 5 seconds ago
    renderWithTheme(<TimeUpdated timestamp={now - 5000} getPausedReason={getPausedReason} />);
    expect(screen.getByText('just now')).toBeInTheDocument();
  });

  it('shows relative time for timestamps 10+ seconds ago', () => {
    const now = Date.now();
    vi.setSystemTime(now);

    const getPausedReason = () => null;
    // 2 minutes ago
    const twoMinutesAgo = now - 2 * 60 * 1000;
    renderWithTheme(<TimeUpdated timestamp={twoMinutesAgo} getPausedReason={getPausedReason} />);

    // date-fns formatDistanceToNowStrict outputs "2 minutes ago"
    expect(screen.getByText('2 minutes ago')).toBeInTheDocument();
  });

  it('prioritizes paused reason over timestamp', () => {
    const now = Date.now();
    vi.setSystemTime(now);

    const getPausedReason = vi.fn(() => 'Offline');
    const { container } = renderWithTheme(
      <TimeUpdated timestamp={now} getPausedReason={getPausedReason} />
    );

    expect(screen.getByText('Offline')).toBeInTheDocument();
    // Should only have one TimeText element
    const timeTexts = container.querySelectorAll('span');
    expect(timeTexts).toHaveLength(1);
    expect(timeTexts[0]).toHaveTextContent('Offline');
  });

  it('handles timestamp at exact boundary (10 seconds)', () => {
    const now = Date.now();
    vi.setSystemTime(now);

    const getPausedReason = () => null;
    // Exactly 10 seconds ago - boundary is "< 10", so 10s should show relative time
    const tenSecondsAgo = now - 10 * 1000;
    renderWithTheme(<TimeUpdated timestamp={tenSecondsAgo} getPausedReason={getPausedReason} />);

    // At exactly 10s, should show relative time
    expect(screen.getByText('10 seconds ago')).toBeInTheDocument();
  });
});
