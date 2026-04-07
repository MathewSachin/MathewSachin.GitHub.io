import { test, expect } from '@playwright/test';

// Fake ES module returned in place of the real @huggingface/transformers CDN bundle.
// This avoids any network download of multi-hundred-MB model weights while still
// exercising every code path in llm.js.
const MOCK_TRANSFORMERS = `
export const env = { allowLocalModels: false };

export class TextStreamer {
  constructor(tokenizer, opts) {
    this.callback_function = opts.callback_function || null;
  }
}

export async function pipeline(task, modelId, opts) {
  if (opts && opts.progress_callback) {
    opts.progress_callback({ status: 'initiate', file: 'model.onnx' });
    opts.progress_callback({ status: 'progress', file: 'model.onnx', progress: 50, name: 'model.onnx' });
    opts.progress_callback({ status: 'done',     file: 'model.onnx' });
    opts.progress_callback({ status: 'ready' });
  }
  async function gen(input, genOpts) {
    if (genOpts && genOpts.streamer && genOpts.streamer.callback_function) {
      genOpts.streamer.callback_function('Hello ');
      genOpts.streamer.callback_function('world!');
    }
  }
  gen.tokenizer = {};
  return gen;
}
`;

test.describe('Local LLM Chat tool', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept both the modulepreload hint and the actual import request.
    await page.route('**/transformers.min.js', route =>
      route.fulfill({ contentType: 'application/javascript; charset=utf-8', body: MOCK_TRANSFORMERS })
    );
    await page.goto('/tools/llm/');
  });

  test('page loads without JavaScript errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    // Re-navigate so the listener is active during initial load.
    await page.goto('/tools/llm/');
    await page.waitForLoadState('networkidle');
    expect(errors.filter(m => /SyntaxError/i.test(m))).toHaveLength(0);
  });

  test('initial state: load button visible, chat section hidden', async ({ page }) => {
    await expect(page.locator('#load-btn')).toBeVisible();
    await expect(page.locator('#chat-section')).toBeHidden();
    await expect(page.locator('#load-progress')).toBeHidden();
    await expect(page.locator('#status-msg')).toBeHidden();
  });

  test('clicking Load Model shows progress then reveals chat section', async ({ page }) => {
    await page.locator('#load-btn').click();
    // Progress bar should appear briefly then hide once the mock pipeline resolves.
    await expect(page.locator('#chat-section')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#load-progress')).toBeHidden();
  });

  test('success status shown after model loads', async ({ page }) => {
    await page.locator('#load-btn').click();
    await expect(page.locator('#chat-section')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#status-msg')).toBeVisible();
    await expect(page.locator('#status-msg')).toContainText('Model loaded successfully');
  });

  test('load button label changes to Reload Model after load', async ({ page }) => {
    await page.locator('#load-btn').click();
    await expect(page.locator('#chat-section')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#load-btn')).toContainText('Reload Model');
  });

  test('sending a message shows user bubble and assistant reply', async ({ page }) => {
    await page.locator('#load-btn').click();
    await expect(page.locator('#chat-section')).toBeVisible({ timeout: 5000 });

    await page.locator('#chat-input').fill('Hello!');
    await page.locator('#send-btn').click();

    // User bubble
    await expect(page.locator('.chat-bubble-user')).toBeVisible();
    await expect(page.locator('.chat-bubble-user')).toContainText('Hello!');

    // Assistant bubble with mock reply
    await expect(page.locator('.chat-bubble-assistant')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.chat-bubble-assistant')).toContainText('Hello world!');
  });

  test('pressing Enter sends a message', async ({ page }) => {
    await page.locator('#load-btn').click();
    await expect(page.locator('#chat-section')).toBeVisible({ timeout: 5000 });

    await page.locator('#chat-input').fill('Test enter');
    await page.locator('#chat-input').press('Enter');

    await expect(page.locator('.chat-bubble-user')).toContainText('Test enter');
  });

  test('pressing Shift+Enter does not send the message', async ({ page }) => {
    await page.locator('#load-btn').click();
    await expect(page.locator('#chat-section')).toBeVisible({ timeout: 5000 });

    await page.locator('#chat-input').fill('No send');
    await page.locator('#chat-input').press('Shift+Enter');

    await expect(page.locator('.chat-bubble-user')).toHaveCount(0);
  });

  test('clear button resets the conversation', async ({ page }) => {
    await page.locator('#load-btn').click();
    await expect(page.locator('#chat-section')).toBeVisible({ timeout: 5000 });

    await page.locator('#chat-input').fill('Hello!');
    await page.locator('#send-btn').click();
    await expect(page.locator('.chat-bubble-user')).toBeVisible();

    await page.locator('#clear-btn').click();
    await expect(page.locator('.chat-bubble-user')).toHaveCount(0);
    await expect(page.locator('#chat-placeholder')).toBeVisible();
  });

  test('chat input is cleared after sending', async ({ page }) => {
    await page.locator('#load-btn').click();
    await expect(page.locator('#chat-section')).toBeVisible({ timeout: 5000 });

    await page.locator('#chat-input').fill('Hello!');
    await page.locator('#send-btn').click();

    await expect(page.locator('#chat-input')).toHaveValue('');
  });

  test('model load failure shows error status', async ({ page }) => {
    // Override the mock to simulate a pipeline failure.
    await page.route('**/transformers.min.js', route =>
      route.fulfill({
        contentType: 'application/javascript; charset=utf-8',
        body: `
export const env = { allowLocalModels: false };
export class TextStreamer {}
export async function pipeline() { throw new Error('Network error'); }
`
      })
    );
    await page.goto('/tools/llm/');

    await page.locator('#load-btn').click();
    await expect(page.locator('#status-msg')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#status-msg')).toContainText('Failed to load model');
    await expect(page.locator('#status-msg')).toContainText('Network error');
    // Load button should be re-enabled after failure
    await expect(page.locator('#load-btn')).toBeEnabled();
  });
});
