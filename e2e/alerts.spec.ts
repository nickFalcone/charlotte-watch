import { test, expect } from '@playwright/test';
import { mockApiRoutes, ONE_NWS_HEAT_ADVISORY } from './helpers/mock-routes';

test.describe('AlertsWidget — empty state', () => {
  test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page); // all sources return empty
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem('charlotte-onboarding-seen', 'true');
    });
    await page.goto('/');
  });

  test('shows zero-alert count when all sources are empty', async ({ page }) => {
    // Wait for loading to finish (loading text disappears)
    await expect(page.getByText('Checking alerts...')).not.toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('0 ALERTS')).toBeVisible();
  });
});

test.describe('AlertsWidget — with alerts', () => {
  test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page, {
      nwsAlerts: ONE_NWS_HEAT_ADVISORY,
      alertSummary: {
        summary: 'Heat advisory in effect for Mecklenburg County.',
        hash: 'abc123',
        generatedAt: '2026-04-12T12:00:00Z',
      },
    });
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem('charlotte-onboarding-seen', 'true');
    });
    await page.goto('/');
    // Wait for loading to complete before each test
    await expect(page.getByText('Checking alerts...')).not.toBeVisible({ timeout: 10_000 });
  });

  test('shows alert count after data loads', async ({ page }) => {
    await expect(page.getByText('1 ALERTS')).toBeVisible();
  });

  test('alert card shows title and severity badge', async ({ page }) => {
    // The AlertCard has aria-label="Moderate: Heat Advisory"
    const alertCard = page.getByRole('button', { name: /moderate: heat advisory/i });
    await expect(alertCard).toBeVisible();
    await expect(alertCard.getByText('Heat Advisory', { exact: true })).toBeVisible();
    await expect(alertCard.getByText('Moderate', { exact: true })).toBeVisible();
  });

  test('clicking an alert card opens the detail modal', async ({ page }) => {
    await page.getByRole('button', { name: /moderate: heat advisory/i }).click();

    const dialog = page.getByRole('dialog', { name: 'Heat Advisory' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Heat Advisory' })).toBeVisible();
  });

  test('detail modal shows alert metadata', async ({ page }) => {
    await page.getByRole('button', { name: /moderate: heat advisory/i }).click();

    const dialog = page.getByRole('dialog', { name: 'Heat Advisory' });
    await expect(dialog.getByText('NWS - weather')).toBeVisible();
    await expect(dialog.getByText('Mecklenburg', { exact: true })).toBeVisible();
    await expect(
      dialog.getByText('Drink plenty of fluids and stay in air-conditioned spaces.')
    ).toBeVisible();
  });

  test('detail modal closes when the Close button is clicked', async ({ page }) => {
    await page.getByRole('button', { name: /moderate: heat advisory/i }).click();
    const dialog = page.getByRole('dialog', { name: 'Heat Advisory' });
    await expect(dialog).toBeVisible();

    await dialog.getByRole('button', { name: 'Close' }).click();
    await expect(dialog).not.toBeVisible();
  });

  test('detail modal closes when Escape is pressed', async ({ page }) => {
    await page.getByRole('button', { name: /moderate: heat advisory/i }).click();
    const dialog = page.getByRole('dialog', { name: 'Heat Advisory' });
    await expect(dialog).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
  });

  test('switches to the Map tab', async ({ page }) => {
    await page.getByRole('tab', { name: 'Map' }).click();
    // The map tab is forceMount, so the container is always present;
    // verify the tab is now selected
    await expect(page.getByRole('tab', { name: 'Map' })).toHaveAttribute('aria-selected', 'true');
  });
});
