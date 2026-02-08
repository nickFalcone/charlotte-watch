import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import { lightTheme } from '../../theme/theme';
import { WidgetTabs, TabPanel } from './WidgetTabs';

afterEach(cleanup);

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={lightTheme}>{ui}</ThemeProvider>);
}

describe('WidgetTabs', () => {
  describe('single tab', () => {
    it('renders content directly with no tab bar', () => {
      renderWithTheme(
        <WidgetTabs defaultValue="main">
          <TabPanel value="main" label="Main">
            <div>Main content</div>
          </TabPanel>
        </WidgetTabs>
      );

      expect(screen.getByText('Main content')).toBeInTheDocument();
      expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    });
  });

  describe('multiple tabs', () => {
    it('renders tab bar with correct labels', () => {
      renderWithTheme(
        <WidgetTabs defaultValue="first">
          <TabPanel value="first" label="First Tab">
            <div>First content</div>
          </TabPanel>
          <TabPanel value="second" label="Second Tab">
            <div>Second content</div>
          </TabPanel>
        </WidgetTabs>
      );

      expect(screen.getByRole('tablist')).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'First Tab' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Second Tab' })).toBeInTheDocument();
    });

    it('shows default tab content initially', () => {
      const { container } = renderWithTheme(
        <WidgetTabs defaultValue="first">
          <TabPanel value="first" label="First Tab">
            <div>First content</div>
          </TabPanel>
          <TabPanel value="second" label="Second Tab">
            <div>Second content</div>
          </TabPanel>
        </WidgetTabs>
      );

      expect(within(container).getByText('First content')).toBeVisible();
    });

    it('switches content when clicking a tab', async () => {
      const user = userEvent.setup();

      const { container } = renderWithTheme(
        <WidgetTabs defaultValue="first">
          <TabPanel value="first" label="First Tab">
            <div>First content</div>
          </TabPanel>
          <TabPanel value="second" label="Second Tab">
            <div>Second content</div>
          </TabPanel>
        </WidgetTabs>
      );

      const view = within(container);
      await user.click(view.getByRole('tab', { name: 'Second Tab' }));
      expect(view.getByText('Second content')).toBeVisible();
    });

    it('has correct ARIA attributes', () => {
      const { container } = renderWithTheme(
        <WidgetTabs defaultValue="first">
          <TabPanel value="first" label="First Tab">
            <div>First content</div>
          </TabPanel>
          <TabPanel value="second" label="Second Tab">
            <div>Second content</div>
          </TabPanel>
        </WidgetTabs>
      );

      const view = within(container);
      const firstTab = view.getByRole('tab', { name: 'First Tab' });
      const secondTab = view.getByRole('tab', { name: 'Second Tab' });

      expect(firstTab).toHaveAttribute('aria-selected', 'true');
      expect(secondTab).toHaveAttribute('aria-selected', 'false');

      const tabPanels = view.getAllByRole('tabpanel');
      expect(tabPanels.length).toBeGreaterThanOrEqual(1);
    });

    it('keeps forceMount panels in the DOM when inactive', () => {
      const { container } = renderWithTheme(
        <WidgetTabs defaultValue="first">
          <TabPanel value="first" label="First Tab">
            <div>First content</div>
          </TabPanel>
          <TabPanel value="second" label="Second Tab" forceMount>
            <div data-testid="force-mounted">Force mounted content</div>
          </TabPanel>
        </WidgetTabs>
      );

      expect(within(container).getByTestId('force-mounted')).toBeInTheDocument();
    });

    it('calls onValueChange when tab changes', async () => {
      const user = userEvent.setup();
      const values: string[] = [];

      const { container } = renderWithTheme(
        <WidgetTabs defaultValue="first" onValueChange={v => values.push(v)}>
          <TabPanel value="first" label="First Tab">
            <div>First content</div>
          </TabPanel>
          <TabPanel value="second" label="Second Tab">
            <div>Second content</div>
          </TabPanel>
        </WidgetTabs>
      );

      await user.click(within(container).getByRole('tab', { name: 'Second Tab' }));
      expect(values).toEqual(['second']);
    });
  });
});
