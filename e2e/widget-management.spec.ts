import { test, expect } from '@playwright/test';
import { mockApiRoutes } from './helpers/mock-routes';

test.beforeEach(async ({ page }) => {
  await mockApiRoutes(page);
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('charlotte-onboarding-seen', 'true');
  });
  await page.goto('/');
});

test('opens and closes the widget manager drawer', async ({ page }) => {
  await page.getByRole('button', { name: 'Open widgets menu' }).click();
  const drawer = page.getByRole('dialog', { name: /manage widgets/i });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole('heading', { name: 'Manage Widgets' })).toBeVisible();

  await drawer.getByRole('button', { name: /close widget manager/i }).click();
  await expect(drawer).not.toBeVisible();
});

test('lists all six widgets in the drawer with correct visibility status', async ({ page }) => {
  await page.getByRole('button', { name: 'Open widgets menu' }).click();
  const drawer = page.getByRole('dialog', { name: /manage widgets/i });

  // Default visible widgets
  await expect(drawer.getByRole('button', { name: /Alerts - Visible/i })).toBeVisible();
  await expect(drawer.getByRole('button', { name: /News - Visible/i })).toBeVisible();
  await expect(drawer.getByRole('button', { name: /LYNX Transit - Visible/i })).toBeVisible();

  // Default hidden widgets
  await expect(drawer.getByRole('button', { name: /Flight Tracker - Hidden/i })).toBeVisible();
  await expect(drawer.getByRole('button', { name: /Stocks - Hidden/i })).toBeVisible();
  await expect(drawer.getByRole('button', { name: /Weather - Hidden/i })).toBeVisible();
});

test('hiding a widget removes it from the grid', async ({ page }) => {
  const grid = page.getByRole('main');

  // News is visible by default
  await expect(grid.getByText('News', { exact: true })).toBeVisible();

  // Open drawer and hide News
  await page.getByRole('button', { name: 'Open widgets menu' }).click();
  const drawer = page.getByRole('dialog', { name: /manage widgets/i });
  await drawer.getByRole('button', { name: /News - Visible/i }).click();

  // Widget should be removed from the grid (drawer is still open, but News
  // widget title only lives inside <main>, not inside the drawer portal)
  await expect(grid.getByText('News', { exact: true })).not.toBeVisible();

  // Drawer shows News as hidden
  await expect(drawer.getByRole('button', { name: /News - Hidden/i })).toBeVisible();
});

test('showing a hidden widget adds it back to the grid', async ({ page }) => {
  const grid = page.getByRole('main');

  // Open drawer and hide News first
  await page.getByRole('button', { name: 'Open widgets menu' }).click();
  const drawer = page.getByRole('dialog', { name: /manage widgets/i });
  await drawer.getByRole('button', { name: /News - Visible/i }).click();
  await expect(grid.getByText('News', { exact: true })).not.toBeVisible();

  // Re-show News — drawer stays open; confirm drawer reflects the new state
  await drawer.getByRole('button', { name: /News - Hidden/i }).click();
  await expect(drawer.getByRole('button', { name: /News - Visible/i })).toBeVisible();

  // Close drawer: Radix marks background content aria-hidden while open,
  // so grid queries only work reliably once the dialog is dismissed
  await drawer.getByRole('button', { name: /close widget manager/i }).click();
  await expect(grid.getByText('News', { exact: true })).toBeVisible();
});

test('when all widgets are hidden the grid shows the empty state', async ({ page }) => {
  await page.getByRole('button', { name: 'Open widgets menu' }).click();
  const drawer = page.getByRole('dialog', { name: /manage widgets/i });

  // Hide the three default-visible widgets
  await drawer.getByRole('button', { name: /Alerts - Visible/i }).click();
  await drawer.getByRole('button', { name: /News - Visible/i }).click();
  await drawer.getByRole('button', { name: /LYNX Transit - Visible/i }).click();

  await expect(page.getByText('No widgets visible')).toBeVisible();
});

test('reset layout restores default widget visibility', async ({ page }) => {
  const grid = page.getByRole('main');

  // Hide News via drawer
  await page.getByRole('button', { name: 'Open widgets menu' }).click();
  const drawer = page.getByRole('dialog', { name: /manage widgets/i });
  await drawer.getByRole('button', { name: /News - Visible/i }).click();
  await drawer.getByRole('button', { name: /close widget manager/i }).click();

  await expect(grid.getByText('News', { exact: true })).not.toBeVisible();

  // Reset layout
  await page.getByRole('button', { name: /reset dashboard layout/i }).click();

  // News should be visible again
  await expect(grid.getByText('News', { exact: true })).toBeVisible();
});
