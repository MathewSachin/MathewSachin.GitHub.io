import { test, expect } from '@playwright/test';
import { gotoAndWaitForReady } from './navigation.ts';

test.describe('Search page', () => {
  test('search input becomes enabled once the index is loaded', async ({ page }) => {
    await gotoAndWaitForReady(page, '/search/', page.locator('#search-input'));
    await expect(page.locator('#search-input')).toBeEnabled({ timeout: 15000 });
    // Loading status should disappear after the index is ready
    await expect(page.locator('#search-status')).not.toBeAttached({ timeout: 15000 });
  });

  test('shows results when a query matches blog posts', async ({ page }) => {
    await gotoAndWaitForReady(page, '/search/', page.locator('#search-input'));
    const searchInput = page.locator('#search-input');
    await expect(searchInput).toBeEnabled({ timeout: 15000 });
    await searchInput.fill('jekyll');
    await expect(page.locator('#search-results')).not.toBeEmpty({ timeout: 5000 });
  });

  test('shows no results message for an unlikely query', async ({ page }) => {
    await gotoAndWaitForReady(page, '/search/', page.locator('#search-input'));
    const searchInput = page.locator('#search-input');
    await expect(searchInput).toBeEnabled({ timeout: 15000 });
    await searchInput.fill('xyzzy_unlikely_query_that_matches_nothing');
    await expect(page.locator('#search-results')).toContainText('No results matched', { timeout: 3000 });
  });

  test('shows series pages in search results', async ({ page }) => {
    await gotoAndWaitForReady(page, '/search/', page.locator('#search-input'));
    const searchInput = page.locator('#search-input');
    await expect(searchInput).toBeEnabled({ timeout: 15000 });
    await searchInput.fill('Blogging with Jekyll');
    await expect(page.locator('#search-results a[href="/blog/series/blogging-with-jekyll/"]')).toBeVisible({ timeout: 5000 });
  });

  test('shows tag archive pages in search results', async ({ page }) => {
    await gotoAndWaitForReady(page, '/search/', page.locator('#search-input'));
    const searchInput = page.locator('#search-input');
    await expect(searchInput).toBeEnabled({ timeout: 15000 });
    await searchInput.fill('GitHub Pages');
    await expect(page.locator('#search-results a[href="/blog/tags/github-pages/"]')).toBeVisible({ timeout: 5000 });
  });
});
