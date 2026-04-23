import { test, expect } from '@playwright/test';

test.describe('JSON Formatter tool', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/json/');
  });

  test('formats valid JSON with indentation', async ({ page }) => {
    await page.locator('#json-input').fill('{"a":1,"b":2}');
    await page.locator('#json-format-btn').click();
    const output = await page.locator('#json-output').inputValue();
    expect(output).toContain('  "a": 1');
    await expect(page.locator('#json-ok')).toBeVisible();
    await expect(page.locator('#json-error')).toBeHidden();
  });

  test('minifies JSON by removing whitespace', async ({ page }) => {
    await page.locator('#json-input').fill('{ "a" : 1 , "b" : 2 }');
    await page.locator('#json-minify-btn').click();
    await expect(page.locator('#json-output')).toHaveValue('{"a":1,"b":2}');
    await expect(page.locator('#json-ok')).toBeVisible();
  });

  test('shows error for invalid JSON', async ({ page }) => {
    await page.locator('#json-input').fill('{invalid json}');
    await page.locator('#json-format-btn').click();
    await expect(page.locator('#json-error')).toBeVisible();
    await expect(page.locator('#json-ok')).toBeHidden();
    await expect(page.locator('#json-output')).toHaveValue('');
  });

  test('clear button resets all fields and hides feedback', async ({ page }) => {
    await page.locator('#json-input').fill('{"a":1}');
    await page.locator('#json-format-btn').click();
    await page.locator('#json-clear-btn').click();
    await expect(page.locator('#json-input')).toHaveValue('');
    await expect(page.locator('#json-output')).toHaveValue('');
    await expect(page.locator('#json-ok')).toBeHidden();
    await expect(page.locator('#json-error')).toBeHidden();
  });
});
