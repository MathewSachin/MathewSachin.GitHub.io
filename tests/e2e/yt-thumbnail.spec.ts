import { test, expect } from '@playwright/test';

test.describe('YouTube Thumbnail Grabber tool', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/yt-thumbnail/');
  });

  test('shows error for empty input', async ({ page }) => {
    await page.locator('#grab-btn').click();
    await expect(page.locator('#yt-error')).toBeVisible();
    await expect(page.locator('#yt-result')).toHaveClass(/d-none/);
  });

  test('shows error for invalid input', async ({ page }) => {
    await page.locator('#yt-input').fill('not-a-url');
    await page.locator('#grab-btn').click();
    await expect(page.locator('#yt-error')).toBeVisible();
    await expect(page.locator('#yt-result')).toHaveClass(/d-none/);
  });

  test('extracts ID from watch URL and shows result', async ({ page }) => {
    await page.locator('#yt-input').fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    await page.locator('#grab-btn').click();
    await expect(page.locator('#yt-result')).not.toHaveClass(/d-none/);
    await expect(page.locator('#yt-preview')).toHaveAttribute(
      'src',
      'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg'
    );
  });

  test('extracts ID from youtu.be short URL', async ({ page }) => {
    await page.locator('#yt-input').fill('https://youtu.be/dQw4w9WgXcQ');
    await page.locator('#grab-btn').click();
    await expect(page.locator('#yt-result')).not.toHaveClass(/d-none/);
    await expect(page.locator('#yt-preview')).toHaveAttribute(
      'src',
      'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg'
    );
  });

  test('extracts ID from bare video ID', async ({ page }) => {
    await page.locator('#yt-input').fill('dQw4w9WgXcQ');
    await page.locator('#grab-btn').click();
    await expect(page.locator('#yt-result')).not.toHaveClass(/d-none/);
    await expect(page.locator('#yt-preview')).toHaveAttribute(
      'src',
      'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg'
    );
  });

  test('extracts ID from Shorts URL', async ({ page }) => {
    await page.locator('#yt-input').fill('https://www.youtube.com/shorts/dQw4w9WgXcQ');
    await page.locator('#grab-btn').click();
    await expect(page.locator('#yt-result')).not.toHaveClass(/d-none/);
    await expect(page.locator('#yt-preview')).toHaveAttribute(
      'src',
      'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg'
    );
  });

  test('changing resolution updates preview src', async ({ page }) => {
    await page.locator('#yt-input').fill('dQw4w9WgXcQ');
    await page.locator('#grab-btn').click();
    await page.locator('#yt-res-select').selectOption('hqdefault');
    await expect(page.locator('#yt-preview')).toHaveAttribute(
      'src',
      'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg'
    );
  });

  test('Enter key triggers grab', async ({ page }) => {
    await page.locator('#yt-input').fill('dQw4w9WgXcQ');
    await page.locator('#yt-input').press('Enter');
    await expect(page.locator('#yt-result')).not.toHaveClass(/d-none/);
  });

  test('download button has correct filename stored', async ({ page }) => {
    await page.locator('#yt-input').fill('dQw4w9WgXcQ');
    await page.locator('#grab-btn').click();
    await expect(page.locator('#yt-download-btn')).toHaveAttribute(
      'data-filename',
      'thumbnail-dQw4w9WgXcQ-maxresdefault.jpg'
    );
  });
});
