export interface PaletteOptions {
  maxColors?: number;
  quantizationStep?: number;
  minAlpha?: number;
}

const DEFAULT_MAX_COLORS = 8;
const DEFAULT_QUANTIZATION_STEP = 24;
const DEFAULT_MIN_ALPHA = 125;

function clampToByte(value: number): number {
  return Math.max(0, Math.min(255, value));
}

function quantizeChannel(value: number, step: number): number {
  const safeStep = Math.max(1, Math.floor(step));
  return clampToByte(Math.round(value / safeStep) * safeStep);
}

function toHexChannel(value: number): string {
  return clampToByte(value).toString(16).padStart(2, '0');
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${toHexChannel(r)}${toHexChannel(g)}${toHexChannel(b)}`;
}

function luminance(r: number, g: number, b: number): number {
  return r * 0.2126 + g * 0.7152 + b * 0.0722;
}

export function extractProminentHexColors(
  pixels: Uint8ClampedArray | number[],
  options: PaletteOptions = {},
): string[] {
  if (pixels.length % 4 !== 0) {
    throw new Error('Pixel array length must be divisible by 4 (RGBA).');
  }

  const maxColors = Math.max(1, Math.floor(options.maxColors ?? DEFAULT_MAX_COLORS));
  const quantizationStep = Math.max(1, Math.floor(options.quantizationStep ?? DEFAULT_QUANTIZATION_STEP));
  const minAlpha = clampToByte(Math.floor(options.minAlpha ?? DEFAULT_MIN_ALPHA));
  const frequency = new Map<string, { count: number; r: number; g: number; b: number }>();

  for (let i = 0; i < pixels.length; i += 4) {
    const alpha = pixels[i + 3];
    if (alpha < minAlpha) continue;

    const r = quantizeChannel(pixels[i], quantizationStep);
    const g = quantizeChannel(pixels[i + 1], quantizationStep);
    const b = quantizeChannel(pixels[i + 2], quantizationStep);
    const key = `${r},${g},${b}`;
    const entry = frequency.get(key);

    if (entry) {
      entry.count += 1;
    } else {
      frequency.set(key, { count: 1, r, g, b });
    }
  }

  return Array.from(frequency.values())
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return luminance(b.r, b.g, b.b) - luminance(a.r, a.g, a.b);
    })
    .slice(0, maxColors)
    .map(({ r, g, b }) => rgbToHex(r, g, b));
}
