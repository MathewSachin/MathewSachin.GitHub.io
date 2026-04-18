import { test, expect } from '@playwright/test';

const DINO_HACK_URL = '/blog/2016/11/05/chrome-dino-hack.html';

test.describe('Chrome Dino Hack post', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(DINO_HACK_URL);
  });

  // ── Embedded game ──────────────────────────────────────────────────────────

  test('embedded dino game iframe is present and visible', async ({ page }) => {
    const frame = page.locator('#dino-game-frame');
    await expect(frame).toBeVisible();
    await expect(frame).toHaveAttribute('src', '/dino/index.html');
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
  test('speed reset button restores default value', async ({ page }) => {
    await page.locator('#speed-input').fill('500');
    await page.locator('#speed-reset').click();
    await expect(page.locator('#speed-input')).toHaveValue('6');
  });

  test('speed copy button copies correctly', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await page.locator('#speed-input').fill('50');
    await page.locator('#btn-speed-clip').click();

    // Verify the clipboard contains the expected code snippet
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toBe('(Runner.instance_ || Runner.getInstance()).setSpeed(50)');
  });

  // ── Score widget ───────────────────────────────────────────────────────────

  test('score input has correct default value', async ({ page }) => {
    await expect(page.locator('#score-input')).toHaveValue('12345');
  });

  test('score reset button restores default value', async ({ page }) => {
    await page.locator('#score-input').fill('500');
    await page.locator('#score-input').dispatchEvent('input');
    await page.locator('#score-reset').click();
    await expect(page.locator('#score-input')).toHaveValue('12345');
  });

  test('score copy button copies correctly', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await page.locator('#score-input').fill('356');
    await page.locator('#btn-score-clip').click();

    // Verify the clipboard contains the expected code snippet
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toBe('(Runner.instance_ || Runner.getInstance()).distanceRan = 356 / 0.025');
  });

  // ── Jump velocity widget ───────────────────────────────────────────────────

  test('jump reset button restores default value', async ({ page }) => {
    await page.locator('#jump-input').fill('40');
    await page.locator('#jump-reset').click();
    await expect(page.locator('#jump-input')).toHaveValue('10');
  });

  test('jump copy button copies correctly', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await page.locator('#jump-input').fill('25');
    await page.locator('#btn-jump-clip').click();

    // Verify the clipboard contains the expected code snippet
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toBe('(Runner.instance_ || Runner.getInstance()).tRex.setJumpVelocity(25)');
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
    const copyBtn = page.locator('[data-clipboard-target="#ground-pre"]');
    await expect(copyBtn).toBeVisible();
    await expect(copyBtn).toBeEnabled();
  });

  test('ground code block shows the current value', async ({ page }) => {
    await expect(page.locator('#ground-pre code')).toContainText('93');
  });
});
