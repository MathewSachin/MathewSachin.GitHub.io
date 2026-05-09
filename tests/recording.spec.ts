import { test } from '@playwright/test';
import { opfsMockScript, runRecordingPipeline, verifyWebmFile } from './captura-helpers.ts';

test('Full recording pipeline writes a WebM file to disk', async ({ page }) => {
  await page.addInitScript(opfsMockScript);
  await page.goto('/tools/captura/');

  await page.click('#pick-dir-btn');

  await runRecordingPipeline(page);
  await verifyWebmFile(page);
});
