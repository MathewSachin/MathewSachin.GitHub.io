import { test, expect } from '@playwright/test';

test.describe('Hash Generator tool', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/hash/');
  });

  test('auto-generates hashes on load using empty string', async ({ page }) => {
    // MD5 of empty string is well-known
    await expect(page.locator('#out-md5')).toHaveText('d41d8cd98f00b204e9800998ecf8427e');
  });

  test('generates correct MD5 hash for input text', async ({ page }) => {
    await page.locator('#hash-input').fill('hello');
    await page.locator('#hash-btn').click();
    await expect(page.locator('#out-md5')).toHaveText('5d41402abc4b2a76b9719d911017c592');
  });

  test('generates a valid SHA-256 hash for input text', async ({ page }) => {
    await page.locator('#hash-input').fill('hello');
    await page.locator('#hash-btn').click();
    // SHA-256 is async; wait for it to populate
    await expect(page.locator('#out-sha256')).not.toBeEmpty();
    const sha256 = await page.locator('#out-sha256').textContent();
    expect(sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  test('generates a valid SHA-1 hash for input text', async ({ page }) => {
    await page.locator('#hash-input').fill('hello');
    await page.locator('#hash-btn').click();
    await expect(page.locator('#out-sha1')).not.toBeEmpty();
    const sha1 = await page.locator('#out-sha1').textContent();
    expect(sha1).toMatch(/^[0-9a-f]{40}$/);
  });
});
