import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import { lightTheme } from '../../theme/theme';
import { OnboardingTour } from './OnboardingTour';
import { useDashboardStore } from '../../stores';

vi.mock('../../stores', () => ({
  useDashboardStore: vi.fn(),
}));

afterEach(cleanup);

const STORAGE_KEY = 'charlotte-onboarding-seen';

function setupStore({ total = 5, hidden = 0 } = {}) {
  const widgets = [
    ...Array.from({ length: total - hidden }, () => ({ visible: true })),
    ...Array.from({ length: hidden }, () => ({ visible: false })),
  ];
  (useDashboardStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
    (selector: (state: { widgets: typeof widgets }) => unknown) => selector({ widgets })
  );
}

function renderTour() {
  return render(
    <ThemeProvider theme={lightTheme}>
      <OnboardingTour>
        <button aria-label="Open widgets menu">Manage Widgets</button>
      </OnboardingTour>
    </ThemeProvider>
  );
}

describe('OnboardingTour', () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
    setupStore();
  });

  it('shows the onboarding tour for first-time visitors', () => {
    renderTour();
    expect(screen.getByRole('dialog', { name: /all widgets are visible/i })).toBeInTheDocument();
  });

  it('does not show the tour when already dismissed', () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    renderTour();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders a click-blocking overlay while the tour is open', () => {
    renderTour();
    expect(screen.getByTestId('tour-overlay')).toBeInTheDocument();
  });

  it('advances to step 2 content when Next is clicked', async () => {
    const user = userEvent.setup();
    renderTour();

    await user.click(screen.getByRole('button', { name: /next/i }));

    expect(screen.getByRole('dialog', { name: /customize your layout/i })).toBeInTheDocument();
    expect(screen.getByText(/drag the header to move/i)).toBeInTheDocument();
    expect(screen.getByText(/drag the bottom-right corner to resize/i)).toBeInTheDocument();
    expect(screen.getByText(/click the lock to lock position and size/i)).toBeInTheDocument();
    expect(screen.getByText(/click x to remove from dashboard/i)).toBeInTheDocument();
  });

  it('closes the tour when Got it is clicked', async () => {
    const user = userEvent.setup();
    renderTour();

    await user.click(screen.getByRole('button', { name: /next/i }));
    await user.click(screen.getByRole('button', { name: /got it/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('removes the click-blocking overlay when the tour is dismissed', async () => {
    const user = userEvent.setup();
    renderTour();

    expect(screen.getByTestId('tour-overlay')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /next/i }));
    await user.click(screen.getByRole('button', { name: /got it/i }));

    expect(screen.queryByTestId('tour-overlay')).not.toBeInTheDocument();
  });

  it('saves seen state to localStorage when Got it is clicked', async () => {
    const user = userEvent.setup();
    renderTour();

    await user.click(screen.getByRole('button', { name: /next/i }));
    await user.click(screen.getByRole('button', { name: /got it/i }));

    expect(localStorage.getItem(STORAGE_KEY)).toBe('true');
  });

  it('does not show the tour again after it has been dismissed', async () => {
    const user = userEvent.setup();
    renderTour();

    await user.click(screen.getByRole('button', { name: /next/i }));
    await user.click(screen.getByRole('button', { name: /got it/i }));
    cleanup();

    // Re-render simulating a page reload after dismissal
    renderTour();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('reflects widget counts dynamically in the tour body', () => {
    setupStore({ total: 7, hidden: 2 });
    renderTour();

    expect(screen.getByRole('dialog', { name: /some widgets are hidden/i })).toBeInTheDocument();
    expect(screen.getByText(/7/)).toBeInTheDocument();
    expect(screen.getByText(/2 are currently hidden/i)).toBeInTheDocument();
  });
});
