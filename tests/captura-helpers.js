import { expect } from '@playwright/test';

// Inject before any page script runs: overrides showDirectoryPicker to return
// the OPFS root, augmented with permission stubs that always grant access.
export const opfsMockScript = () => {
  window.showDirectoryPicker = async () => {
    const root = await navigator.storage.getDirectory();
    root.queryPermission    = async () => 'granted';
    root.requestPermission  = async () => 'granted';
    return root;
  };
};

// Starts recording, waits 3 s, stops, and asserts badge state.
// With fake media devices the screen-share track stays alive after stopping,
// so the machine settles in SESSION ('◉ Session Active') rather than IDLE.
export async function runRecordingPipeline(page) {
  await page.click('#start-btn');
  await expect(page.locator('#status-badge')).toContainText('Recording');
  await page.waitForTimeout(3000);
  await page.click('#stop-btn');
  await expect(page.locator('#status-badge')).toHaveText('◉ Session Active');
}

// Reads the OPFS root and asserts that a .webm file > 1 kB exists.
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
