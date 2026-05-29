import { test } from 'node:test';
import assert from 'node:assert/strict';

import { extractProminentHexColors } from '../src/scripts/tools/color-palette.ts';

test('extractProminentHexColors: returns dominant colors in order', () => {
  const pixels = new Uint8ClampedArray([
    255, 0, 0, 255,
    255, 0, 0, 255,
    255, 0, 0, 255,
    0, 0, 255, 255,
    0, 0, 255, 255,
    0, 255, 0, 255,
  ]);

  const palette = extractProminentHexColors(pixels, { quantizationStep: 1, maxColors: 3 });
  assert.deepEqual(palette, ['#ff0000', '#0000ff', '#00ff00']);
});

test('extractProminentHexColors: ignores transparent pixels by default', () => {
  const pixels = new Uint8ClampedArray([
    255, 0, 0, 30,
    255, 0, 0, 30,
    0, 255, 0, 255,
  ]);

  const palette = extractProminentHexColors(pixels, { quantizationStep: 1 });
  assert.deepEqual(palette, ['#00ff00']);
});

test('extractProminentHexColors: applies maxColors limit', () => {
  const pixels = new Uint8ClampedArray([
    255, 0, 0, 255,
    0, 255, 0, 255,
    0, 0, 255, 255,
  ]);

  const palette = extractProminentHexColors(pixels, { quantizationStep: 1, maxColors: 2 });
  assert.equal(palette.length, 2);
});

test('extractProminentHexColors: groups close shades with quantization', () => {
  const pixels = new Uint8ClampedArray([
    12, 12, 12, 255,
    15, 14, 16, 255,
    240, 240, 240, 255,
  ]);

  const palette = extractProminentHexColors(pixels, { quantizationStep: 16, maxColors: 2 });
  assert.deepEqual(palette, ['#101010', '#f0f0f0']);
});

test('extractProminentHexColors: validates RGBA pixel shape', () => {
  assert.throws(() => extractProminentHexColors(Uint8ClampedArray.from([255, 0, 0])), /divisible by 4/);
});
