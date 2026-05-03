import { test, expect } from '@playwright/test';

test.describe('Local AI tool', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/localai/');
  });

  test('page loads with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/Local AI/i);
  });

  test('shows WebGPU info notice on load', async ({ page }) => {
    await expect(page.locator('.alert-info')).toBeVisible();
    await expect(page.locator('.alert-info')).toContainText('WebGPU');
  });

  test('shows model cache directory section', async ({ page }) => {
    await expect(page.locator('text=Model Cache Directory')).toBeVisible();
  });

  test('"Pick Folder" button is visible before model is loaded', async ({ page }) => {
    await expect(page.locator('#pick-dir-btn')).toBeVisible();
  });

  test('"Load Model" button is visible before model is loaded', async ({ page }) => {
    await expect(page.locator('#load-btn')).toBeVisible();
  });

  test('prompt textarea and generate button are not shown before model is loaded', async ({ page }) => {
    await expect(page.locator('#prompt-input')).not.toBeVisible();
    await expect(page.locator('#generate-btn')).not.toBeVisible();
  });

  test('clicking "Load Model" shows the loading progress UI', async ({ page }) => {
    // Intercept the model fetch so we don't actually download 2 GB of weights
    await page.route('https://huggingface.co/**', route => route.abort());

    await page.locator('#load-btn').click();

    // The loading phase should appear (progress bar container)
    await expect(page.locator('.progress')).toBeVisible({ timeout: 5000 });
  });

  test('"Pick Folder" button is disabled while loading', async ({ page }) => {
    await page.route('https://huggingface.co/**', route => route.abort());
    await page.locator('#load-btn').click();
    await expect(page.locator('.progress')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#pick-dir-btn')).not.toBeVisible();
  });
});
