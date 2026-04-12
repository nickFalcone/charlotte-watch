import { test, expect } from '@playwright/test';
import { mockApiRoutes, NEWS_WITH_URL_SAFETY_CASES } from './helpers/mock-routes';

test.beforeEach(async ({ page }) => {
  await mockApiRoutes(page, { news: NEWS_WITH_URL_SAFETY_CASES });
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('charlotte-onboarding-seen', 'true');
  });
  await page.goto('/');
  // Wait for loading to complete
  await expect(page.getByText('Loading news...')).not.toBeVisible({ timeout: 10_000 });
});

test('shows event count after data loads', async ({ page }) => {
  await expect(page.getByText('2 EVENTS')).toBeVisible();
});

test('clicking a news event opens the detail modal', async ({ page }) => {
  await page.getByRole('button', { name: /^Safe Link Event/ }).click();

  const dialog = page.getByRole('dialog', { name: 'Safe Link Event' });
  await expect(dialog).toBeVisible();
});

test('safe HTTPS source URL renders as a clickable link', async ({ page }) => {
  await page.getByRole('button', { name: /^Safe Link Event/ }).click();

  const dialog = page.getByRole('dialog', { name: 'Safe Link Event' });
  const link = dialog.getByRole('link', { name: 'Safe Article' });

  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute('href', 'https://example.com/safe-article');
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
});

test('unsafe javascript: URL does not render as a link', async ({ page }) => {
  await page.getByRole('button', { name: 'Unsafe Link Event' }).click();

  const dialog = page.getByRole('dialog', { name: 'Unsafe Link Event' });

  // Title text is present as plain text, not a link
  await expect(dialog.getByText('Unsafe Article')).toBeVisible();
  await expect(dialog.getByRole('link', { name: 'Unsafe Article' })).not.toBeVisible();
});

test('news detail modal closes with the Close button', async ({ page }) => {
  await page.getByRole('button', { name: /^Safe Link Event/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Safe Link Event' });
  await expect(dialog).toBeVisible();

  await dialog.getByRole('button', { name: 'Close' }).click();
  await expect(dialog).not.toBeVisible();
});

test('news detail modal closes with Escape', async ({ page }) => {
  await page.getByRole('button', { name: /^Safe Link Event/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Safe Link Event' });
  await expect(dialog).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
});
