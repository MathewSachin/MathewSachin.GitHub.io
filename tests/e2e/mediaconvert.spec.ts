import { test, expect } from '@playwright/test';

// Minimal fake audio buffer: audio/mpeg MIME with invalid content.
// mediabunny will fail to parse it, triggering a "Could not read file" error,
// but the component still renders the file-info and options sections.
const FAKE_AUDIO_BYTES = Buffer.from('not a real mp3 file');

// Minimal fake video buffer (video/mp4 MIME, invalid content).
const FAKE_VIDEO_BYTES = Buffer.from('not a real mp4 file');

test.describe('Media Converter tool', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/mediaconvert/');
  });

  test('page loads with correct title and drop zone', async ({ page }) => {
    await expect(page).toHaveTitle(/Video & Audio Converter/i);
    await expect(page.getByRole('button', { name: /click to browse/i })).toBeVisible();
  });

  test('convert button is not visible before a file is selected', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Convert/i })).not.toBeVisible();
  });

  test('shows error when a non-media file is uploaded', async ({ page }) => {
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByRole('button', { name: /click to browse/i }).click(),
    ]);
    await fileChooser.setFiles({
      name: 'test.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('hello world'),
    });

    await expect(page.locator('.alert-danger')).toBeVisible();
    await expect(page.locator('.alert-danger')).toContainText('video or audio');
  });

  test('uploading a media file shows the file info section', async ({ page }) => {
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByRole('button', { name: /click to browse/i }).click(),
    ]);
    await fileChooser.setFiles({
      name: 'sample.mp3',
      mimeType: 'audio/mpeg',
      buffer: FAKE_AUDIO_BYTES,
    });

    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('table')).toContainText('sample.mp3');
  });

  test('uploading a media file shows the convert button', async ({ page }) => {
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByRole('button', { name: /click to browse/i }).click(),
    ]);
    await fileChooser.setFiles({
      name: 'sample.mp3',
      mimeType: 'audio/mpeg',
      buffer: FAKE_AUDIO_BYTES,
    });

    await expect(page.getByRole('button', { name: /Convert/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Convert/i })).toBeEnabled();
  });

  test('uploading an invalid media file shows a status error', async ({ page }) => {
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByRole('button', { name: /click to browse/i }).click(),
    ]);
    await fileChooser.setFiles({
      name: 'sample.mp3',
      mimeType: 'audio/mpeg',
      buffer: FAKE_AUDIO_BYTES,
    });

    // mediabunny will fail to parse the fake file and show an error
    await expect(page.locator('.alert-danger')).toBeVisible({ timeout: 5000 });
  });

  test('output format dropdown contains expected format options', async ({ page }) => {
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByRole('button', { name: /click to browse/i }).click(),
    ]);
    await fileChooser.setFiles({
      name: 'sample.mp4',
      mimeType: 'video/mp4',
      buffer: FAKE_VIDEO_BYTES,
    });

    const select = page.locator('#output-format');
    await expect(select).toBeVisible();

    for (const label of ['MP4', 'WebM', 'MKV', 'MOV', 'MP3', 'WAV', 'OGG', 'FLAC']) {
      await expect(select.locator('option', { hasText: label })).toHaveCount(1);
    }
  });

  test('video-only options are not shown for audio MIME files', async ({ page }) => {
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByRole('button', { name: /click to browse/i }).click(),
    ]);
    await fileChooser.setFiles({
      name: 'sample.mp3',
      mimeType: 'audio/mpeg',
      buffer: FAKE_AUDIO_BYTES,
    });

    // hasVideo is false for this fake file, so video-specific checkboxes should be absent
    await expect(page.locator('#discard-video-check')).not.toBeVisible();
    await expect(page.locator('#resize-check')).not.toBeVisible();
  });

  test('"How It Works" section is present', async ({ page }) => {
    await expect(page.locator('text=How It Works')).toBeVisible();
    await expect(page.locator('text=Supported Output Formats')).toBeVisible();
    await expect(page.locator('text=Privacy')).toBeVisible();
  });

  test('file size is shown in the file info table', async ({ page }) => {
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByRole('button', { name: /click to browse/i }).click(),
    ]);
    await fileChooser.setFiles({
      name: 'sample.wav',
      mimeType: 'audio/wav',
      buffer: FAKE_AUDIO_BYTES,
    });

    await expect(page.locator('table')).toContainText('Size');
    await expect(page.locator('table')).toContainText('B');
  });
});
