import { test } from 'node:test';
import assert from 'node:assert/strict';

import { generateQrDataUrl, qrDownloadFilename } from '../src/scripts/tools/qr.ts';

test('generateQrDataUrl: returns PNG data URL', async () => {
  const dataUrl = await generateQrDataUrl('hello world');
  assert.match(dataUrl, /^data:image\/png;base64,/);
});

test('generateQrDataUrl: supports unicode text', async () => {
  const dataUrl = await generateQrDataUrl('Hello 😀');
  assert.match(dataUrl, /^data:image\/png;base64,/);
});

test('generateQrDataUrl: throws for empty input', async () => {
  await assert.rejects(() => generateQrDataUrl('   '), /Please enter text or a URL/);
});

test('qrDownloadFilename: creates a safe slug-based filename', () => {
  assert.equal(qrDownloadFilename('https://example.com/Hello World'), 'qr-example-com-hello-world.png');
});

test('qrDownloadFilename: falls back for empty values', () => {
  assert.equal(qrDownloadFilename('   '), 'qr-code.png');
});
