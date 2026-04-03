/**
 * Render a pintora diagram to SVG.
 *
 * Reads pintora diagram code from stdin, renders it to SVG using
 * @pintora/standalone with a JSDOM environment, and writes the SVG to stdout.
 *
 * Run via: node scripts/render-pintora.mjs <<< "activityDiagram ..."
 */

import { JSDOM } from 'jsdom';

// Set up a minimal DOM environment (SVG renderer only — no canvas required)
const dom = new JSDOM('<!DOCTYPE html><body></body>');
const { window } = dom;
const { document } = window;

// Mock the canvas 2D context so pintora can measure text without the native
// canvas module (which requires Cairo/system libraries not available in CI).
window.HTMLCanvasElement.prototype.getContext = function (type) {
  if (type === '2d') {
    return {
      measureText: (text) => ({ width: text.length * 6 }),
      font: '',
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      save() {},
      restore() {},
      beginPath() {},
      fill() {},
      stroke() {},
      fillText() {},
      strokeText() {},
      drawImage() {},
    };
  }
  return null;
};

global.window = window;
global.document = document;

// Import pintora after globals are available
const { pintoraStandalone } = await import('@pintora/standalone');

// Read pintora code from stdin
let code = '';
process.stdin.setEncoding('utf-8');
process.stdin.on('data', chunk => { code += chunk; });
process.stdin.on('end', async () => {
  code = code.trim();

  if (!code) {
    process.exit(0);
  }

  const container = document.createElement('div');

  try {
    const svg = await new Promise((resolve, reject) => {
      pintoraStandalone.renderTo(code, {
        container,
        renderer: 'svg',
        onRender(renderer) {
          const rootElement = renderer.getRootElement();
          rootElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
          resolve(rootElement.outerHTML);
        },
        onError(err) {
          reject(err);
        },
      });
    });

    process.stdout.write(svg);
  } catch (err) {
    process.stderr.write(`Pintora render error: ${err.message}\n${err.stack}\n`);
    process.exit(1);
  }
});
