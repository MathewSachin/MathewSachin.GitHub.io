/**
 * PDF Password Tool — UI logic.
 * Communicates with pdf.worker.js for all qpdf operations.
 */

// ── DOM references ────────────────────────────────────────────────────────────

const dropZone        = document.getElementById('drop-zone');
const fileInput       = document.getElementById('file-input');
const fileName        = document.getElementById('file-name');
const modeRemove      = document.getElementById('mode-remove');
const modeAdd         = document.getElementById('mode-add');
const removeSection   = document.getElementById('remove-section');
const addSection      = document.getElementById('add-section');
const decryptPass     = document.getElementById('decrypt-pass');
const userPass        = document.getElementById('user-pass');
const ownerPass       = document.getElementById('owner-pass');
const processBtn      = document.getElementById('process-btn');
const statusMsg       = document.getElementById('status-msg');
const resultSection   = document.getElementById('result-section');
const downloadLink    = document.getElementById('download-link');
const privacyBytes    = document.getElementById('privacy-bytes');

// ── State ─────────────────────────────────────────────────────────────────────

let selectedFile = null;
let previousObjectUrl = null;

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Show a status message with the given Bootstrap alert type.
 * @param {string} html   - Inner HTML for the message.
 * @param {'info'|'danger'|'success'|'warning'} type
 */
function showStatus(html, type) {
  statusMsg.innerHTML = '<div class="alert alert-' + type + ' py-2 mb-0">' + html + '</div>';
  statusMsg.classList.remove('d-none');
}

function hideStatus() {
  statusMsg.classList.add('d-none');
}

/**
 * Detect whether a PDF byte array is encrypted by scanning for an
 * `/Encrypt` object reference in the trailer dictionary.
 * The trailer is near the end of the file, so only the last 4 KB is searched.
 * The pattern `/Encrypt N N R` matches an indirect object reference as
 * required by the PDF spec, avoiding false positives from embedded text.
 * @param {Uint8Array} bytes
 * @returns {boolean}
 */
function isPdfEncrypted(bytes) {
  var tail = bytes.length > 4096 ? bytes.slice(bytes.length - 4096) : bytes;
  var text = new TextDecoder('latin1').decode(tail);
  return /\/Encrypt\s+\d+\s+\d+\s+R/.test(text);
}

/**
 * Validate that the first bytes match the PDF magic bytes (`%PDF-`).
 * @param {Uint8Array} bytes
 * @returns {boolean}
 */
function isValidPdf(bytes) {
  if (bytes.length < 5) return false;
  var pdfSignature = new TextDecoder('latin1').decode(bytes.slice(0, 5));
  return pdfSignature.startsWith('%PDF-');
}

/** Revoke any previously created object URL to prevent memory leaks. */
function revokePreviousUrl() {
  if (previousObjectUrl) {
    URL.revokeObjectURL(previousObjectUrl);
    previousObjectUrl = null;
  }
}

// ── Mode switching ────────────────────────────────────────────────────────────

function setMode(mode) {
  if (mode === 'remove') {
    removeSection.classList.remove('d-none');
    addSection.classList.add('d-none');
    modeRemove.checked = true;
  } else {
    addSection.classList.remove('d-none');
    removeSection.classList.add('d-none');
    modeAdd.checked = true;
  }
}

modeRemove.addEventListener('change', function () { if (this.checked) setMode('remove'); });
modeAdd.addEventListener('change',    function () { if (this.checked) setMode('add'); });

// ── Drag-and-drop / file picker ───────────────────────────────────────────────

dropZone.addEventListener('click', function () { fileInput.click(); });

dropZone.addEventListener('dragover', function (e) {
  e.preventDefault();
  dropZone.classList.add('border-primary');
});

dropZone.addEventListener('dragleave', function () {
  dropZone.classList.remove('border-primary');
});

dropZone.addEventListener('drop', function (e) {
  e.preventDefault();
  dropZone.classList.remove('border-primary');
  var f = e.dataTransfer.files[0];
  if (f) handleFile(f);
});

fileInput.addEventListener('change', function () {
  if (this.files[0]) handleFile(this.files[0]);
});

/**
 * Handle a file selected by the user (via drop or picker).
 * Reads the file, validates it, detects encryption, and updates the UI.
 * @param {File} file
 */
function handleFile(file) {
  if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
    showStatus('<i class="fas fa-exclamation-circle me-2"></i>Please select a PDF file.', 'danger');
    return;
  }

  selectedFile = file;
  revokePreviousUrl();
  resultSection.classList.add('d-none');
  hideStatus();

  fileName.textContent = file.name;
  fileName.classList.remove('d-none');

  var reader = new FileReader();
  reader.onload = function (e) {
    var bytes = new Uint8Array(e.target.result);

    if (!isValidPdf(bytes)) {
      showStatus('<i class="fas fa-exclamation-circle me-2"></i>The selected file does not appear to be a valid PDF.', 'danger');
      selectedFile = null;
      fileName.classList.add('d-none');
      return;
    }

    // Auto-select mode based on encryption status.
    if (isPdfEncrypted(bytes)) {
      setMode('remove');
      showStatus('<i class="fas fa-lock me-2"></i>Encrypted PDF detected — enter the current password to remove it.', 'info');
    } else {
      setMode('add');
      showStatus('<i class="fas fa-lock-open me-2"></i>No encryption detected — you can add a password below.', 'info');
    }

    processBtn.disabled = false;
  };
  reader.readAsArrayBuffer(file);
}

// ── Processing ────────────────────────────────────────────────────────────────

/** Resolve the URL for the worker script, honouring Jekyll's baseurl. */
var workerUrl = document.getElementById('pdf-worker-url').dataset.url;

/**
 * Process the selected PDF via the Web Worker.
 */
processBtn.addEventListener('click', function () {
  if (!selectedFile) return;

  var mode = modeRemove.checked ? 'remove' : 'add';

  if (mode === 'add') {
    var up = userPass.value;
    var op = ownerPass.value;
    if (!up && !op) {
      showStatus('<i class="fas fa-exclamation-circle me-2"></i>Please enter at least a User Password or Owner Password.', 'danger');
      return;
    }
    if (!op) op = up; // default owner password to user password
  }

  processBtn.disabled = true;
  showStatus('<i class="fas fa-spinner fa-spin me-2"></i>Loading qpdf — this may take a moment on first use…', 'info');

  var reader = new FileReader();
  reader.onload = function (e) {
    var fileData = new Uint8Array(e.target.result);
    var worker = new Worker(workerUrl);

    worker.onmessage = function (ev) {
      worker.terminate();
      processBtn.disabled = false;

      if (!ev.data.success) {
        var msg = ev.data.error || 'An unknown error occurred.';
        showStatus('<i class="fas fa-times-circle me-2"></i>' + msg, 'danger');
        return;
      }

      // Build a download link without memory leaks.
      revokePreviousUrl();
      var blob = new Blob([ev.data.data], { type: 'application/pdf' });
      var url  = URL.createObjectURL(blob);
      previousObjectUrl = url;

      var baseName = selectedFile.name.replace(/\.pdf$/i, '');
      var outName  = baseName + (mode === 'remove' ? '-decrypted.pdf' : '-protected.pdf');

      downloadLink.href     = url;
      downloadLink.download = outName;
      downloadLink.textContent = outName;

      resultSection.classList.remove('d-none');
      showStatus('<i class="fas fa-check-circle me-2"></i>Done! Your file is ready to download.', 'success');
    };

    worker.onerror = function (err) {
      worker.terminate();
      processBtn.disabled = false;
      showStatus('<i class="fas fa-times-circle me-2"></i>Worker error: ' + (err.message || 'unknown'), 'danger');
    };

    var msg = { file: fileData };
    if (mode === 'remove') {
      msg.type     = 'decrypt';
      msg.password = decryptPass.value;
    } else {
      msg.type      = 'encrypt';
      msg.userPass  = userPass.value;
      msg.ownerPass = ownerPass.value || userPass.value;
    }

    // Show progress once the file is being processed
    showStatus('<i class="fas fa-spinner fa-spin me-2"></i>Processing…', 'info');
    worker.postMessage(msg);
  };

  reader.readAsArrayBuffer(selectedFile);
});

// ── Privacy badge ─────────────────────────────────────────────────────────────

// The privacy indicator is always "0 KB uploaded to server" because all
// processing is done in-browser. Update the badge to confirm.
privacyBytes.textContent = '0 KB';
