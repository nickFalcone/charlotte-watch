import { test, expect } from '@playwright/test';
import { mockApiRoutes } from './helpers/mock-routes';

test.beforeEach(async ({ page }) => {
  await mockApiRoutes(page);
  await page.addInitScript(() => {
    localStorage.clear();
    // Suppress onboarding tour so it doesn't overlay header controls
    localStorage.setItem('charlotte-onboarding-seen', 'true');
  });
  await page.goto('/');
});

test('shows dashboard heading and header controls', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Charlotte Watch', level: 1 })).toBeVisible();
  // aria-label="Open widgets menu"; text content is "Manage Widgets"
  await expect(page.getByRole('button', { name: 'Open widgets menu' })).toBeVisible();
  await expect(page.getByRole('button', { name: /reset dashboard layout/i })).toBeVisible();
});

test('renders default visible widgets in the grid', async ({ page }) => {
  const grid = page.getByRole('main');
  // Default layout: Alerts, News, and LYNX Transit are visible by default
  await expect(grid.getByText('Alerts', { exact: true })).toBeVisible();
  await expect(grid.getByText('News', { exact: true })).toBeVisible();
  await expect(grid.getByText('LYNX Transit', { exact: true })).toBeVisible();
});

test('does not show hidden-by-default widgets in the grid', async ({ page }) => {
  const grid = page.getByRole('main');
  // Flight Tracker, Stocks, Weather are hidden by default
  await expect(grid.getByText('Flight Tracker', { exact: true })).not.toBeVisible();
  await expect(grid.getByText('Stocks', { exact: true })).not.toBeVisible();
  await expect(grid.getByText('Weather', { exact: true })).not.toBeVisible();
});
