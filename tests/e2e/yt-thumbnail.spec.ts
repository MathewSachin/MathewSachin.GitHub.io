import { test, expect, type Page } from '@playwright/test';
import { gotoAndWaitForReady } from './navigation.ts';

async function clickGrabUntilHandled(page: Page) {
  const error = page.locator('#yt-error');
  const result = page.locator('#yt-result');
  const isHandled = async () => {
    const hasError = await error.isVisible();
    const className = await result.getAttribute('class');
    const hasResult = !(className?.includes('d-none'));
    return hasError || hasResult;
  };

  for (let attempt = 0; attempt < 3; attempt++) {
    await page.locator('#grab-btn').click();
    try {
      await expect.poll(isHandled, { timeout: 1000 }).toBe(true);
      break;
    } catch {
      if (attempt === 2) throw new Error('Grab action was not handled');
    }
  }
}

test.describe('YouTube Thumbnail Grabber tool', () => {
  test.beforeEach(async ({ page }) => {
    await gotoAndWaitForReady(page, '/tools/yt-thumbnail/', page.locator('#yt-input'));
  });

  test('shows error for empty input', async ({ page }) => {
    await clickGrabUntilHandled(page);
    await expect(page.locator('#yt-error')).toBeVisible();
    await expect(page.locator('#yt-result')).toHaveClass(/d-none/);
  });

  test('shows error for invalid input', async ({ page }) => {
    await page.locator('#yt-input').fill('not-a-url');
    await clickGrabUntilHandled(page);
    await expect(page.locator('#yt-error')).toBeVisible();
    await expect(page.locator('#yt-result')).toHaveClass(/d-none/);
  });

  test('extracts ID from watch URL and shows result', async ({ page }) => {
    await page.locator('#yt-input').fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    await clickGrabUntilHandled(page);
    await expect(page.locator('#yt-result')).not.toHaveClass(/d-none/);
    await expect(page.locator('#yt-preview')).toHaveAttribute(
      'src',
      'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg'
    );
  });

  test('extracts ID from youtu.be short URL', async ({ page }) => {
    await page.locator('#yt-input').fill('https://youtu.be/dQw4w9WgXcQ');
    await clickGrabUntilHandled(page);
    await expect(page.locator('#yt-result')).not.toHaveClass(/d-none/);
    await expect(page.locator('#yt-preview')).toHaveAttribute(
      'src',
      'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg'
    );
  });

  test('extracts ID from bare video ID', async ({ page }) => {
    await page.locator('#yt-input').fill('dQw4w9WgXcQ');
    await clickGrabUntilHandled(page);
    await expect(page.locator('#yt-result')).not.toHaveClass(/d-none/);
    await expect(page.locator('#yt-preview')).toHaveAttribute(
      'src',
      'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg'
    );
  });

  test('extracts ID from Shorts URL', async ({ page }) => {
    await page.locator('#yt-input').fill('https://www.youtube.com/shorts/dQw4w9WgXcQ');
    await clickGrabUntilHandled(page);
    await expect(page.locator('#yt-result')).not.toHaveClass(/d-none/);
    await expect(page.locator('#yt-preview')).toHaveAttribute(
      'src',
      'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg'
    );
  });

  test('changing resolution updates preview src', async ({ page }) => {
    await page.locator('#yt-input').fill('dQw4w9WgXcQ');
    await clickGrabUntilHandled(page);
    await page.locator('#yt-res-select').selectOption('hqdefault');
    await expect(page.locator('#yt-preview')).toHaveAttribute(
      'src',
      'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg'
    );
  });

  test('Enter key triggers grab', async ({ page }) => {
    const input = page.locator('#yt-input');
    await input.fill('dQw4w9WgXcQ');
    await input.focus();
    const result = page.locator('#yt-result');
    for (let attempt = 0; attempt < 3; attempt++) {
      await input.press('Enter');
      try {
        await expect.poll(async () => {
          const className = await result.getAttribute('class');
          return !(className?.includes('d-none'));
        }, { timeout: 1000 }).toBe(true);
        break;
      } catch {
        if (attempt === 2) throw new Error('Enter key did not trigger thumbnail generation');
      }
    }
  });

  test('download button has correct filename stored', async ({ page }) => {
    await page.locator('#yt-input').fill('dQw4w9WgXcQ');
    await clickGrabUntilHandled(page);
    await expect(page.locator('#yt-download-btn')).toHaveAttribute(
      'data-filename',
      'thumbnail-dQw4w9WgXcQ-maxresdefault.jpg'
    );
  });
});
