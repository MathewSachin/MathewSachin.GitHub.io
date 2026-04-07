import { test, expect } from '@playwright/test';
import { runRecordingPipeline, verifyWebmFile } from './recording.spec.js';

// Inject the OPFS mock before each navigation (persists across reloads on the
// same page object because addInitScript runs on every navigation).
const opfsMockScript = () => {
  window.showDirectoryPicker = async () => {
    const root = await navigator.storage.getDirectory();
    root.queryPermission    = async () => 'granted';
    root.requestPermission  = async () => 'granted';
    return root;
  };
};

test('PWA loads and functions while strictly offline', async ({ page, context }) => {
  await page.addInitScript(opfsMockScript);
  await page.goto('/tools/captura/');

  // Wait for the service worker to fully activate and claim this page.
  const swState = await page.evaluate(() =>
    navigator.serviceWorker.ready.then(reg => reg.active?.state)
  );
  expect(swState).toBe('activated');

  // Cut the network and reload — the page must be served entirely from cache.
  await context.setOffline(true);
  await page.reload();

  // Confirm the page is functional (loaded from SW cache).
  await expect(page.locator('#start-btn')).toBeVisible();

  // Re-pick the folder (page was reloaded; OPFS mock is still active).
  await page.click('#pick-dir-btn');

  await runRecordingPipeline(page);
  await verifyWebmFile(page);
});
