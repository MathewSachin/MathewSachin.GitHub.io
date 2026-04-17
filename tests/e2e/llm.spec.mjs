import { test, expect } from '@playwright/test';

// Fake ES module returned in place of the real @huggingface/transformers bundle.
// This avoids any network download of multi-hundred-MB model weights while still
// exercising every code path in llm.js.
//
// Strategy: intercept the llm.js response and swap its transformers import URL
// for a local test URL that we serve ourselves.
const MOCK_URL = '/test-mock/transformers.js';

const MOCK_TRANSFORMERS_GOOD = `
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

const MOCK_TRANSFORMERS_FAIL = `
export const env = { allowLocalModels: false };
export class TextStreamer {}
export async function pipeline() { throw new Error('Network error'); }
`;

/**
 * Register the two routes needed for every test:
 * 1. Serve our local mock module at MOCK_URL.
 * 2. Intercept llm.js and replace its transformers import URL with MOCK_URL.
 */
async function setupRoutes(page, mockBody = MOCK_TRANSFORMERS_GOOD) {
  await page.route('**/test-mock/transformers.js', route =>
    route.fulfill({ contentType: 'application/javascript; charset=utf-8', body: mockBody })
  );

  await page.route(/.*(?:\/tools\/llm\/llm\.js|\/src\/scripts\/tools\/llm\.js)(?:\?.*)?$/, async route => {
    const response = await route.fetch();
    const original = await response.text();
    // Replace the transformers import URL (however it is formatted) with our local URL.
    const modified = original
      .replace(
        /from\s+['"]@huggingface\/transformers['"]/,
        `from '${MOCK_URL}'`
      )
      .replace(
        /from\s+['"][^'"]*huggingface[^'"]*transformers[^'"]*['"]/,
        `from '${MOCK_URL}'`
      );
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript; charset=utf-8',
      body: modified,
    });
  });
}

test.describe('Local LLM Chat tool', () => {
  test.beforeEach(async ({ page }) => {
    await setupRoutes(page);
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
    // Re-register routes with the failing mock so the override is explicit and
    // order-independent.  setupRoutes adds routes in reverse-precedence order,
    // but here we want MOCK_TRANSFORMERS_FAIL and a fresh navigation so that
    // the module is re-evaluated with the throwing pipeline.
    await setupRoutes(page, MOCK_TRANSFORMERS_FAIL);
    await page.goto('/tools/llm/');

    await page.locator('#load-btn').click();
    await expect(page.locator('#status-msg')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#status-msg')).toContainText('Failed to load model');
    await expect(page.locator('#status-msg')).toContainText('Network error');
    // Load button should be re-enabled after failure
    await expect(page.locator('#load-btn')).toBeEnabled();
  });
});
