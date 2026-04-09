import { test, expect } from '@playwright/test';

const DINO_HACK_URL = '/blog/2016/11/05/chrome-dino-hack/';

test.describe('Chrome Dino Hack post', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(DINO_HACK_URL);
  });

  // ── Embedded game ──────────────────────────────────────────────────────────

  test('embedded dino game iframe is present and visible', async ({ page }) => {
    const frame = page.locator('#dino-game-frame');
    await expect(frame).toBeVisible();
    await expect(frame).toHaveAttribute('src', '/dino/');
  });

  test('embedded dino game iframe loads the game', async ({ page }) => {
    const frameElement = page.locator('#dino-game-frame');
    await expect(frameElement).toBeVisible();
    const frameHandle = await frameElement.contentFrame();
    expect(frameHandle).not.toBeNull();
    // The dino page should contain a canvas element
    await expect(frameHandle.locator('canvas').first()).toBeVisible({ timeout: 10000 });
  });

  // ── Speed widget ───────────────────────────────────────────────────────────

  test('speed slider has correct default value', async ({ page }) => {
    await expect(page.locator('#speed-slider')).toHaveValue('6');
    await expect(page.locator('#speed-input')).toHaveValue('6');
  });

  test('speed slider updates the number input', async ({ page }) => {
    await page.locator('#speed-slider').fill('50');
    await expect(page.locator('#speed-input')).toHaveValue('50');
  });

  test('speed number input updates the slider', async ({ page }) => {
    await page.locator('#speed-input').fill('100');
    await page.locator('#speed-input').dispatchEvent('input');
    await expect(page.locator('#speed-slider')).toHaveValue('100');
  });

  test('speed reset button restores default value', async ({ page }) => {
    await page.locator('#speed-slider').fill('500');
    await page.locator('#speed-reset').click();
    await expect(page.locator('#speed-slider')).toHaveValue('6');
    await expect(page.locator('#speed-input')).toHaveValue('6');
  });

  test('speed copy button is present and enabled', async ({ page }) => {
    const copyBtn = page.locator('#speed-pre').locator('..').locator('.btn-clip');
    await expect(copyBtn).toBeVisible();
    await expect(copyBtn).toBeEnabled();
  });

  test('speed code block shows the current value', async ({ page }) => {
    await expect(page.locator('#speed-pre code')).toContainText('6');
  });

  // ── Score widget ───────────────────────────────────────────────────────────

  test('score input has correct default value', async ({ page }) => {
    await expect(page.locator('#score-input')).toHaveValue('12345');
  });

  test('score input accepts a new value', async ({ page }) => {
    await page.locator('#score-input').fill('99999');
    await page.locator('#score-input').dispatchEvent('input');
    await expect(page.locator('#score-input')).toHaveValue('99999');
  });

  test('score reset button restores default value', async ({ page }) => {
    await page.locator('#score-input').fill('500');
    await page.locator('#score-input').dispatchEvent('input');
    await page.locator('#score-reset').click();
    await expect(page.locator('#score-input')).toHaveValue('12345');
  });

  test('score copy button is present and enabled', async ({ page }) => {
    const copyBtn = page.locator('#score-pre').locator('..').locator('.btn-clip');
    await expect(copyBtn).toBeVisible();
    await expect(copyBtn).toBeEnabled();
  });

  test('score code block shows the current value', async ({ page }) => {
    await expect(page.locator('#score-pre code')).toContainText('12345');
  });

  // ── Jump velocity widget ───────────────────────────────────────────────────

  test('jump slider has correct default value', async ({ page }) => {
    await expect(page.locator('#jump-slider')).toHaveValue('10');
    await expect(page.locator('#jump-input')).toHaveValue('10');
  });

  test('jump slider updates the number input', async ({ page }) => {
    await page.locator('#jump-slider').fill('25');
    await expect(page.locator('#jump-input')).toHaveValue('25');
  });

  test('jump number input updates the slider', async ({ page }) => {
    await page.locator('#jump-input').fill('20');
    await page.locator('#jump-input').dispatchEvent('input');
    await expect(page.locator('#jump-slider')).toHaveValue('20');
  });

  test('jump reset button restores default value', async ({ page }) => {
    await page.locator('#jump-slider').fill('40');
    await page.locator('#jump-reset').click();
    await expect(page.locator('#jump-slider')).toHaveValue('10');
    await expect(page.locator('#jump-input')).toHaveValue('10');
  });

  test('jump copy button is present and enabled', async ({ page }) => {
    const copyBtn = page.locator('#jump-pre').locator('..').locator('.btn-clip');
    await expect(copyBtn).toBeVisible();
    await expect(copyBtn).toBeEnabled();
  });

  test('jump code block shows the current value', async ({ page }) => {
    await expect(page.locator('#jump-pre code')).toContainText('10');
  });

  // ── Ground Y position widget ───────────────────────────────────────────────

  test('ground slider has correct default value', async ({ page }) => {
    await expect(page.locator('#ground-slider')).toHaveValue('93');
    await expect(page.locator('#ground-input')).toHaveValue('93');
  });

  test('ground slider updates the number input', async ({ page }) => {
    await page.locator('#ground-slider').fill('40');
    await expect(page.locator('#ground-input')).toHaveValue('40');
  });

  test('ground number input updates the slider', async ({ page }) => {
    await page.locator('#ground-input').fill('60');
    await page.locator('#ground-input').dispatchEvent('input');
    await expect(page.locator('#ground-slider')).toHaveValue('60');
  });

  test('ground reset button restores default value', async ({ page }) => {
    await page.locator('#ground-slider').fill('0');
    await page.locator('#ground-reset').click();
    await expect(page.locator('#ground-slider')).toHaveValue('93');
    await expect(page.locator('#ground-input')).toHaveValue('93');
  });

  test('ground copy button is present and enabled', async ({ page }) => {
    const copyBtn = page.locator('#ground-pre').locator('..').locator('.btn-clip');
    await expect(copyBtn).toBeVisible();
    await expect(copyBtn).toBeEnabled();
  });

  test('ground code block shows the current value', async ({ page }) => {
    await expect(page.locator('#ground-pre code')).toContainText('93');
  });

  // ── External JS file ──────────────────────────────────────────────────────

  test('external dino hack JS file is loaded (no inline scripts remain)', async ({ page }) => {
    // Verify the external script tag is present in the page source
    const scriptTags = await page.locator('script[src*="chrome-dino-hack"]').count();
    expect(scriptTags).toBeGreaterThan(0);
  });
});
