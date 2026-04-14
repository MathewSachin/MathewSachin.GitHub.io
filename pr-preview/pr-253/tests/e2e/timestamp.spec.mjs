import { test, expect } from '@playwright/test';

test.describe('Timestamp tool', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/timestamp/');
  });

  test('converts epoch seconds to date/time strings', async ({ page }) => {
    await page.locator('#epoch-input').fill('1700000000');
    await page.locator('#epoch-convert-btn').click();
    await expect(page.locator('#epoch-result')).toBeVisible();
    const utcText = await page.locator('#epoch-utc').textContent();
    expect(utcText).toContain('2023');
    const isoText = await page.locator('#epoch-iso').textContent();
    expect(isoText).toMatch(/^2023-/);
  });

  test('converts epoch milliseconds to date/time strings', async ({ page }) => {
    await page.locator('#epoch-input').fill('1700000000000');
    await page.locator('#epoch-convert-btn').click();
    await expect(page.locator('#epoch-result')).toBeVisible();
    const isoText = await page.locator('#epoch-iso').textContent();
    expect(isoText).toMatch(/^2023-/);
  });

  test('converts datetime-local value to epoch', async ({ page }) => {
    // The input is pre-filled with the current time; just click Convert
    await page.locator('#dt-convert-btn').click();
    await expect(page.locator('#dt-result')).toBeVisible();
    const seconds = await page.locator('#dt-seconds').textContent();
    expect(parseInt(seconds, 10)).toBeGreaterThan(0);
    const millis = await page.locator('#dt-millis').textContent();
    expect(parseInt(millis, 10)).toBeGreaterThan(0);
  });

  test('shows live clock with current time', async ({ page }) => {
    const seconds = await page.locator('#now-seconds').textContent();
    expect(parseInt(seconds, 10)).toBeGreaterThan(1_700_000_000);
    const utc = await page.locator('#now-utc').textContent();
    expect(utc.length).toBeGreaterThan(0);
  });
});
