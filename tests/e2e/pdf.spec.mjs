import { test, expect } from '@playwright/test';

// Minimal valid unencrypted PDF (PDF 1.4, single empty page)
const PLAIN_PDF_BYTES = Buffer.from(
  '%PDF-1.4\n' +
  '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n' +
  '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n' +
  '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n' +
  'xref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n' +
  'trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n190\n%%EOF\n'
);

test.describe('PDF Password Tool', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/pdf/');
  });

  test('page loads with correct title and drop zone', async ({ page }) => {
    await expect(page).toHaveTitle(/PDF Password Tool/i);
    await expect(page.locator('#drop-zone')).toBeVisible();
  });

  test('privacy badge is visible and shows 0 KB', async ({ page }) => {
    await expect(page.locator('#privacy-bytes')).toHaveText('0 KB');
  });

  test('process button is disabled before a file is selected', async ({ page }) => {
    await expect(page.locator('#process-btn')).toBeDisabled();
  });

  test('Add Password mode is selected by default', async ({ page }) => {
    await expect(page.locator('#mode-add')).toBeChecked();
    await expect(page.locator('#add-section')).toBeVisible();
    await expect(page.locator('#remove-section')).toBeHidden();
  });

  test('switching to Remove Password mode shows the decrypt password field', async ({ page }) => {
    await page.locator('#mode-remove').check();
    await expect(page.locator('#remove-section')).toBeVisible();
    await expect(page.locator('#add-section')).toBeHidden();
  });

  test('uploading a plain PDF enables the process button and selects Add Password mode', async ({ page }) => {
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.locator('#drop-zone').click(),
    ]);
    await fileChooser.setFiles({
      name: 'test.pdf',
      mimeType: 'application/pdf',
      buffer: PLAIN_PDF_BYTES,
    });

    await expect(page.locator('#process-btn')).toBeEnabled({ timeout: 5000 });
    await expect(page.locator('#mode-add')).toBeChecked();
    await expect(page.locator('#file-name')).toBeVisible();
  });

  test('shows error when a non-PDF file is uploaded', async ({ page }) => {
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.locator('#drop-zone').click(),
    ]);
    await fileChooser.setFiles({
      name: 'test.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('hello'),
    });

    await expect(page.locator('#status-msg')).toBeVisible();
    await expect(page.locator('#status-msg')).toContainText('PDF');
  });

  test('shows error for invalid (non-PDF) file content', async ({ page }) => {
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.locator('#drop-zone').click(),
    ]);
    await fileChooser.setFiles({
      name: 'fake.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('this is not a pdf'),
    });

    await expect(page.locator('#status-msg')).toBeVisible();
    await expect(page.locator('#status-msg')).toContainText('valid PDF');
  });

  test('both user and owner password fields are visible in Add mode', async ({ page }) => {
    await expect(page.locator('#user-pass')).toBeVisible();
    await expect(page.locator('#owner-pass')).toBeVisible();
  });

  test('how it works section is present', async ({ page }) => {
    await expect(page.locator('text=How It Works')).toBeVisible();
    await expect(page.locator('text=WebAssembly')).toBeVisible();
  });
});
