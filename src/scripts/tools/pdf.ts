/**
 * PDF Password Tool — UI logic.
 * Communicates with pdf.worker.js for all qpdf operations.
 */

// ── DOM references ────────────────────────────────────────────────────────────

const dropZone = document.getElementById('drop-zone') as HTMLElement;
const fileInput = document.getElementById('file-input') as HTMLInputElement;
const fileName = document.getElementById('file-name') as HTMLElement;
const modeRemove = document.getElementById('mode-remove') as HTMLInputElement;
const modeAdd = document.getElementById('mode-add') as HTMLInputElement;
const removeSection = document.getElementById('remove-section') as HTMLElement;
const addSection = document.getElementById('add-section') as HTMLElement;
const decryptPass = document.getElementById('decrypt-pass') as HTMLInputElement;
const userPass = document.getElementById('user-pass') as HTMLInputElement;
const ownerPass = document.getElementById('owner-pass') as HTMLInputElement;
const processBtn = document.getElementById('process-btn') as HTMLButtonElement;
const statusMsg = document.getElementById('status-msg') as HTMLElement;
const resultSection = document.getElementById('result-section') as HTMLElement;
const downloadLink = document.getElementById('download-link') as HTMLAnchorElement;
const privacyBytes = document.getElementById('privacy-bytes') as HTMLElement;

// ── State ─────────────────────────────────────────────────────────────────────

let selectedFile: File | null = null;
let previousObjectUrl: string | null = null;

// ── Helpers ───────────────────────────────────────────────────────────────────

function showStatus(html: string, type: 'info' | 'danger' | 'success' | 'warning') {
  statusMsg.innerHTML = '<div class="alert alert-' + type + ' py-2 mb-0">' + html + '</div>';
  statusMsg.classList.remove('d-none');
}

function hideStatus() {
  statusMsg.classList.add('d-none');
}

function isPdfEncrypted(bytes: Uint8Array): boolean {
  const tail = bytes.length > 4096 ? bytes.slice(bytes.length - 4096) : bytes;
  const text = new TextDecoder('latin1').decode(tail);
  return /\/Encrypt\s+\d+\s+\d+\s+R/.test(text);
}

function isValidPdf(bytes: Uint8Array): boolean {
  if (bytes.length < 5) return false;
  const pdfSignature = new TextDecoder('latin1').decode(bytes.slice(0, 5));
  return pdfSignature.startsWith('%PDF-');
}

function revokePreviousUrl() {
  if (previousObjectUrl) {
    URL.revokeObjectURL(previousObjectUrl);
    previousObjectUrl = null;
  }
}

// ── Mode switching ────────────────────────────────────────────────────────────

function setMode(mode: 'remove' | 'add') {
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
modeAdd.addEventListener('change', function () { if (this.checked) setMode('add'); });

// ── Drag-and-drop / file picker ───────────────────────────────────────────────

dropZone.addEventListener('click', function () { fileInput.click(); });

dropZone.addEventListener('dragover', function (e) {
  e.preventDefault();
  dropZone.classList.add('border-primary');
});

dropZone.addEventListener('dragleave', function () {
  dropZone.classList.remove('border-primary');
});

dropZone.addEventListener('drop', function (e: DragEvent) {
  e.preventDefault();
  dropZone.classList.remove('border-primary');
  const f = (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) || null;
  if (f) handleFile(f);
});

fileInput.addEventListener('change', function () {
  const fi = this as HTMLInputElement;
  if (fi.files && fi.files[0]) handleFile(fi.files[0]);
});

function handleFile(file: File) {
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

  const reader = new FileReader();
  reader.onload = function (e: ProgressEvent<FileReader>) {
    const buf = (e.target && e.target.result) as ArrayBuffer | null;
    if (!buf) return;
    const bytes = new Uint8Array(buf);

    if (!isValidPdf(bytes)) {
      showStatus('<i class="fas fa-exclamation-circle me-2"></i>The selected file does not appear to be a valid PDF.', 'danger');
      selectedFile = null;
      fileName.classList.add('d-none');
      return;
    }

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

// ── Processing ───────────────────────────────────────────────────────────────

const workerUrl = String((document.getElementById('pdf-worker-url') as HTMLElement).dataset.url);

processBtn.addEventListener('click', function () {
  if (!selectedFile) return;

  const mode = modeRemove.checked ? 'remove' : 'add';

  if (mode === 'add') {
    let up = userPass.value;
    let op = ownerPass.value;
    if (!up && !op) {
      showStatus('<i class="fas fa-exclamation-circle me-2"></i>Please enter at least a User Password or Owner Password.', 'danger');
      return;
    }
    if (!op) op = up;
  }

  processBtn.disabled = true;
  showStatus('<i class="fas fa-spinner fa-spin me-2"></i>Loading qpdf — this may take a moment on first use…', 'info');

  const reader = new FileReader();
  reader.onload = function (e: ProgressEvent<FileReader>) {
    const buf = (e.target && e.target.result) as ArrayBuffer | null;
    if (!buf) return;
    const fileData = new Uint8Array(buf);
    const worker = new Worker(workerUrl);

    worker.onmessage = function (ev: MessageEvent) {
      worker.terminate();
      processBtn.disabled = false;

      if (!ev.data.success) {
        const msg = ev.data.error || 'An unknown error occurred.';
        showStatus('<i class="fas fa-times-circle me-2"></i>' + msg, 'danger');
        return;
      }

      revokePreviousUrl();
      const blob = new Blob([ev.data.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      previousObjectUrl = url;

      const baseName = selectedFile!.name.replace(/\.pdf$/i, '');
      const outName = baseName + (mode === 'remove' ? '-decrypted.pdf' : '-protected.pdf');

      downloadLink.href = url;
      downloadLink.download = outName;
      downloadLink.textContent = outName;

      resultSection.classList.remove('d-none');
      showStatus('<i class="fas fa-check-circle me-2"></i>Done! Your file is ready to download.', 'success');
    };

    worker.onerror = function (err: ErrorEvent) {
      worker.terminate();
      processBtn.disabled = false;
      showStatus('<i class="fas fa-times-circle me-2"></i>Worker error: ' + (err.message || 'unknown'), 'danger');
    };

    const msg: any = { file: fileData };
    if (mode === 'remove') {
      msg.type = 'decrypt';
      msg.password = decryptPass.value;
    } else {
      msg.type = 'encrypt';
      msg.userPass = userPass.value;
      msg.ownerPass = ownerPass.value || userPass.value;
    }

    showStatus('<i class="fas fa-spinner fa-spin me-2"></i>Processing…', 'info');
    worker.postMessage(msg);
  };

  reader.readAsArrayBuffer(selectedFile);
});

privacyBytes.textContent = '0 KB';
