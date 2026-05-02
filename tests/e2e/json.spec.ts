import { test, expect } from '@playwright/test';

test.describe('JSON Formatter tool', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/json/');
  });

  test('formats valid JSON and renders tree view', async ({ page }) => {
    await page.locator('#json-input').fill('{"a":1,"b":2}');
    await page.locator('#json-format-btn').click();
    // Verify the hidden textarea holds the formatted string
    const output = await page.locator('#json-output').inputValue();
    expect(output).toContain('  "a": 1');
    // Verify the tree view is rendered
    await expect(page.locator('.json-tree-container')).toBeVisible();
    await expect(page.locator('#json-ok')).toBeVisible();
    await expect(page.locator('#json-error')).toBeHidden();
  });

  test('tree view nodes can be collapsed and expanded', async ({ page }) => {
    await page.locator('#json-input').fill('{"nested":{"x":1}}');
    await page.locator('#json-format-btn').click();
    await expect(page.locator('.json-tree-container')).toBeVisible();
    // Click the toggle button to collapse the root object
    await page.locator('.json-tree-container .json-toggle').first().click();
    // After collapsing, the ellipsis summary should appear
    await expect(page.locator('.json-tree-container .json-ellipsis')).toBeVisible();
    // Click the ellipsis to expand again
    await page.locator('.json-tree-container .json-ellipsis').click();
    await expect(page.locator('.json-tree-container .json-ellipsis')).toBeHidden();
  });

  test('minifies JSON by removing whitespace', async ({ page }) => {
    await page.locator('#json-input').fill('{ "a" : 1 , "b" : 2 }');
    await page.locator('#json-minify-btn').click();
    const output = await page.locator('#json-output').inputValue();
    expect(output).toBe('{"a":1,"b":2}');
    await expect(page.locator('#json-ok')).toBeVisible();
  });

  test('shows error for invalid JSON', async ({ page }) => {
    await page.locator('#json-input').fill('{invalid json}');
    await page.locator('#json-format-btn').click();
    await expect(page.locator('#json-error')).toBeVisible();
    await expect(page.locator('#json-ok')).toBeHidden();
    const output = await page.locator('#json-output').inputValue();
    expect(output).toBe('');
  });

  test('clear button resets all fields and hides feedback', async ({ page }) => {
    await page.locator('#json-input').fill('{"a":1}');
    await page.locator('#json-format-btn').click();
    await page.locator('#json-clear-btn').click();
    await expect(page.locator('#json-input')).toHaveValue('');
    const output = await page.locator('#json-output').inputValue();
    expect(output).toBe('');
    await expect(page.locator('#json-ok')).toBeHidden();
    await expect(page.locator('#json-error')).toBeHidden();
  });
});
