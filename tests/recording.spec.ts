import { test } from '@playwright/test';
import { opfsMockScript, runRecordingPipeline, verifyWebmFile } from './captura-helpers.ts';
import { gotoAndWaitForReady } from './e2e/navigation.ts';

test('Full recording pipeline writes a WebM file to disk', async ({ page }) => {
  await page.addInitScript(opfsMockScript);
  await gotoAndWaitForReady(page, '/tools/captura/', page.locator('#pick-dir-btn'));

  await page.click('#pick-dir-btn');

  await runRecordingPipeline(page);
  await verifyWebmFile(page);
});
