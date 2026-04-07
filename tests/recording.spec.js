import { test, expect } from '@playwright/test';

// Inject into the page before any script runs:
// replaces showDirectoryPicker with one that returns the OPFS root,
// patched with permission methods that always grant access.
const opfsMockScript = () => {
  window.showDirectoryPicker = async () => {
    const root = await navigator.storage.getDirectory();
    root.queryPermission    = async () => 'granted';
    root.requestPermission  = async () => 'granted';
    return root;
  };
};

// Shared helper: starts recording, waits 3 s, stops, and asserts badge state.
export async function runRecordingPipeline(page) {
  await page.click('#start-btn');
  await expect(page.locator('#status-badge')).toContainText('Recording');
  await page.waitForTimeout(3000);
  await page.click('#stop-btn');
  await expect(page.locator('#status-badge')).toHaveText('Idle');
}

// Shared helper: reads the OPFS root and asserts that a .webm file > 1 kB exists.
export async function verifyWebmFile(page) {
  const fileSize = await page.evaluate(async () => {
    const opfsRoot = await navigator.storage.getDirectory();
    for await (const [name, handle] of opfsRoot.entries()) {
      if (name.endsWith('.webm')) {
        const file = await handle.getFile();
        return file.size;
      }
    }
    return 0;
  });
  expect(fileSize).toBeGreaterThan(1000);
}

test('Full recording pipeline writes a WebM file to disk', async ({ page }) => {
  await page.addInitScript(opfsMockScript);
  await page.goto('/tools/captura/');

  await page.click('#pick-dir-btn');

  await runRecordingPipeline(page);
  await verifyWebmFile(page);
});
