import { test, expect } from '@playwright/test';
import { gotoAndWaitForReady } from './navigation.ts';

test.describe('Timestamp tool', () => {
  test.beforeEach(async ({ page }) => {
    await gotoAndWaitForReady(page, '/tools/timestamp/', page.locator('#now-seconds'));
    const nowSeconds = page.locator('#now-seconds');
    const initialNowSeconds = await nowSeconds.textContent();
    await expect
      .poll(async () => await nowSeconds.textContent(), { timeout: 7000 })
      .not.toBe(initialNowSeconds);
  });

  test('converts epoch seconds to date/time strings', async ({ page }) => {
    await page.locator('#epoch-input').fill('1700000000');
    await expect(page.locator('#epoch-result')).toBeVisible();
    await expect(page.locator('#epoch-utc')).toContainText('2023');
    await expect(page.locator('#epoch-iso')).toHaveText(/^2023-/);
  });

  test('converts epoch milliseconds to date/time strings', async ({ page }) => {
    await page.locator('#epoch-input').fill('1700000000000');
    await expect(page.locator('#epoch-result')).toBeVisible();
    await expect(page.locator('#epoch-iso')).toHaveText(/^2023-/);
  });

  test('converts datetime-local value to epoch', async ({ page }) => {
    // The input is pre-filled with the current time
    await expect(page.locator('#dt-result')).toBeVisible();
    const seconds = (await page.locator('#dt-seconds').textContent()) ?? '0';
    expect(parseInt(seconds, 10)).toBeGreaterThan(0);
    const millis = (await page.locator('#dt-millis').textContent()) ?? '0';
    expect(parseInt(millis, 10)).toBeGreaterThan(0);
  });

  test('shows live clock with current time', async ({ page }) => {
    const seconds = (await page.locator('#now-seconds').textContent()) ?? '0';
    expect(parseInt(seconds, 10)).toBeGreaterThan(1_700_000_000);
    const utc = (await page.locator('#now-utc').textContent()) ?? '';
    expect(utc.length).toBeGreaterThan(0);
  });
});
