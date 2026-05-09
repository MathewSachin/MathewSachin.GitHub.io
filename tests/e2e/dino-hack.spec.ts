import { test, expect, type Page } from '@playwright/test';
import { gotoAndWaitForReady } from './navigation.ts';

const DINO_HACK_URL = '/blog/2016/11/05/chrome-dino-hack.html';
const TRIVIA_SELECTION_RETRY_TIMEOUT_MS = 7000;

test.describe('Chrome Dino Hack post', () => {
  test.beforeEach(async ({ page }) => {
    await gotoAndWaitForReady(page, DINO_HACK_URL, page.locator('#speed-input'));
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
    const frameHandle = frameElement.contentFrame();
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
  
  test('ground reset button restores default value', async ({ page }) => {
    await page.locator('#ground-input').fill('100');
    await page.locator('#ground-reset').click();
    await expect(page.locator('#ground-input')).toHaveValue('0');
  });

  test('ground copy button copies correctly', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await page.locator('#ground-input').fill('65');
    await page.locator('#btn-ground-clip').click();

    // Verify the clipboard contains the expected code snippet
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toBe('(Runner.instance_ || Runner.getInstance()).tRex.groundYPos = 93 - 65');
  });
});

// ── Trivia Challenge ─────────────────────────────────────────────────────────

// Answers for the 5 Chrome Dino trivia questions in order.
// Each entry is [correctOption, wrongOption] (text of the button).
const Q_CORRECT = ['6', 'Space', '450', 'Runner.prototype.gameOver', '93'];
const Q_WRONG   = ['3', 'Enter', '100', 'Runner.prototype.start',    '50'];

/** Select an option and click "Submit Answer" inside the trivia component. */
async function submitAnswer(page: Page, optionText: string) {
  const trivia = page.locator('.trivia-challenge');
  const option = trivia.getByRole('button', { name: optionText, exact: true });
  const submit = trivia.getByRole('button', { name: 'Submit Answer' });

  await expect(async () => {
    await option.click();
    await expect(option).toHaveClass(/btn-primary/);
  }).toPass({ timeout: TRIVIA_SELECTION_RETRY_TIMEOUT_MS });
  await submit.click();
}

/** Answer one question then advance (Next Question / See Results). */
async function answerAndAdvance(page: Page, optionText: string) {
  await submitAnswer(page, optionText);
  const trivia = page.locator('.trivia-challenge');
  const next = trivia.getByRole('button', { name: /Next Question|See Results/ });
  await next.click();
}

/** Answer all 5 questions, choosing correct or wrong answers based on `allCorrect`. */
async function completeQuiz(page: Page, allCorrect = true) {
  for (let i = 0; i < Q_CORRECT.length; i++) {
    const option = allCorrect ? Q_CORRECT[i] : Q_WRONG[i];
    if (i < Q_CORRECT.length - 1) {
      await answerAndAdvance(page, option);
    } else {
      await submitAnswer(page, option);
      await page.locator('.trivia-challenge').getByRole('button', { name: 'See Results' }).click();
    }
  }
}

test.describe('Trivia Challenge', () => {
  const STORAGE_KEY = 'chrome-dino-trivia-highscore';

  test.beforeEach(async ({ page }) => {
    // Clear any stored high score before each test.
    await page.addInitScript((key) => localStorage.removeItem(key), STORAGE_KEY);
    await gotoAndWaitForReady(page, DINO_HACK_URL, page.locator('.trivia-challenge'));
  });

  // ── Initial render ──────────────────────────────────────────────────────────

  test('trivia section renders with first question', async ({ page }) => {
    const trivia = page.locator('.trivia-challenge');
    await expect(trivia).toBeVisible();
    await expect(trivia.locator('.badge.bg-secondary')).toHaveText('Question 1 / 5');
    await expect(trivia).toContainText('What is the default starting speed');
  });

  test('submit button is disabled until an option is selected', async ({ page }) => {
    const trivia = page.locator('.trivia-challenge');
    const submit = trivia.getByRole('button', { name: 'Submit Answer' });
    await expect(submit).toBeDisabled();
    await trivia.getByRole('button', { name: '6', exact: true }).click();
    await expect(submit).toBeEnabled();
  });

  // ── Feedback after submission ───────────────────────────────────────────────

  test('correct answer shows success alert', async ({ page }) => {
    await submitAnswer(page, Q_CORRECT[0]);
    const trivia = page.locator('.trivia-challenge');
    await expect(trivia.locator('.alert-success')).toBeVisible();
    await expect(trivia.locator('.alert-success')).toContainText('Correct');
  });

  test('wrong answer shows danger alert with the correct option', async ({ page }) => {
    await submitAnswer(page, Q_WRONG[0]);
    const trivia = page.locator('.trivia-challenge');
    await expect(trivia.locator('.alert-danger')).toBeVisible();
    await expect(trivia.locator('.alert-danger')).toContainText(Q_CORRECT[0]);
  });

  test('correct option button turns green after submission', async ({ page }) => {
    await submitAnswer(page, Q_CORRECT[0]);
    const trivia = page.locator('.trivia-challenge');
    const correctBtn = trivia.getByRole('button', { name: Q_CORRECT[0], exact: true });
    await expect(correctBtn).toHaveClass(/btn-success/);
  });

  test('wrong option button turns red after submission', async ({ page }) => {
    await submitAnswer(page, Q_WRONG[0]);
    const trivia = page.locator('.trivia-challenge');
    const wrongBtn = trivia.getByRole('button', { name: Q_WRONG[0], exact: true });
    await expect(wrongBtn).toHaveClass(/btn-danger/);
  });

  // ── Navigation ──────────────────────────────────────────────────────────────

  test('advancing to the next question increments the counter', async ({ page }) => {
    await answerAndAdvance(page, Q_CORRECT[0]);
    const trivia = page.locator('.trivia-challenge');
    await expect(trivia.locator('.badge.bg-secondary')).toHaveText('Question 2 / 5');
    await expect(trivia).toContainText('Which keyboard key starts');
  });

  test('last question shows "See Results" instead of "Next Question"', async ({ page }) => {
    const trivia = page.locator('.trivia-challenge');
    for (let i = 0; i < Q_CORRECT.length - 1; i++) {
      await answerAndAdvance(page, Q_CORRECT[i]);
    }
    await submitAnswer(page, Q_CORRECT[Q_CORRECT.length - 1]);
    await expect(trivia.getByRole('button', { name: 'See Results' })).toBeVisible();
    await expect(trivia.getByRole('button', { name: /Next Question/ })).not.toBeAttached();
  });

  // ── Results screen ──────────────────────────────────────────────────────────

  test('results screen appears with score /100 after finishing the quiz', async ({ page }) => {
    await completeQuiz(page, false);
    const trivia = page.locator('.trivia-challenge');
    await expect(trivia).toContainText('/100');
    await expect(trivia.getByRole('button', { name: 'Try Again' })).toBeVisible();
  });

  test('all correct answers yields a score of 100', async ({ page }) => {
    await completeQuiz(page, true);
    const trivia = page.locator('.trivia-challenge');
    // Score display: "100/100"
    await expect(trivia.locator('.display-4')).toContainText('100');
    await expect(trivia).toContainText('5 out of 5');
  });

  test('all wrong answers yields a score of 0', async ({ page }) => {
    await completeQuiz(page, false);
    const trivia = page.locator('.trivia-challenge');
    await expect(trivia.locator('.display-4')).toContainText('0');
    await expect(trivia).toContainText('0 out of 5');
  });

  test('"Try Again" resets the quiz back to question 1', async ({ page }) => {
    await completeQuiz(page, true);
    const trivia = page.locator('.trivia-challenge');
    await trivia.getByRole('button', { name: 'Try Again' }).click();
    await expect(trivia.locator('.badge.bg-secondary')).toHaveText('Question 1 / 5');
    await expect(trivia).toContainText('What is the default starting speed');
  });

  // ── High score persistence ──────────────────────────────────────────────────

  test('high score is saved to localStorage after finishing', async ({ page }) => {
    await completeQuiz(page, true);
    const stored = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
    expect(stored).toBe('100');
  });

  test('"New high score" banner is shown when a new best is achieved', async ({ page }) => {
    await completeQuiz(page, true);
    const trivia = page.locator('.trivia-challenge');
    await expect(trivia).toContainText('New high score');
  });

  test('existing high score is displayed in the quiz header', async ({ page }) => {
    // Pre-seed a high score of 60. Use addInitScript so the value survives the
    // reload (a plain evaluate would be wiped by the beforeEach initScript on
    // the next navigation).
    await page.addInitScript(([key, val]) => localStorage.setItem(key, val), [STORAGE_KEY, '60'] as [string, string]);
    await page.reload();
    const trivia = page.locator('.trivia-challenge');
    await expect(trivia).toContainText('Best:');
    await expect(trivia).toContainText('60');
  });

  test('high score is not updated when a lower score is achieved', async ({ page }) => {
    // Pre-seed a perfect high score.
    await page.addInitScript(([key, val]) => localStorage.setItem(key, val), [STORAGE_KEY, '100'] as [string, string]);
    await page.reload();
    await completeQuiz(page, false); // score will be 0
    const stored = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
    expect(stored).toBe('100');
  });

  test('existing high score shown on results screen when not beaten', async ({ page }) => {
    await page.addInitScript(([key, val]) => localStorage.setItem(key, val), [STORAGE_KEY, '100'] as [string, string]);
    await page.reload();
    await completeQuiz(page, false); // score 0, does not beat 100
    const trivia = page.locator('.trivia-challenge');
    await expect(trivia).toContainText('Your best score:');
    await expect(trivia).toContainText('100');
  });
});
