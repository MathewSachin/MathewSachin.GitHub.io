import { test, expect } from '@playwright/test';
import {
  opfsMockScript,
  runRecordingPipeline,
  verifyWebmFile,
  verifyFileByExtension,
  countFilesWithExtension,
} from './captura-helpers.js';

test.describe('Captura Web Recorder', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(opfsMockScript);
    await page.goto('/tools/captura/', { waitUntil: 'networkidle' });
  });

  // ── Initial state ────────────────────────────────────────────────────────────

  test('initial UI is in idle state', async ({ page }) => {
    await expect(page.locator('#status-badge')).toHaveText('Idle');
    await expect(page.locator('#start-btn')).toBeVisible();
    await expect(page.locator('#start-btn')).toBeEnabled();
    await expect(page.locator('#pause-btn')).toBeHidden();
    await expect(page.locator('#stop-btn')).toBeHidden();
    await expect(page.locator('#end-session-btn')).toBeHidden();
    await expect(page.locator('#timer-text')).toHaveText('00:00');
    await expect(page.locator('#dir-name')).toHaveText('(no folder selected)');
  });

  // ── Folder picker ────────────────────────────────────────────────────────────

  test('pick folder button updates directory display', async ({ page }) => {
    await expect(page.locator('#dir-name')).toHaveText('(no folder selected)');
    await page.click('#pick-dir-btn');
    // StorageManager.#updateDirUI sets the text to dirHandle.name; the OPFS
    // root handle name is '' (empty string), so the placeholder disappears.
    await expect(page.locator('#dir-name')).not.toHaveText('(no folder selected)');
  });

  // ── Button visibility during recording ───────────────────────────────────────

  test('correct buttons are shown and hidden during recording', async ({ page }) => {
    await page.click('#pick-dir-btn');
    await page.click('#start-btn');

    await expect(page.locator('#status-badge')).toContainText('Recording');
    // Pause and Stop visible; Start hidden; End Session visible
    await expect(page.locator('#pause-btn')).toBeVisible();
    await expect(page.locator('#stop-btn')).toBeVisible();
    await expect(page.locator('#start-btn')).toBeHidden();
    await expect(page.locator('#end-session-btn')).toBeVisible();

    await page.click('#stop-btn');
    await expect(page.locator('#status-badge')).toHaveText('◉ Session Active');
    // After stop: Start visible again; Pause/Stop hidden; End Session still visible
    await expect(page.locator('#start-btn')).toBeVisible();
    await expect(page.locator('#pause-btn')).toBeHidden();
    await expect(page.locator('#stop-btn')).toBeHidden();
    await expect(page.locator('#end-session-btn')).toBeVisible();
  });

  // ── Timer ────────────────────────────────────────────────────────────────────

  test('timer increments during recording and resets on stop', async ({ page }) => {
    await page.click('#pick-dir-btn');
    await page.click('#start-btn');
    await expect(page.locator('#status-badge')).toContainText('Recording');

    // Wait long enough for the 1-second interval to fire at least twice
    await page.waitForTimeout(2500);
    const timerText = await page.locator('#timer-text').textContent();
    expect(timerText).not.toBe('00:00');

    await page.click('#stop-btn');
    await expect(page.locator('#status-badge')).toHaveText('◉ Session Active');
    await expect(page.locator('#timer-text')).toHaveText('00:00');
  });

  test('timer pauses when recording is paused and resumes afterwards', async ({ page }) => {
    await page.click('#pick-dir-btn');
    await page.click('#start-btn');
    await expect(page.locator('#status-badge')).toContainText('Recording');
    await page.waitForTimeout(1500);

    await page.click('#pause-btn');
    await expect(page.locator('#status-badge')).toHaveText('⏸ Paused');
    const timerAtPause = await page.locator('#timer-text').textContent();

    // Timer must not advance while paused
    await page.waitForTimeout(1500);
    await expect(page.locator('#timer-text')).toHaveText(timerAtPause);

    // Resume — timer advances again
    await page.click('#pause-btn');
    await expect(page.locator('#status-badge')).toContainText('Recording');
    await page.waitForTimeout(1500);
    const timerAfterResume = await page.locator('#timer-text').textContent();
    expect(timerAfterResume).not.toBe(timerAtPause);

    await page.click('#stop-btn');
    await expect(page.locator('#timer-text')).toHaveText('00:00');
  });

  // ── Pause / Resume ────────────────────────────────────────────────────────────

  test('pause and resume cycle updates badge and button label', async ({ page }) => {
    await page.click('#pick-dir-btn');
    await page.click('#start-btn');
    await expect(page.locator('#status-badge')).toContainText('Recording');
    await page.waitForTimeout(1000);

    // Pause
    await page.click('#pause-btn');
    await expect(page.locator('#status-badge')).toHaveText('⏸ Paused');
    await expect(page.locator('#pause-btn')).toContainText('Resume');
    await expect(page.locator('#stop-btn')).toBeVisible();

    // Resume
    await page.click('#pause-btn');
    await expect(page.locator('#status-badge')).toContainText('Recording');
    await expect(page.locator('#pause-btn')).toContainText('Pause');

    await page.waitForTimeout(1000);
    await page.click('#stop-btn');
    await expect(page.locator('#status-badge')).toHaveText('◉ Session Active');
  });

  test('stop from paused state writes a WebM file to disk', async ({ page }) => {
    await page.click('#pick-dir-btn');
    await page.click('#start-btn');
    await expect(page.locator('#status-badge')).toContainText('Recording');
    await page.waitForTimeout(2000);

    await page.click('#pause-btn');
    await expect(page.locator('#status-badge')).toHaveText('⏸ Paused');

    await page.click('#stop-btn');
    await expect(page.locator('#status-badge')).toHaveText('◉ Session Active');

    await verifyWebmFile(page);
  });

  // ── End Session ───────────────────────────────────────────────────────────────

  test('end session from session state returns to idle', async ({ page }) => {
    await page.click('#pick-dir-btn');
    await runRecordingPipeline(page);

    // Currently in SESSION state
    await expect(page.locator('#end-session-btn')).toBeVisible();
    await page.click('#end-session-btn');

    await expect(page.locator('#status-badge')).toHaveText('Idle');
    await expect(page.locator('#end-session-btn')).toBeHidden();
    await expect(page.locator('#start-btn')).toBeVisible();
  });

  // ── Multiple recordings ───────────────────────────────────────────────────────

  test('two recordings in one session produce two separate WebM files', async ({ page }) => {
    test.setTimeout(20000);
    await page.click('#pick-dir-btn');

    // First recording
    await runRecordingPipeline(page);
    await expect(page.locator('#status-badge')).toHaveText('◉ Session Active');

    // Second recording — still in session, folder already set
    await page.click('#start-btn');
    await expect(page.locator('#status-badge')).toContainText('Recording');
    await page.waitForTimeout(3000);
    await page.click('#stop-btn');
    await expect(page.locator('#status-badge')).toHaveText('◉ Session Active');

    const fileCount = await countFilesWithExtension(page, '.webm');
    expect(fileCount).toBe(2);
  });

  // ── Audio gain sliders ────────────────────────────────────────────────────────

  test('mic gain slider updates its label', async ({ page }) => {
    await page.evaluate(() => {
      const slider = document.getElementById('mic-gain-slider');
      slider.value = '0.5';
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await expect(page.locator('#mic-gain-label')).toHaveText('50%');
  });

  test('system gain slider updates its label', async ({ page }) => {
    await page.evaluate(() => {
      const slider = document.getElementById('sys-gain-slider');
      slider.value = '1.5';
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await expect(page.locator('#sys-gain-label')).toHaveText('150%');
  });

  // ── Preferences persistence ──────────────────────────────────────────────────
  // Each pref test uses a two-step selectOption to guarantee the change event
  // always fires regardless of the element's prior value (which can persist
  // across test runs when multiple spec files share the same origin).

  async function expectLocalStorage(page, key, value) {
    await expect.poll(async () => {
      return await page.evaluate((k) => localStorage.getItem(k), key);
    }, {
      timeout: 10_000
    }).toBe(value);
  }

  test('FPS preference is persisted to localStorage on change', async ({ page }) => {
    // Step to default first so the second step always triggers a change event.
    await page.selectOption('#fps-select', '30');
    await page.selectOption('#fps-select', '15');
    await expectLocalStorage(page, 'captura-fps', '15');
  });

  test('quality preference is persisted to localStorage on change', async ({ page }) => {
    await page.selectOption('#quality-select', '720');
    await page.selectOption('#quality-select', '1080');

    await expectLocalStorage(page, 'captura-quality', '1080');
  });

  test('format preference is persisted to localStorage on change', async ({ page }) => {
    await page.selectOption('#format-select', 'webm-vp9-opus');
    await page.selectOption('#format-select', 'mp4-h264-aac');

    await expectLocalStorage(page, 'captura-format', 'mp4-h264-aac');
  });

  test('system audio preference is persisted to localStorage on change', async ({ page }) => {
    const checkbox = page.locator('#sys-audio-chk');
    const initialChecked = await checkbox.isChecked();
    await checkbox.click();
    const expectedValue = String(!initialChecked);

    await expectLocalStorage(page, 'captura-sysAudio', expectedValue);
  });

  test('preferences are restored after page reload', async ({ page }) => {
    // Write preferences directly to localStorage so the test is not sensitive
    // to whether a change event fires (e.g. when the element already holds the
    // same value as the first step of a two-step selectOption sequence).
    await page.evaluate(() => {
      localStorage.setItem('captura-fps', '60');
      localStorage.setItem('captura-quality', '480');
      localStorage.setItem('captura-format', 'mp4-h264-aac');
    });

    await page.reload();

    await expect(page.locator('#fps-select')).toHaveValue('60');
    await expect(page.locator('#quality-select')).toHaveValue('480');
    await expect(page.locator('#format-select')).toHaveValue('mp4-h264-aac');
  });

  // ── Control lock ──────────────────────────────────────────────────────────────

  test('recording controls are disabled while recording is active', async ({ page }) => {
    await page.click('#pick-dir-btn');
    await page.click('#start-btn');
    await expect(page.locator('#status-badge')).toContainText('Recording');

    await expect(page.locator('#fps-select')).toBeDisabled();
    await expect(page.locator('#quality-select')).toBeDisabled();
    await expect(page.locator('#sys-audio-chk')).toBeDisabled();
    await expect(page.locator('#pick-dir-btn')).toBeDisabled();
    await expect(page.locator('#webcam-select')).toBeEnabled();
    await expect(page.locator('#mic-select')).toBeDisabled();

    await page.click('#stop-btn');
    await expect(page.locator('#status-badge')).toHaveText('◉ Session Active');

    // Controls re-enabled after recording stops
    await expect(page.locator('#fps-select')).toBeEnabled();
    await expect(page.locator('#quality-select')).toBeEnabled();
  });

  // ── MP4 format ───────────────────────────────────────────────────────────────

  test('MP4 format recording produces an mp4 file on disk', async ({ page }) => {
    await page.selectOption('#format-select', 'mp4-h264-aac');
    await page.click('#pick-dir-btn');
    await page.click('#start-btn');
    await expect(page.locator('#status-badge')).toContainText('Recording');
    await page.waitForTimeout(3000);
    await page.click('#stop-btn');
    await expect(page.locator('#status-badge')).toHaveText('◉ Session Active');

    await verifyFileByExtension(page, '.mp4');
  });
});
