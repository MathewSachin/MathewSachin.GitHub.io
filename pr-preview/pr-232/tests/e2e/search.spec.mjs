import { test, expect } from '@playwright/test';

test.describe('Search page', () => {
  test('search input becomes enabled once the index is loaded', async ({ page }) => {
    await page.goto('/search/');
    await expect(page.locator('#search-input')).toBeEnabled({ timeout: 15000 });
    // Loading status should disappear after the index is ready
    await expect(page.locator('#search-status')).not.toContainText('Loading', { timeout: 15000 });
  });

  test('shows results when a query matches blog posts', async ({ page }) => {
    await page.goto('/search/');
    const searchInput = page.locator('#search-input');
    await expect(searchInput).toBeEnabled({ timeout: 15000 });
    await searchInput.fill('jekyll');
    await expect(page.locator('#search-results')).not.toBeEmpty({ timeout: 5000 });
  });

  test('shows no results message for an unlikely query', async ({ page }) => {
    await page.goto('/search/');
    const searchInput = page.locator('#search-input');
    await expect(searchInput).toBeEnabled({ timeout: 15000 });
    await searchInput.fill('xyzzy_unlikely_query_that_matches_nothing');
    await expect(page.locator('#search-results')).toContainText('No posts matched', { timeout: 3000 });
  });
});
