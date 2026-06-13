import { expect, type Locator, type Page } from '@playwright/test';

export async function gotoAndWaitForReady(page: Page, url: string, readyLocator: Locator) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');
  await expect(readyLocator).toBeVisible();
}
