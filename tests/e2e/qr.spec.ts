import { test, expect } from '@playwright/test';
import { gotoAndWaitForReady } from './navigation.ts';

test.describe('QR Code Generator tool', () => {
  test.beforeEach(async ({ page }) => {
    await gotoAndWaitForReady(page, '/tools/qr/', page.locator('#qr-input'));
  });

  test('generates a QR code preview for URL input', async ({ page }) => {
    await page.locator('#qr-input').fill('https://example.com');
    await page.locator('#qr-generate-btn').click();
    await expect(page.locator('#qr-preview')).toBeVisible();
    await expect(page.locator('#qr-preview')).toHaveAttribute('src', /^data:image\/png;base64,/);
  });

  test('shows validation error for empty input', async ({ page }) => {
    await page.locator('#qr-input').fill('   ');
    await page.locator('#qr-generate-btn').click();
    await expect(page.locator('#qr-error')).toContainText('Please enter text or a URL.');
  });

  test('exposes downloadable PNG after generation', async ({ page }) => {
    await page.locator('#qr-input').fill('hello');
    await page.locator('#qr-generate-btn').click();
    await expect(page.locator('#qr-download-btn')).toBeVisible();
    await expect(page.locator('#qr-download-btn')).toHaveAttribute('href', /^data:image\/png;base64,/);
    await expect(page.locator('#qr-download-btn')).toHaveAttribute('download', /qr-hello\.png|qr-code\.png/);
  });
});
