import { test, expect } from '@playwright/test';

test.describe('Scratchpad tool', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/scratchpad/');
    // Clear any saved state from previous tests
    await page.evaluate(() => localStorage.removeItem('scratchpad-v1'));
    await page.reload();
  });

  test('updates word and character count on input', async ({ page }) => {
    await page.locator('#scratchpad').fill('hello world');
    await expect(page.locator('#word-count')).toContainText('2 words');
    await expect(page.locator('#word-count')).toContainText('11 chars');
  });

  test('shows saved indicator after typing', async ({ page }) => {
    await page.locator('#scratchpad').fill('some text');
    await expect(page.locator('#save-status')).toContainText('Saved');
  });

  test('persists content in localStorage', async ({ page }) => {
    await page.locator('#scratchpad').fill('remember me');
    await expect(page.locator('#save-status')).toContainText('Saved');
    await page.reload();
    await expect(page.locator('#scratchpad')).toHaveValue('remember me');
  });

  test('clear button empties the textarea after confirmation', async ({ page }) => {
    await page.locator('#scratchpad').fill('hello');
    page.once('dialog', dialog => dialog.accept());
    await page.locator('#clear-btn').click();
    await expect(page.locator('#scratchpad')).toHaveValue('');
    await expect(page.locator('#word-count')).toContainText('0 words');
  });

  test('shows singular word when count is 1', async ({ page }) => {
    await page.locator('#scratchpad').fill('one');
    await expect(page.locator('#word-count')).toContainText('1 word');
    await expect(page.locator('#word-count')).toContainText('3 chars');
  });
});
