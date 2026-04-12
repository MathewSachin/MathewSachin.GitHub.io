/**
 * PDF Worker — handles all qpdf-wasm operations off the main thread.
 * Receives messages with shape:
 *   { type: 'decrypt', file: Uint8Array, password: string }
 *   { type: 'encrypt', file: Uint8Array, userPass: string, ownerPass: string }
 * Responds with:
 *   { success: true,  data: Uint8Array }
 *   { success: false, error: string }
 */

const QPDF_JS  = 'https://unpkg.com/@neslinesli93/qpdf-wasm@0.3.0/dist/qpdf.js';
const QPDF_WASM = 'https://unpkg.com/@neslinesli93/qpdf-wasm@0.3.0/dist/qpdf.wasm';

/** Lazily loaded factory function from qpdf.js. */
let qpdfFactory = null;

/**
 * Load the qpdf-wasm factory function once via importScripts.
 * @returns {Function} The Emscripten module factory.
 */
function loadFactory() {
  if (qpdfFactory) return qpdfFactory;
  importScripts(QPDF_JS);
  // After importScripts, the global `Module` is the Emscripten factory function.
  qpdfFactory = self.Module;
  return qpdfFactory;
}

/**
 * Instantiate a fresh qpdf Emscripten module and run qpdf with the given args.
 * A fresh instance is created per operation so that callMain can be called
 * cleanly without Emscripten's internal exit-state interfering.
 *
 * @param {string[]} args      - Full qpdf CLI argument list (no binary name).
 * @param {Uint8Array} inputData - Raw bytes of the input PDF.
 * @returns {Promise<Uint8Array>} Raw bytes of the output PDF.
 */
async function runQpdf(args, inputData) {
  const factory = loadFactory();

  const stderrLines = [];

  const q = await factory({
    locateFile: () => QPDF_WASM,
    printErr: (msg) => stderrLines.push(msg),
    // Suppress stdout noise from qpdf
    print: () => {},
  });

  const INPUT  = '/input.pdf';
  const OUTPUT = '/output.pdf';

  q.FS.writeFile(INPUT, inputData);

  try {
    q.callMain(args);
  } catch (e) {
    // Emscripten throws ExitStatus on process.exit(); code 0 is success.
    if (e && e.name === 'ExitStatus' && e.status !== 0) {
      const detail = stderrLines.join(' ').trim();
      if (detail.toLowerCase().includes('invalid password') ||
          detail.toLowerCase().includes('password')) {
        throw new Error('Wrong password — please check the password and try again.');
      }
      throw new Error(detail || 'qpdf exited with code ' + e.status);
    }
    // ExitStatus(0) means success — fall through.
    if (e && e.name !== 'ExitStatus') throw e;
  }

  // Verify output was produced.
  let outputData;
  try {
    outputData = q.FS.readFile(OUTPUT);
  } catch (_) {
    const detail = stderrLines.join(' ').trim();
    throw new Error(detail || 'qpdf did not produce an output file.');
  }

  // Clean up virtual FS to free memory.
  try { q.FS.unlink(INPUT);  } catch (_) {}
  try { q.FS.unlink(OUTPUT); } catch (_) {}

  return outputData;
}

self.onmessage = async function (e) {
  const { type, file, password, userPass, ownerPass } = e.data;

  try {
    let args;

    if (type === 'decrypt') {
      // qpdf --password=PASS --decrypt input.pdf output.pdf
      args = ['--password=' + password, '--decrypt', '/input.pdf', '/output.pdf'];
    } else if (type === 'encrypt') {
      // qpdf --encrypt USER OWNER 256 -- input.pdf output.pdf
      args = ['--encrypt', userPass, ownerPass, '256', '--', '/input.pdf', '/output.pdf'];
    } else {
      throw new Error('Unknown operation type: ' + type);
    }

    const outputData = await runQpdf(args, file);
    self.postMessage({ success: true, data: outputData });
  } catch (err) {
    self.postMessage({ success: false, error: err.message || String(err) });
  }
};
