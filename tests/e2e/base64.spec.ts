import { test, expect } from '@playwright/test';

test.describe('Base64 tool', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/base64/');
  });

  test('encodes plain text to Base64', async ({ page }) => {
    await page.locator('#text-input').fill('hello');
    await page.locator('#encode-btn').click();
    await expect(page.locator('#b64-input')).toHaveValue('aGVsbG8=');
  });

  test('decodes Base64 to plain text', async ({ page }) => {
    await page.locator('#b64-input').fill('aGVsbG8=');
    await page.locator('#decode-btn').click();
    await expect(page.locator('#text-input')).toHaveValue('hello');
  });

  test('clear button empties both fields', async ({ page }) => {
    await page.locator('#text-input').fill('hello');
    await page.locator('#encode-btn').click();
    await page.locator('#clear-btn').click();
    await expect(page.locator('#text-input')).toHaveValue('');
    await expect(page.locator('#b64-input')).toHaveValue('');
  });

  test('shows error for invalid Base64 input', async ({ page }) => {
    await page.locator('#b64-input').fill('not!!valid!!base64');
    await page.locator('#decode-btn').click();
    await expect(page.locator('#b64-error')).toBeVisible();
    await expect(page.locator('#b64-error')).toContainText('Invalid');
  });

  test('encodes and round-trips Unicode text', async ({ page }) => {
    await page.locator('#text-input').fill('Hello 😀');
    await page.locator('#encode-btn').click();
    const b64 = await page.locator('#b64-input').inputValue();
    expect(b64.length).toBeGreaterThan(0);
    await page.locator('#text-input').clear();
    await page.locator('#decode-btn').click();
    await expect(page.locator('#text-input')).toHaveValue('Hello 😀');
  });
});
